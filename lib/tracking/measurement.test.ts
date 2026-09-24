import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { sanitizeBatch } from "./classify";
import { addSite, closeDb, dailyRows, db, ensureAccount, ingestHealth, recordEvents, toolRows, usageThisMonth, verificationAudit, type StoredEvent } from "./db";
import { POST as ingestBrowserBatch } from "../../app/api/event/route";

const NOW = Date.UTC(2026, 8, 24, 12);
const call = (eventId: string): StoredEvent => ({
  kind: "tool_call", name: "book", path: "/book", source: null, session: "s1", ms: 30,
  ok: true, err: null, keys: [], declarative: false, simulated: false,
  eventId, transport: "browser", identityStatus: "unknown", businessOutcome: "unconfirmed",
});

describe("versioned measurements", () => {
  beforeEach(() => {
    process.env.TRACKING_DB = ":memory:";
    process.env.BOT_RANGES_FILE = join(tmpdir(), `agent-tracking-tests-no-ranges-${process.pid}`);
    closeDb();
  });
  afterEach(() => {
    closeDb();
    delete process.env.TRACKING_DB;
    delete process.env.BOT_RANGES_FILE;
  });

  it("accepts legacy batches and requires stable IDs in version 2", () => {
    assert.equal(sanitizeBatch({ d: "example.com", e: [{ k: "view" }] })?.version, 1);
    assert.equal(sanitizeBatch({ d: "example.com", v: 2, e: [{ k: "view" }] }), null);
    const v2 = sanitizeBatch({ d: "example.com", v: 2, e: [{ k: "view", id: "abcDEF1234567890", verified: true, transport: "server", at: NOW }] });
    assert.equal(v2?.events[0].id, "abcDEF1234567890");
    assert.equal(v2?.events[0].occurredAt, NOW);
    assert.equal("verified" in (v2?.events[0] ?? {}), false);
    assert.equal("transport" in (v2?.events[0] ?? {}), false);
  });

  it("deduplicates a retry atomically without merging distinct events or sites", () => {
    ensureAccount("a@example.com", NOW);
    addSite("example.com", "a@example.com", NOW);
    addSite("other.example", "a@example.com", NOW);
    recordEvents("example.com", "a@example.com", [call("event-0000000001")], NOW);
    recordEvents("example.com", "a@example.com", [call("event-0000000001")], NOW);
    recordEvents("example.com", "a@example.com", [call("event-0000000002")], NOW);
    recordEvents("other.example", "a@example.com", [call("event-0000000001")], NOW);
    assert.equal(dailyRows("example.com", 1, NOW).find((r) => r.kind === "tool_call")?.count, 2);
    assert.equal(dailyRows("other.example", 1, NOW).find((r) => r.kind === "tool_call")?.count, 1);
    assert.equal(usageThisMonth("a@example.com", NOW), 3);
    const row = db().prepare("select measurement_version, transport, identity_status, business_outcome, received_at from events where domain = ? limit 1").get("example.com") as Record<string, unknown>;
    assert.equal(row.measurement_version, 2);
    assert.equal(row.transport, "browser");
    assert.equal(row.identity_status, "unknown");
    assert.equal(row.business_outcome, "unconfirmed");
    assert.equal(row.received_at, NOW);
  });

  it("enforces the quota inside the batch but still records free measurement state", () => {
    ensureAccount("a@example.com", NOW);
    addSite("example.com", "a@example.com", NOW);
    const result = recordEvents("example.com", "a@example.com", [
      call("event-0000000010"), call("event-0000000011"),
      { ...call("event-0000000012"), kind: "tool_registered" },
    ], NOW, { quota: 1 });
    assert.deepEqual(result, { accepted: 2, duplicates: 0, quotaDropped: 1 });
    assert.equal(usageThisMonth("a@example.com", NOW), 1);
    assert.equal(dailyRows("example.com", 1, NOW).find((r) => r.kind === "tool_registered")?.count, 1);
    const retry = recordEvents("example.com", "a@example.com", [call("event-0000000010"), call("event-0000000011")], NOW, { quota: 2 });
    assert.deepEqual(retry, { accepted: 1, duplicates: 1, quotaDropped: 0 });
    assert.equal(usageThisMonth("a@example.com", NOW), 2);
  });

  it("keeps discovery, schema changes and removal separate from invocations", () => {
    ensureAccount("a@example.com", NOW);
    addSite("example.com", "a@example.com", NOW);
    const discovery = (kind: string, id: string, schemaHash: string): StoredEvent => ({ ...call(id), kind, name: "book", schemaHash });
    recordEvents("example.com", "a@example.com", [
      discovery("tool_discovered", "event-0000000020", "schema-a"),
      discovery("tool_discovered", "event-0000000021", "schema-b"),
      discovery("tool_removed", "event-0000000022", "schema-b"),
    ], NOW);
    assert.deepEqual(toolRows("example.com").map((tool) => [tool.schema_hash, tool.active, tool.capture_mode]), [["schema-b", 0, "discovered"]]);
    assert.equal(dailyRows("example.com", 1, NOW).some((row) => row.kind === "tool_call"), false);
    assert.equal(usageThisMonth("a@example.com", NOW), 0);
    recordEvents("example.com", "a@example.com", [discovery("tool_registered", "event-0000000023", "schema-c")], NOW);
    assert.deepEqual(toolRows("example.com").map((tool) => [tool.schema_hash, tool.active, tool.capture_mode]), [["schema-c", 1, "wrapped"]]);
  });

  it("does not persist browser error text, form values or sensitive paths", () => {
    ensureAccount("a@example.com", NOW);
    addSite("example.com", "a@example.com", NOW);
    const secret = "secret@example.com token=top-secret";
    recordEvents("example.com", "a@example.com", [{
      ...call("event-0000000030"), path: "/users/secret@example.com?token=top-secret", err: secret,
      keys: [secret], name: "book", ok: false,
    }], NOW);
    const raw = JSON.stringify(db().prepare("select path, err, keys from events where domain = ?").all("example.com"));
    const aggregates = JSON.stringify(dailyRows("example.com", 1, NOW));
    assert.equal(raw.includes(secret), false);
    assert.equal(aggregates.includes(secret), false);
    assert.match(raw, /\[redacted\]/);
  });

  it("keeps forged browser verification and business claims out of server evidence", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-tracking-salt-"));
    process.env.TRACKING_SALT_FILE = join(dir, "salt.json");
    try {
      ensureAccount("a@example.com", NOW);
      addSite("example.com", "a@example.com", NOW);
      const send = (id: string) => ingestBrowserBatch(new Request("https://agenttracking.co/api/event", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "text/plain", "user-agent": "GPTBot/1.0", "x-real-ip": "203.0.113.1" },
        body: JSON.stringify({ d: "example.com", v: 2, e: [{ k: "tool_call", n: "book", id, ok: true, verified: true, server_confirmed: true, transport: "server" }] }),
      }));
      assert.equal((await send("event-0000000003")).status, 202);
      assert.equal((await send("event-0000000003")).status, 202);
      assert.equal((await send("event-0000000004")).status, 202);
      assert.equal(dailyRows("example.com", 1, Date.now()).find((r) => r.kind === "tool_call")?.count, 2);
      const rows = db().prepare("select transport, identity_status, business_outcome from events where domain = ?").all("example.com") as { transport: string; identity_status: string; business_outcome: string }[];
      assert.equal(rows.length, 2);
      assert.ok(rows.every((r) => r.transport === "browser" && r.identity_status === "missing" && r.business_outcome === "unconfirmed"));
      assert.equal(verificationAudit("example.com")[0]?.status, undefined, "tool events are not crawler fetch evidence");
    } finally {
      delete process.env.TRACKING_SALT_FILE;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not let the platform origin write to a different registered site", async () => {
    ensureAccount("a@example.com", NOW);
    addSite("example.com", "a@example.com", NOW);
    const response = await ingestBrowserBatch(new Request("https://agenttracking.co/api/event", {
      method: "POST",
      headers: { origin: "https://agenttracking.co", "content-type": "text/plain" },
      body: JSON.stringify({ d: "example.com", v: 2, e: [{ k: "view", id: "event-0000000005" }] }),
    }));
    assert.equal(response.status, 204);
    assert.equal(dailyRows("example.com", 1, Date.now()).length, 0);
    assert.deepEqual(ingestHealth("example.com"), []);
  });

  it("records a browser goal as an attempt without a confirmed conversion", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-tracking-salt-"));
    process.env.TRACKING_SALT_FILE = join(dir, "salt.json");
    try {
      ensureAccount("a@example.com", NOW);
      addSite("example.com", "a@example.com", NOW);
      const response = await ingestBrowserBatch(new Request("https://agenttracking.co/api/event", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "text/plain" },
        body: JSON.stringify({ d: "example.com", v: 2, e: [{ k: "goal_attempt", n: "book", id: "event-0000000006" }] }),
      }));
      assert.equal(response.status, 202);
      const rows = dailyRows("example.com", 1, Date.now());
      assert.equal(rows.find((r) => r.kind === "goal_attempt")?.count, 1);
      assert.equal(rows.find((r) => r.kind === "conversion"), undefined);
      assert.equal(usageThisMonth("a@example.com"), 0);
    } finally {
      delete process.env.TRACKING_SALT_FILE;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keeps a UA-only browser fetch claim out of IP-confirmed counts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-tracking-salt-"));
    process.env.TRACKING_SALT_FILE = join(dir, "salt.json");
    try {
      ensureAccount("a@example.com", NOW);
      addSite("example.com", "a@example.com", NOW);
      await ingestBrowserBatch(new Request("https://agenttracking.co/api/event", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "text/plain", "user-agent": "GPTBot/1.0", "x-real-ip": "203.0.113.1" },
        body: JSON.stringify({ d: "example.com", v: 2, e: [{ k: "view", id: "event-0000000007" }] }),
      }));
      const rows = dailyRows("example.com", 1, Date.now());
      assert.equal(rows.find((row) => row.kind === "ai_fetch_verified"), undefined);
      assert.equal(rows.find((row) => row.kind === "claim_missing")?.count, 1);
      const audit = verificationAudit("example.com");
      assert.equal(audit[0]?.status, "missing");
      assert.equal(audit[0]?.method, "ip_range");
    } finally {
      delete process.env.TRACKING_SALT_FILE;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("counts a browser crawler request only when its IP matches a fresh provider list", async () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-tracking-ranges-"));
    process.env.TRACKING_SALT_FILE = join(dir, "salt.json");
    process.env.BOT_RANGES_FILE = join(dir, "ranges.json");
    const updatedAt = new Date().toISOString();
    writeFileSync(process.env.BOT_RANGES_FILE, JSON.stringify({ fetchedAt: updatedAt, updatedAt: { "openai-gptbot": updatedAt }, lists: { "openai-gptbot": ["203.0.113.0/24"] } }));
    try {
      ensureAccount("a@example.com", NOW);
      addSite("example.com", "a@example.com", NOW);
      await ingestBrowserBatch(new Request("https://agenttracking.co/api/event", {
        method: "POST",
        headers: { origin: "https://example.com", "content-type": "text/plain", "user-agent": "GPTBot/1.0", "x-real-ip": "203.0.113.1" },
        body: JSON.stringify({ d: "example.com", v: 2, e: [{ k: "view", id: "event-0000000008" }] }),
      }));
      const rows = dailyRows("example.com", 1, Date.now());
      assert.equal(rows.find((row) => row.kind === "ai_fetch_verified")?.count, 1);
      assert.equal(verificationAudit("example.com")[0]?.sourceVersion, updatedAt);
      assert.equal(verificationAudit("example.com")[0]?.sourceKey, "openai-gptbot");
    } finally {
      delete process.env.TRACKING_SALT_FILE;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("migrates a populated legacy database and can open it repeatedly", () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-tracking-measurement-"));
    const path = join(dir, "legacy.sqlite");
    try {
      const legacy = new DatabaseSync(path);
      legacy.exec(`create table events (
        id integer primary key, domain text not null, t integer not null, kind text not null,
        name text, path text not null, source text, session text, ms integer, ok integer,
        err text, keys text, declarative integer not null default 0, simulated integer not null default 0
      )`);
      legacy.prepare("insert into events (domain,t,kind,path) values (?,?,?,?)").run("example.com", NOW, "view", "/");
      legacy.close();
      process.env.TRACKING_DB = path;
      assert.equal((db().prepare("select count(*) as n from events").get() as { n: number }).n, 1);
      assert.equal((db().prepare("select measurement_version from events").get() as { measurement_version: number }).measurement_version, 1);
      closeDb();
      assert.equal((db().prepare("select count(*) as n from schema_migrations where version = 2").get() as { n: number }).n, 1);
      assert.equal((db().prepare("select count(*) as n from schema_migrations where version = 3").get() as { n: number }).n, 1);
      assert.equal((db().prepare("select count(*) as n from schema_migrations where version = 4").get() as { n: number }).n, 1);
      assert.equal((db().prepare("select count(*) as n from schema_migrations where version = 5").get() as { n: number }).n, 1);
      assert.equal((db().prepare("select count(*) as n from events").get() as { n: number }).n, 1);
    } finally {
      closeDb();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
