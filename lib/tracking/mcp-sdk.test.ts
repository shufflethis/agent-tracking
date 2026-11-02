import assert from "node:assert/strict";
import { test } from "node:test";
import { MCPTracking } from "../../sdk/mcp";
import { addSite, closeDb, db, ensureAccount } from "./db";
import { mcpToolBreakdown, outcomeSummary, parseServerOutcome, parseServerToolCall, recordServerOutcome, recordServerToolCall } from "./server-ingest";

test("MCP wrapper preserves failures, handles isError and never sends sensitive payloads", async () => {
  const original = globalThis.fetch;
  const payloads: Record<string, unknown>[] = [];
  globalThis.fetch = (async (_url, init) => { payloads.push(JSON.parse(String(init?.body))); return Response.json({ ok: true }); }) as typeof fetch;
  try {
    const client = new MCPTracking({ origin: "https://tracking.example", domain: "a.example", toolToken: "secret", environment: "test", pluginVersion: "1.2", correlationSecret: "x".repeat(32) });
    const wrapped = client.wrap("quote", async (_args: { email: string }, _extra: { _meta: Record<string, unknown> }) => ({ isError: true, content: "private response" }));
    const extra = { _meta: { "openai/session": "raw-conversation", "openai/subject": "raw-user" } };
    assert.equal((await wrapped({ email: "private@example.com" }, extra)).isError, true);
    await wrapped({ email: "private@example.com" }, extra);
    assert.equal(payloads[0].technicalOutcome, "failed");
    assert.equal(payloads[0].errorClass, "ToolError");
    assert.equal(payloads[0].taskId, payloads[1].taskId);
    assert.notEqual(payloads[0].invocationId, payloads[1].invocationId);
    assert.ok(parseServerToolCall(payloads[0]));
    assert.doesNotMatch(JSON.stringify(payloads), /private|raw-conversation|raw-user|secret/);
    globalThis.fetch = (async () => { throw new Error("offline"); }) as typeof fetch;
    const error = new Error("business failure");
    await assert.rejects(client.wrap("quote", async () => { throw error; })({}, {}), e => e === error);
    assert.equal(await client.wrap("quote", async () => 42)({}, {}), 42);
    assert.equal(await client.outcome({ invocationId: "invocation_1234567890", receiptId: "receipt_1234567890123", kind: "pdf_created", occurredAt: Date.now() }), false);
  } finally { globalThis.fetch = original; }
});

test("MCP outcomes isolate environments and deduplicate exact invocation links", () => {
  const old = process.env.TRACKING_DB;
  process.env.TRACKING_DB = ":memory:"; closeDb();
  try {
    const now = Date.now(); ensureAccount("a@example.com"); addSite("a.example", "a@example.com");
    const call = parseServerToolCall({ invocationId: "invocation_1234567890", toolName: "create_quote_pdf", occurredAt: now, technicalOutcome: "completed", actorKind: "unknown", environment: "test", durationMs: 52, pluginVersion: "1.0" })!;
    assert.ok(call); recordServerToolCall("a.example", call, now);
    for (const [index, kind] of ["pdf_created", "pdf_fetched", "pdf_fetched"].entries()) {
      const receipt = parseServerOutcome({ receiptId: `receipt_1234567890_${index}`, kind, status: "confirmed", occurredAt: now, invocationId: call.invocationId, environment: "test" })!;
      assert.ok(receipt); assert.equal(recordServerOutcome("a.example", receipt, now), "created");
      assert.equal(recordServerOutcome("a.example", receipt, now), "duplicate");
    }
    const rows = mcpToolBreakdown("a.example", 1, "test", now);
    assert.equal(rows[0].pdfCreated, 1); assert.equal(rows[0].pdfFetched, 1); assert.equal(rows[0].avgMs, 52);
    assert.equal(mcpToolBreakdown("a.example", 1, "production", now).length, 0);
    assert.equal(outcomeSummary("a.example", 1, now).confirmed, 0);
    assert.equal(mcpToolBreakdown("b.example", 1, "test", now).length, 0);
    const production = parseServerOutcome({ receiptId: "production_1234567890", kind: "pdf_created", status: "confirmed", occurredAt: now, invocationId: call.invocationId })!;
    recordServerOutcome("a.example", production, now);
    const link = db().prepare("select server_invocation_id from server_outcomes where receipt_id=?").get(production.receiptId) as { server_invocation_id: string | null };
    assert.equal(link.server_invocation_id, null);
    assert.equal(parseServerToolCall({ ...call, durationMs: -1 }), null);
    assert.equal(parseServerToolCall({ ...call, errorClass: "Customer Jane Doe" }), null);
    assert.equal(parseServerOutcome({ ...production, downloadUrl: "private" }), null);
  } finally { closeDb(); if (old === undefined) delete process.env.TRACKING_DB; else process.env.TRACKING_DB = old; }
});
