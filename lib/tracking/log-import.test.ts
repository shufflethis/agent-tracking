import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { closeDb, dailyRows, ensureAccount, addSite, ingestHealth, ingestLogSourceBatch, logAttemptPaths, logSourceStates, recentBursts, recordBursts, recordEvents, recordLogFetches, setLogSource, getSite, usageThisMonth, verificationAudit } from "./db";
import { BURST_MIN_PAGES, importLines, isPagePath, parseLine } from "./log-import";

const line = (ip: string, time: string, path: string, ua: string, status = 200, method = "GET") =>
  `${ip} - - [${time}] "${method} ${path} HTTP/1.1" ${status} 1234 "-" "${ua}"`;
const GPT = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot";
const CLAUDE = "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
const HUMAN = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";

describe("parseLine", () => {
  it("reads the combined format and converts the zoned time to an epoch", () => {
    const l = parseLine(line("2a14:7c0:1300:10b::", "08/Sep/2026:06:28:26 +0200", "/imprint?_rsc=abc", GPT));
    assert.ok(l);
    assert.equal(l.ip, "2a14:7c0:1300:10b::");
    assert.equal(l.t, Date.UTC(2026, 8, 8, 4, 28, 26));
    assert.equal(l.method, "GET");
    assert.equal(l.path, "/imprint?_rsc=abc");
    assert.equal(l.status, 200);
    assert.equal(l.ua, GPT);
    assert.equal(parseLine("garbage"), null);
  });
  it("tells pages from assets and internals", () => {
    assert.equal(isPagePath("/"), true);
    assert.equal(isPagePath("/docs?x=1"), true);
    assert.equal(isPagePath("/imprint?_rsc=abc"), false);
    assert.equal(isPagePath("/_next/static/chunk.js"), false);
    assert.equal(isPagePath("/api/event"), false);
    assert.equal(isPagePath("/icon.svg"), false);
    assert.equal(isPagePath("/.well-known/webmcp"), false);
  });
});

describe("importLines", () => {
  it("keeps delivery, redirects, failures and resource guesses as distinct attempts", () => {
    const at = "08/Sep/2026:06:00:00 +0200";
    const lines = [
      line("1.1.1.1", at, "/docs", GPT),
      line("1.1.1.1", at, "/moved", GPT, 301),
      line("1.1.1.1", at, "/private", GPT, 403),
      line("1.1.1.1", at, "/busy", GPT, 429),
      line("1.1.1.1", at, "/broken", GPT, 500),
      line("1.1.1.1", at, "/file.pdf?token=secret", GPT),
      line("1.1.1.1", at, "/api/search", GPT, 200, "POST"),
      line("1.1.1.1", at, "/.well-known/ai-plugin.json", GPT, 200, "HEAD"),
      line("1.1.1.1", at, "/data.json", GPT),
    ];
    const now = new Date().toISOString();
    const result = importLines(lines, { ranges: { fetchedAt: now, updatedAt: { "openai-chatgpt-user": now }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } } });
    assert.deepEqual(result.fetches.map((f) => f.path), ["/docs"]);
    assert.equal(result.attempts.length, lines.length);
    assert.deepEqual(result.attempts.map((a) => a.result), ["delivered", "redirect", "blocked", "rate_limited", "server_error", "delivered", "delivered", "delivered", "delivered"]);
    assert.deepEqual(result.attempts.slice(5).map((a) => a.resource), ["pdf", "api", "discovery", "json"]);
    assert.deepEqual(result.attempts.slice(6, 8).map((a) => a.method), ["OTHER", "HEAD"]);
    assert.equal(result.attempts[5].path, "/file.pdf");
    assert.equal(result.attempts[5].contentType, null);
    assert.equal(result.attempts[5].durationMs, null);
    assert.equal(result.attempts[5].resourceBasis, "path_guess");
  });
  /**
   * The counted numbers must not move when an unknown agent shows up, or every
   * addition to ai-sources.json would rewrite history. The string is kept
   * beside them, deduplicated, and only when it looks like a bot at all.
   */
  it("tallies bot-shaped strings it cannot place without counting them", () => {
    const UNKNOWN = "Mozilla/5.0 (compatible; ExampleAI-Bot/1.2; +https://example.ai/bot)";
    const lines = [
      line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/", GPT),
      line("3.3.3.3", "08/Sep/2026:06:00:01 +0200", "/", UNKNOWN),
      line("3.3.3.3", "08/Sep/2026:06:00:02 +0200", "/pricing", UNKNOWN),
      line("3.3.3.3", "08/Sep/2026:06:00:03 +0200", "/style.css", UNKNOWN),
      line("3.3.3.3", "08/Sep/2026:06:00:04 +0200", "/gone", UNKNOWN, 404),
      line("4.4.4.4", "08/Sep/2026:06:00:05 +0200", "/", HUMAN),
    ];
    const { fetches, unverified, unknown } = importLines(lines);

    assert.deepEqual(fetches.map((f) => f.agent), []);
    assert.equal(unverified[0].evidence?.status, "missing");
    // Two page GETs, not the asset and not the 404; the browser never appears.
    assert.equal(unknown.length, 1);
    assert.equal(unknown[0].ua, UNKNOWN);
    assert.equal(unknown[0].hits, 2);
  });

  it("keeps successful page GETs by known agents and finds bursts per agent and address", () => {
    const lines = [
      line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:02 +0200", "/pricing", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:03 +0200", "/docs", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:03 +0200", "/_next/static/a.js", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:04 +0200", "/api/mcp", GPT, 200, "POST"),
      line("1.1.1.1", "08/Sep/2026:06:00:05 +0200", "/missing", GPT, 404),
      line("1.1.1.1", "08/Sep/2026:06:10:00 +0200", "/later", GPT),
      line("2.2.2.2", "08/Sep/2026:06:00:01 +0200", "/", CLAUDE),
      line("2.2.2.2", "08/Sep/2026:06:00:01 +0200", "/", HUMAN),
      "not a log line",
    ];
    const { fetches, unverified, bursts, scanned } = importLines(lines, { ranges: { fetchedAt: new Date().toISOString(), updatedAt: { "openai-chatgpt-user": new Date().toISOString() }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } } });
    assert.equal(scanned, 10);
    assert.deepEqual(
      fetches.map((f) => `${f.agent} ${f.path}`),
      ["chatgpt-user /", "chatgpt-user /pricing", "chatgpt-user /docs", "chatgpt-user /later"],
    );
    assert.equal(unverified.find((f) => f.agent === "claudebot")?.evidence?.status, "unavailable");
    assert.equal(fetches[0].day, "2026-09-08");
    assert.equal(bursts.length, 1);
    assert.equal(bursts[0].agent, "chatgpt-user");
    assert.deepEqual(bursts[0].paths, ["/", "/pricing", "/docs"]);
    assert.equal(bursts[0].ms, 3000);
    assert.ok(bursts[0].paths.length >= BURST_MIN_PAGES);
  });
  it("requires three distinct relevant pages for a multi-page burst", () => {
    const at = ["06:00:00", "06:00:01", "06:00:02", "06:00:03"].map((clock) => `08/Sep/2026:${clock} +0200`);
    const ranges = { fetchedAt: new Date().toISOString(), updatedAt: { "openai-chatgpt-user": new Date().toISOString() }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } };
    const repeated = importLines(at.slice(0, 3).map((time) => line("1.1.1.1", time, "/same", GPT)), { ranges });
    assert.equal(repeated.fetches.length, 3);
    assert.equal(repeated.bursts.length, 0);
    const distinct = importLines(["/one", "/two", "/three"].map((path, i) => line("1.1.1.1", at[i], path, GPT)), { ranges });
    assert.equal(distinct.bursts.length, 1);
    assert.deepEqual(distinct.bursts[0].paths, ["/one", "/two", "/three"]);
  });
  it("skips lines already imported and sets apart claimed agents from outside the published ranges", () => {
    const ranges = { fetchedAt: new Date().toISOString(), updatedAt: { "openai-chatgpt-user": new Date().toISOString() }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } };
    const lines = [
      line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/old", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:10 +0200", "/real", GPT),
      line("8.8.8.8", "08/Sep/2026:06:00:11 +0200", "/fake", GPT),
      line("8.8.8.8", "08/Sep/2026:06:00:12 +0200", "/claude", CLAUDE),
    ];
    const since = Date.UTC(2026, 8, 8, 4, 0, 0);
    const r = importLines(lines, { ranges, since });
    assert.equal(r.skipped, 1);
    assert.deepEqual(r.fetches.map((f) => f.path), ["/real"]);
    assert.deepEqual(r.unverified.map((f) => `${f.agent} ${f.path}`), ["chatgpt-user /fake", "claudebot /claude"]);
    assert.deepEqual(r.unverified.map((f) => f.evidence?.status), ["mismatch", "unavailable"]);
    assert.equal(r.lastT, Date.UTC(2026, 8, 8, 4, 0, 12));
    assert.equal(r.bursts.length, 0);
  });
});

describe("log rows in the store", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
  });
  after(() => {
    closeDb();
    delete process.env.TRACKING_DB;
  });
  const NOW = Date.UTC(2026, 8, 8, 12);
  it("writes fetch counters and bursts, and stops the snippet from counting fetches twice", () => {
    closeDb();
    ensureAccount("l@x.com", NOW);
    addSite("logged.example", "l@x.com", NOW);
    const evidence = { status: "verified", method: "ip_range", source: "openai-gptbot", sourceVersion: "2026-09-08T00:00:00.000Z", checkedAt: NOW };
    recordLogFetches(
      "logged.example",
      [
        { day: "2026-09-08", agent: "gptbot", path: "/", evidence },
        { day: "2026-09-08", agent: "gptbot", path: "/docs", evidence },
      ],
      [{ day: "2026-09-08", agent: "gptbot" }],
      "l@x.com",
      NOW,
    );
    recordBursts("logged.example", [{ agent: "gptbot", start: NOW, ms: 2500, paths: ["/", "/docs", "/pricing"] }]);
    setLogSource("logged.example", NOW, NOW - 5000);
    setLogSource("logged.example", NOW + 1, NOW - 9000);
    assert.equal(getSite("logged.example")?.log_since, NOW);
    assert.equal(getSite("logged.example")?.log_last_t, NOW - 5000, "the newest line wins, never an older one");
    assert.equal(usageThisMonth("l@x.com", NOW), 2, "log fetches count as agent events");
    const rows = dailyRows("logged.example", 30, NOW);
    const find = (kind: string, name: string) => rows.find((r) => r.kind === kind && r.name === name);
    assert.equal(find("ai_fetch_verified", "agent:gptbot")?.count, 2);
    assert.equal(verificationAudit("logged.example", 30, NOW).find((row) => row.status === "verified")?.count, 2);
    assert.equal(find("unverified", "agent:gptbot")?.count, 1);
    assert.equal(find("page", "/docs")?.count, 1);
    assert.equal(find("burst", "agent:gptbot")?.count, 1);
    assert.equal(find("burst", "agent:gptbot")?.ms_total, 3);
    assert.deepEqual(recentBursts("logged.example")[0].paths, ["/", "/docs", "/pricing"]);
    // A snippet beacon from an agent on a log-fed site: kept as a raw row, not counted as a fetch again.
    const view = { kind: "view", name: null, path: "/", source: "agent:chatgpt-user", session: "s", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false };
    recordEvents("logged.example", "l@x.com", [view], NOW, { fetchesFromLog: true });
    assert.equal(dailyRows("logged.example", 30, NOW).find((r) => r.kind === "ai_fetch_verified" && r.name === "agent:chatgpt-user"), undefined);
    recordEvents("logged.example", "l@x.com", [{ ...view, source: "chatgpt" }], NOW, { fetchesFromLog: true });
    assert.equal(dailyRows("logged.example", 30, NOW).find((r) => r.kind === "ai_referral" && r.name === "chatgpt")?.count, 1);
  });
  it("persists access attempts separately from confirmed HTML fetches", () => {
    closeDb();
    ensureAccount("attempt@x.com", NOW);
    addSite("attempt.example", "attempt@x.com", NOW);
    const timestamp = "08/Sep/2026:06:00:00 +0200";
    const lines = [line("1.1.1.1", timestamp, "/docs", GPT), line("1.1.1.1", timestamp, "/docs", GPT, 403), line("1.1.1.1", timestamp, "/file.pdf", GPT)];
    const now = new Date().toISOString();
    const result = importLines(lines, { ranges: { fetchedAt: now, updatedAt: { "openai-chatgpt-user": now }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } } });
    recordLogFetches("attempt.example", result.fetches, result.unverified, "attempt@x.com", NOW, result.attempts);
    const attempts = logAttemptPaths("attempt.example", 30, NOW);
    assert.equal(attempts.reduce((n, a) => n + a.count, 0), 3);
    assert.ok(attempts.some((a) => a.status === 403 && a.result === "blocked"));
    assert.ok(attempts.some((a) => a.resource === "pdf" && a.result === "delivered"));
    assert.equal(dailyRows("attempt.example", 30, NOW).find((r) => r.kind === "ai_fetch_verified")?.count, 1);
    assert.equal(usageThisMonth("attempt@x.com", NOW), 1);
  });
  it("enforces the log quota while preserving access and verification evidence", () => {
    closeDb();
    ensureAccount("quota@x.com", NOW);
    addSite("quota.example", "quota@x.com", NOW);
    const evidence = { status: "verified", method: "ip_range", source: "openai-gptbot", sourceVersion: "2026-09-08T00:00:00.000Z", checkedAt: NOW };
    const fetches = [{ day: "2026-09-08", agent: "gptbot", path: "/one", evidence }, { day: "2026-09-08", agent: "gptbot", path: "/two", evidence }];
    const result = recordLogFetches("quota.example", fetches, [], "quota@x.com", NOW, [], 1);
    assert.equal(result.quotaDropped, 1);
    assert.equal(usageThisMonth("quota@x.com", NOW), 1);
    assert.equal(dailyRows("quota.example", 30, NOW).find((r) => r.kind === "ai_fetch_verified")?.count, 1);
    assert.equal(verificationAudit("quota.example", 30, NOW).find((r) => r.status === "verified")?.count, 2);
    assert.equal(ingestHealth("quota.example", 30, NOW).find((r) => r.outcome === "quota_reached")?.count, 1);
  });
  it("uses source positions for idempotence and accepts late lines and equal-time requests", () => {
    closeDb();
    ensureAccount("source@x.com", NOW);
    addSite("source.example", "source@x.com", NOW);
    const fresh = new Date().toISOString();
    const ranges = { fetchedAt: fresh, updatedAt: { "openai-chatgpt-user": fresh }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } };
    const recent = line("1.1.1.1", "08/Sep/2026:06:00:10 +0200", "/docs", GPT);
    const old = line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/older", GPT);
    const first = ingestLogSourceBatch("source.example", "source@x.com", "nginx-a", "inode-1", [{ id: "0", line: recent }, { id: "100", line: recent }], ranges, NOW, 200);
    assert.equal(first.result.fetches.length, 2, "identical lines at distinct byte positions are distinct requests");
    const retry = ingestLogSourceBatch("source.example", "source@x.com", "nginx-a", "inode-1", [{ id: "0", line: recent }, { id: "100", line: recent }], ranges, NOW, 200);
    assert.equal(retry.duplicates, 2);
    assert.equal(retry.result.fetches.length, 0);
    ingestLogSourceBatch("source.example", "source@x.com", "nginx-a", "inode-1", [{ id: "200", line: old }], ranges, NOW, 300);
    ingestLogSourceBatch("source.example", "source@x.com", "nginx-b", "inode-1", [{ id: "0", line: old }], ranges, NOW);
    ingestLogSourceBatch("source.example", "source@x.com", "nginx-a", "inode-2", [{ id: "0", line: old }], ranges, NOW, 100);
    assert.equal(dailyRows("source.example", 30, NOW).find((r) => r.kind === "ai_fetch_verified")?.count, 5);
    assert.equal(usageThisMonth("source@x.com", NOW), 5);
    assert.equal(logSourceStates("source.example").length, 3);
    assert.equal(logSourceStates("source.example").find((s) => s.sourceId === "nginx-a" && s.generation === "inode-1")?.nextOffset, 300);
  });
  it("rolls back records and counters when an identity is reused with different content", () => {
    closeDb();
    ensureAccount("rollback@x.com", NOW);
    addSite("rollback.example", "rollback@x.com", NOW);
    const first = line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/one", GPT);
    const other = line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/two", GPT);
    ingestLogSourceBatch("rollback.example", "rollback@x.com", "source", "generation", [{ id: "0", line: first }], null, NOW, 100);
    assert.throws(() => ingestLogSourceBatch("rollback.example", "rollback@x.com", "source", "generation", [{ id: "100", line: other }, { id: "0", line: other }], null, NOW, 200), /identity reused/);
    const retry = ingestLogSourceBatch("rollback.example", "rollback@x.com", "source", "generation", [{ id: "100", line: other }], null, NOW, 200);
    assert.equal(retry.result.unverified.length, 1);
    assert.equal(logSourceStates("rollback.example")[0].records, 2);
  });
  it("cuts over one legacy append-only snapshot without recounting old lines", () => {
    closeDb();
    ensureAccount("legacy@x.com", NOW);
    addSite("legacy.example", "legacy@x.com", NOW);
    const oldTime = Date.UTC(2026, 8, 8, 4, 0, 0);
    setLogSource("legacy.example", NOW - 1000, oldTime);
    const old = line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/old", GPT);
    const newer = line("1.1.1.1", "08/Sep/2026:06:00:01 +0200", "/new", GPT);
    const ranges = { fetchedAt: new Date().toISOString(), updatedAt: { "openai-chatgpt-user": new Date().toISOString() }, lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } };
    const first = ingestLogSourceBatch("legacy.example", "legacy@x.com", "legacy-upload", "append-only", [{ id: "0", line: old }, { id: "1", line: newer }], ranges, NOW);
    assert.equal(first.result.fetches.length, 1);
    assert.equal(ingestLogSourceBatch("legacy.example", "legacy@x.com", "legacy-upload", "append-only", [{ id: "0", line: old }, { id: "1", line: newer }], ranges, NOW).duplicates, 2);
    const late = ingestLogSourceBatch("legacy.example", "legacy@x.com", "legacy-upload", "append-only", [{ id: "2", line: old }], ranges, NOW);
    assert.equal(late.result.fetches.length, 1, "later appended older timestamps count after cutover");
    assert.equal(dailyRows("legacy.example", 30, NOW).find((r) => r.kind === "ai_fetch_verified")?.count, 2);
  });
});
