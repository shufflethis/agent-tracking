import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { addSite, closeDb, db, ensureAccount, recordEvents } from "./db";
import { outcomeSummary, mintSiteWriteToken, parseServerOutcome, recordServerOutcome, recordServerToolCall, revokeSiteWriteToken, validSiteWriteToken } from "./server-ingest";
import { accountForToken } from "./api-token";
import { TrackingServerClient } from "../../examples/inquiry-app/tracking-client";
import { createInquiry } from "../../examples/inquiry-app/example";
import { ingestServerRequest } from "./server-route";

const NOW = Date.UTC(2026, 8, 25, 12);
const taskId = "task_1234567890123456";
const invocationId = "invocation_1234567890";
const receiptId = "receipt_1234567890123";

describe("authenticated server receipts", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:"; closeDb();
    ensureAccount("a@x.com", NOW); ensureAccount("b@x.com", NOW);
    addSite("a.example", "a@x.com", NOW); addSite("b.example", "b@x.com", NOW);
  });
  after(() => { closeDb(); delete process.env.TRACKING_DB; });

  it("binds revocable credentials to site and purpose", () => {
    const token = mintSiteWriteToken("a.example", "a@x.com", "outcome", NOW)!;
    assert.equal(validSiteWriteToken("a.example", "outcome", token), true);
    assert.equal(validSiteWriteToken("b.example", "outcome", token), false);
    assert.equal(validSiteWriteToken("a.example", "tool_telemetry", token), false);
    assert.equal(validSiteWriteToken("a.example", "outcome", "wmt_read_token"), false);
    assert.equal(accountForToken(token), null);
    assert.equal(mintSiteWriteToken("a.example", "b@x.com", "outcome"), null);
    revokeSiteWriteToken("a.example", "a@x.com", "outcome");
    assert.equal(validSiteWriteToken("a.example", "outcome", token), false);
  });

  it("enforces credentials at the HTTP boundary", async () => {
    const token = mintSiteWriteToken("a.example", "a@x.com", "outcome", NOW)!;
    const payload = { receiptId: "receipt_http_12345678", kind: "inquiry_created", status: "confirmed", occurredAt: Date.now() };
    const send = (domain: string, bearer: string) => ingestServerRequest(new Request(`http://localhost/api/outcomes/${domain}`, {
      method: "POST", headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" }, body: JSON.stringify(payload),
    }), Promise.resolve({ domain }), "outcome");
    assert.equal((await send("b.example", token)).status, 401);
    assert.equal((await send("a.example", "wmt_read_only_12345678")).status, 401);
    assert.equal((await send("a.example", token)).status, 201);
    assert.equal((await send("a.example", token)).status, 200);
    revokeSiteWriteToken("a.example", "a@x.com", "outcome");
    assert.equal((await send("a.example", token)).status, 401);
  });

  it("rejects contact/order fields and deduplicates stable receipts", () => {
    assert.equal(parseServerOutcome({ receiptId, kind: "inquiry_created", status: "confirmed", occurredAt: NOW, email: "a@b.com" }, NOW), null);
    const input = { receiptId, kind: "inquiry_created" as const, status: "confirmed" as const, occurredAt: NOW, taskId, invocationId };
    assert.equal(recordServerOutcome("a.example", input, NOW), "created");
    assert.equal(recordServerOutcome("a.example", input, NOW + 1), "duplicate");
    assert.equal(recordServerOutcome("a.example", { ...input, status: "failed" }, NOW + 2), "conflict");
    assert.equal(recordServerOutcome("a.example", { ...input, receiptId: "receipt_2234567890123" }, NOW + 3), "created");
    assert.equal(outcomeSummary("a.example", 1, NOW + 4).confirmed, 3);
    assert.equal(outcomeSummary("b.example", 1, NOW + 4).confirmed, 0);
  });

  it("keeps a browser fake separate, reconciles out of order and site-scoped", () => {
    const row = () => db().prepare("select actor_evidence as actor, observed_event_id as observed, server_invocation_id as server from server_outcomes where domain='a.example' and receipt_id=?").get(receiptId) as { actor: string; observed: number | null; server: string | null };
    assert.equal(row().actor, "unknown");
    assert.equal(row().observed, null);
    assert.equal(row().server, null);
    const event = { kind: "goal_attempt", name: "inquiry", path: "/contact", source: null, session: "test", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false, taskId, invocationId, transport: "browser" as const };
    recordEvents("b.example", "b@x.com", [event], NOW);
    assert.equal(row().observed, null);
    recordEvents("a.example", "a@x.com", [event], NOW);
    assert.equal(row().actor, "unknown");
    assert.ok(row().observed);
    recordServerToolCall("b.example", { invocationId, taskId, occurredAt: NOW, toolName: "create_inquiry", technicalOutcome: "completed", actorKind: "agent" }, NOW);
    assert.equal(row().actor, "unknown");
    recordServerToolCall("a.example", { invocationId, taskId, occurredAt: NOW, toolName: "create_inquiry", technicalOutcome: "completed", actorKind: "agent" }, NOW);
    assert.equal(row().actor, "site_server_reported_agent");
    assert.equal(row().server, invocationId);
  });

  it("runs the local inquiry adapter after a successful local save", async () => {
    const originalFetch = globalThis.fetch;
    const saved: string[] = [];
    const sent: unknown[] = [];
    globalThis.fetch = (async (_url, init) => {
      const payload = JSON.parse(String(init?.body)); sent.push(payload);
      assert.ok(saved.includes(payload.receiptId));
      const parsed = parseServerOutcome(payload, Date.now());
      assert.ok(parsed);
      return Response.json({ ok: true, result: recordServerOutcome("a.example", parsed) }, { status: 201 });
    }) as typeof fetch;
    try {
      const client = new TrackingServerClient("http://localhost:3000", "a.example", "atw_test");
      const id = await createInquiry({}, async (receipt) => { saved.push(receipt); }, client);
      assert.equal(sent.length, 1);
      assert.equal(outcomeSummary("a.example", 1).confirmed, 2);
      assert.ok(saved.includes(id));
    } finally { globalThis.fetch = originalFetch; }
  });
});
