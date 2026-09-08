import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { closeDb, dailyRows, ensureAccount, addSite, recentBursts, recordBursts, recordEvents, recordLogFetches, setLogSource, getSite, usageThisMonth } from "./db";
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
    const { fetches, bursts, scanned } = importLines(lines);
    assert.equal(scanned, 10);
    assert.deepEqual(
      fetches.map((f) => `${f.agent} ${f.path}`),
      ["chatgpt-user /", "chatgpt-user /pricing", "chatgpt-user /docs", "chatgpt-user /later", "claudebot /"],
    );
    assert.equal(fetches[0].day, "2026-09-08");
    assert.equal(bursts.length, 1);
    assert.equal(bursts[0].agent, "chatgpt-user");
    assert.deepEqual(bursts[0].paths, ["/", "/pricing", "/docs"]);
    assert.equal(bursts[0].ms, 3000);
    assert.ok(bursts[0].paths.length >= BURST_MIN_PAGES);
  });
  it("skips lines already imported and sets apart claimed agents from outside the published ranges", () => {
    const ranges = { fetchedAt: "x", lists: { "openai-chatgpt-user": ["1.1.1.0/24"] } };
    const lines = [
      line("1.1.1.1", "08/Sep/2026:06:00:00 +0200", "/old", GPT),
      line("1.1.1.1", "08/Sep/2026:06:00:10 +0200", "/real", GPT),
      line("8.8.8.8", "08/Sep/2026:06:00:11 +0200", "/fake", GPT),
      line("8.8.8.8", "08/Sep/2026:06:00:12 +0200", "/claude", CLAUDE),
    ];
    const since = Date.UTC(2026, 8, 8, 4, 0, 0);
    const r = importLines(lines, { ranges, since });
    assert.equal(r.skipped, 1);
    assert.deepEqual(r.fetches.map((f) => f.path), ["/real", "/claude"]);
    assert.deepEqual(r.unverified.map((f) => `${f.agent} ${f.path}`), ["chatgpt-user /fake"]);
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
    recordLogFetches(
      "logged.example",
      [
        { day: "2026-09-08", agent: "gptbot", path: "/" },
        { day: "2026-09-08", agent: "gptbot", path: "/docs" },
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
    assert.equal(find("ai_fetch", "agent:gptbot")?.count, 2);
    assert.equal(find("unverified", "agent:gptbot")?.count, 1);
    assert.equal(find("page", "/docs")?.count, 1);
    assert.equal(find("burst", "agent:gptbot")?.count, 1);
    assert.equal(find("burst", "agent:gptbot")?.ms_total, 3);
    assert.deepEqual(recentBursts("logged.example")[0].paths, ["/", "/docs", "/pricing"]);
    // A snippet beacon from an agent on a log-fed site: kept as a raw row, not counted as a fetch again.
    const view = { kind: "view", name: null, path: "/", source: "agent:chatgpt-user", session: "s", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false };
    recordEvents("logged.example", "l@x.com", [view], NOW, { fetchesFromLog: true });
    assert.equal(dailyRows("logged.example", 30, NOW).find((r) => r.kind === "ai_fetch" && r.name === "agent:chatgpt-user"), undefined);
    recordEvents("logged.example", "l@x.com", [{ ...view, source: "chatgpt" }], NOW, { fetchesFromLog: true });
    assert.equal(dailyRows("logged.example", 30, NOW).find((r) => r.kind === "ai_referral" && r.name === "chatgpt")?.count, 1);
  });
});
