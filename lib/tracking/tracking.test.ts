import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { matchAgent, matchReferral, normalizeDomain, sameSite, sanitizeBatch, sanitizeEvent, sessionHash, uaClass } from "./classify";
import { addSite, closeDb, dailyRows, ensureAccount, getSite, noteManifest, pruneRaw, recentEvents, recordEvents, registerTool, removeSite, sessionsPerDay, setApiToken, toolRows, usageThisMonth } from "./db";
import { accountForToken, bearerFrom, hashApiToken, mintApiToken } from "./api-token";
import { markTokenUsed, setDigest, accountsWithDigest, getAccount } from "./db";
import { renderDigestMail, worthSending } from "./digest";
import { loadDashboard } from "./dashboard";
import { clampDays, statsFor } from "./stats-api";
import { planFor, PLANS } from "./plans";

describe("agent.js", () => {
  it("stays under five kilobytes", () => {
    const size = readFileSync(join(process.cwd(), "public", "agent.js")).length;
    assert.ok(size < 5 * 1024, `agent.js is ${size} bytes`);
  });
  it("sets no cookie and touches no storage", () => {
    const src = readFileSync(join(process.cwd(), "public", "agent.js"), "utf8");
    assert.doesNotMatch(src, /document\.cookie|localStorage|sessionStorage|indexedDB/);
  });
});

describe("sanitizeEvent", () => {
  it("keeps the allow-listed fields and drops the query string from the path", () => {
    const e = sanitizeEvent({ k: "tool_call", n: "search", p: "/shop?q=secret#x", ms: 12.6, ok: true, keys: ["query", "limit"], extra: "no" });
    assert.ok(e);
    assert.equal(e.path, "/shop");
    assert.equal(e.ms, 13);
    assert.deepEqual(e.keys, ["query", "limit"]);
    assert.equal(e.simulated, false);
  });
  it("refuses unknown kinds and nameless tool events", () => {
    assert.equal(sanitizeEvent({ k: "pageview" }), null);
    assert.equal(sanitizeEvent({ k: "tool_call" }), null);
    assert.equal(sanitizeEvent("nope"), null);
  });
  it("caps everything", () => {
    const e = sanitizeEvent({ k: "tool_call", n: "x".repeat(500), e: "y".repeat(500), keys: Array.from({ length: 100 }, (_, i) => `k${i}`), ms: 1e9 });
    assert.ok(e);
    assert.equal(e.name!.length, 128);
    assert.equal(e.err!.length, 80);
    assert.equal(e.keys.length, 24);
    assert.equal(e.ms, 600_000);
  });
});

describe("sanitizeBatch and domains", () => {
  it("normalises the domain and caps the batch", () => {
    const b = sanitizeBatch({ d: "HTTPS://Example.com/path", e: Array.from({ length: 80 }, () => ({ k: "view" })) });
    assert.ok(b);
    assert.equal(b.domain, "example.com");
    assert.equal(b.events.length, 50);
  });
  it("refuses a batch without a hostname", () => {
    assert.equal(sanitizeBatch({ d: "localhost", e: [] }), null);
    assert.equal(sanitizeBatch({ e: [] }), null);
    assert.equal(normalizeDomain("192.168.0.1"), null);
  });
  it("treats www as the same site", () => {
    assert.ok(sameSite("www.example.com", "example.com"));
    assert.ok(!sameSite("shop.example.com", "example.com"));
  });
});

describe("classification", () => {
  it("matches AI referrers by host and utm", () => {
    assert.equal(matchReferral("chatgpt.com", null)?.id, "chatgpt");
    assert.equal(matchReferral("www.perplexity.ai", null)?.id, "perplexity");
    assert.equal(matchReferral("google.com", "chatgpt.com")?.via, "utm");
    assert.equal(matchReferral("google.com", null), null);
    assert.equal(matchReferral("notchatgpt.com", null), null);
  });
  it("matches AI user agents and leaves browsers alone", () => {
    assert.equal(matchAgent("Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)")?.id, "chatgpt-user");
    assert.equal(matchAgent("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0)")?.id, "claudebot");
    assert.equal(matchAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/128.0 Safari/537.36"), null);
  });
  it("classes a browser coarsely and hashes the session without the address on either side", () => {
    assert.equal(uaClass("Mozilla/5.0 (iPhone) Version/17 Mobile Safari/604.1"), "safari:m");
    assert.equal(uaClass("Mozilla/5.0 (X11) Chrome/128.0 Safari/537.36"), "chrome:d");
    const a = sessionHash("salt", "example.com", "Chrome/128.0 Safari/537.36", "203.0.113.5");
    const b = sessionHash("salt", "example.com", "Chrome/128.0 Safari/537.36", "203.0.113.6");
    const c = sessionHash("other", "example.com", "Chrome/128.0 Safari/537.36", "203.0.113.5");
    assert.notEqual(a, b);
    assert.notEqual(a, c);
    assert.equal(a.length, 16);
    assert.doesNotMatch(a, /203/);
  });
});

describe("plans", () => {
  it("falls back to free and holds the spec's limits", () => {
    assert.equal(planFor("nonsense").id, "free");
    assert.equal(PLANS.free.domains, 1);
    assert.equal(PLANS.free.eventsPerMonth, 10_000);
    assert.equal(PLANS.pro.domains, 5);
    assert.equal(PLANS.pro.eventsPerMonth, 500_000);
    assert.equal(PLANS.pro.windowDays, 365);
    assert.equal(PLANS.agency.domains, Infinity);
  });
});

describe("db", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
    closeDb();
  });
  after(() => {
    closeDb();
    delete process.env.TRACKING_DB;
  });

  const NOW = Date.UTC(2026, 8, 8, 12);

  it("registers an account and a site, first registrant keeps the domain", () => {
    ensureAccount("A@x.com", NOW);
    ensureAccount("b@x.com", NOW);
    assert.ok(addSite("Example.com", "a@x.com", NOW));
    assert.equal(addSite("example.com", "b@x.com", NOW), null);
    assert.equal(addSite("example.com", "A@x.com", NOW)?.owner, "a@x.com");
    assert.equal(getSite("example.com")?.owner, "a@x.com");
  });

  it("records a batch into raw rows, daily counters, tools and usage", () => {
    recordEvents(
      "example.com",
      "a@x.com",
      [
        { kind: "view", name: null, path: "/", source: null, session: "s1", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false },
        { kind: "view", name: null, path: "/pricing", source: "chatgpt", session: "s1", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false },
        { kind: "view", name: null, path: "/docs", source: "agent:claudebot", session: "s2", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false },
        { kind: "tool_registered", name: "search", path: "/", source: null, session: "s1", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false },
        { kind: "tool_call", name: "search", path: "/", source: null, session: "s1", ms: 40, ok: true, err: null, keys: ["query"], declarative: false, simulated: false },
        { kind: "tool_call", name: "search", path: "/", source: null, session: "s3", ms: 80, ok: false, err: "TypeError", keys: ["query"], declarative: false, simulated: false },
        { kind: "tool_call", name: "search", path: "/", source: null, session: "s9", ms: 5, ok: true, err: null, keys: [], declarative: false, simulated: true },
        { kind: "agent_conversion", name: "order", path: "/checkout", source: null, session: "s1", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false },
      ],
      NOW,
    );
    const rows = dailyRows("example.com", 30, NOW);
    const find = (kind: string, name: string) => rows.find((r) => r.kind === kind && r.name === name);
    assert.equal(find("view", "all")?.count, 3);
    assert.equal(find("ai_referral", "chatgpt")?.count, 1);
    assert.equal(find("ai_fetch", "agent:claudebot")?.count, 1);
    assert.equal(find("page", "/docs")?.count, 1);
    assert.equal(find("tool_call", "search")?.count, 2);
    assert.equal(find("tool_call", "search")?.errors, 1);
    assert.equal(find("tool_call", "search")?.ms_total, 120);
    assert.equal(find("tool_call_sim", "search")?.count, 1);
    assert.equal(find("tool_error", "search TypeError")?.count, 1);
    assert.equal(find("conversion", "order")?.count, 1);
    // Plain views are counted, not kept: the raw table holds the agent rows only.
    const raw = recentEvents("example.com");
    assert.ok(!raw.some((r) => r.kind === "view" && r.source === null));
    assert.ok(raw.some((r) => r.kind === "view" && r.source === "chatgpt"));
    // Seven, not eight: the plain view is counted for the chart but not charged.
    assert.equal(usageThisMonth("a@x.com", NOW), 7);
    assert.equal(toolRows("example.com").length, 1);
    assert.deepEqual(sessionsPerDay("example.com", 30, NOW + 1), [{ day: "2026-09-08", sessions: 2 }]);
  });

  it("keeps the tool registry's hashes and notices a manifest change", () => {
    registerTool("example.com", "search", "abc", "def", NOW);
    registerTool("example.com", "search", null, null, NOW + 1);
    const t = toolRows("example.com")[0];
    assert.equal(t.description_hash, "abc");
    assert.equal(t.last_seen, NOW + 1);
    assert.equal(noteManifest("example.com", "h1", NOW), false);
    assert.equal(noteManifest("example.com", "h1", NOW), false);
    assert.equal(noteManifest("example.com", "h2", NOW + 5), true);
    assert.equal(getSite("example.com")?.manifest_changed_at, NOW + 5);
  });

  it("prunes raw rows past retention and leaves the counters", () => {
    const removed = pruneRaw(NOW + 91 * 86_400_000);
    assert.ok(removed > 0);
    assert.equal(recentEvents("example.com").length, 0);
    assert.ok(dailyRows("example.com", 30, NOW).length > 0);
  });

  it("removes a site with everything under it, owner only", () => {
    assert.equal(removeSite("example.com", "b@x.com"), false);
    assert.equal(removeSite("example.com", "a@x.com"), true);
    assert.equal(getSite("example.com"), null);
    assert.equal(dailyRows("example.com", 30, NOW).length, 0);
  });
});


describe("api token", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
  });
  after(() => {
    closeDb();
    delete process.env.TRACKING_DB;
  });
  const NOW = Date.UTC(2026, 8, 8, 12);
  it("is minted with a prefix, stored as a hash, found by the raw token, and gone when revoked", () => {
    closeDb();
    ensureAccount("t@x.com", NOW);
    const { token, hash } = mintApiToken();
    assert.ok(token.startsWith("wmt_"));
    assert.equal(hash, hashApiToken(token));
    assert.equal(accountForToken(token), null);
    setApiToken("t@x.com", hash, NOW);
    assert.equal(accountForToken(token)?.email, "t@x.com");
    assert.equal(accountForToken("wmt_nope"), null);
    assert.equal(accountForToken(hash), null);
    setApiToken("t@x.com", null);
    assert.equal(accountForToken(token), null);
  });
  it("reads a Bearer header and nothing else", () => {
    assert.equal(bearerFrom(new Headers({ authorization: "Bearer wmt_abc" })), "wmt_abc");
    assert.equal(bearerFrom(new Headers({ authorization: "bearer wmt_abc" })), "wmt_abc");
    assert.equal(bearerFrom(new Headers({ authorization: "Basic xyz" })), null);
    assert.equal(bearerFrom(new Headers()), null);
  });
});

describe("stats api", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
  });
  after(() => {
    closeDb();
    delete process.env.TRACKING_DB;
  });
  const NOW = Date.UTC(2026, 8, 8, 12);
  it("answers for the account's own site only and clamps the window to the plan", () => {
    closeDb();
    const owner = ensureAccount("o@x.com", NOW);
    const other = ensureAccount("p@x.com", NOW);
    addSite("mine.example", "o@x.com", NOW);
    recordEvents("mine.example", "o@x.com", [{ kind: "view", name: null, path: "/", source: "chatgpt", session: "s1", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false }], NOW);
    assert.equal(clampDays(undefined, owner), 30);
    assert.equal(clampDays("400", owner), 30);
    assert.equal(clampDays("7", owner), 7);
    const stats = statsFor("mine.example", owner, 30, NOW);
    assert.ok(stats);
    assert.equal(stats.domain, "mine.example");
    assert.equal(stats.totals.referrals, 1);
    assert.equal(stats.totals.interactions, 1);
    assert.equal(stats.agents[0]?.id, "chatgpt");
    assert.equal(statsFor("mine.example", other, 30, NOW), null);
    assert.equal(statsFor("nobody.example", owner, 30, NOW), null);
  });
});

describe("one-time tokens and the digest flag", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
  });
  after(() => {
    closeDb();
    delete process.env.TRACKING_DB;
  });
  const NOW = Date.UTC(2026, 8, 8, 12);
  it("accepts a token hash once until it expires", () => {
    closeDb();
    assert.equal(markTokenUsed("h1", NOW + 60_000, NOW), true);
    assert.equal(markTokenUsed("h1", NOW + 60_000, NOW), false);
    assert.equal(markTokenUsed("h1", NOW + 60_000, NOW + 120_000), true, "expired rows are pruned, the hash can be reused after expiry");
  });
  it("defaults the digest to on, can switch it, and lists only accounts that want it", () => {
    ensureAccount("d@x.com", NOW);
    ensureAccount("e@x.com", NOW);
    assert.equal(getAccount("d@x.com")?.digest, 1);
    setDigest("e@x.com", false);
    assert.deepEqual(accountsWithDigest().map((a) => a.email), ["d@x.com"]);
  });
  it("renders a digest only for weeks with something in them", () => {
    addSite("digest.example", "d@x.com", NOW);
    const empty = [{ domain: "digest.example", dash: loadDashboard("digest.example", 7, NOW), dashboardUrl: "https://agenttracking.co/app/digest.example" }];
    assert.equal(worthSending(empty), false);
    recordEvents("digest.example", "d@x.com", [{ kind: "view", name: null, path: "/p", source: "chatgpt", session: "s", ms: null, ok: null, err: null, keys: [], declarative: false, simulated: false }], NOW);
    const sites = [{ domain: "digest.example", dash: loadDashboard("digest.example", 7, NOW), dashboardUrl: "https://agenttracking.co/app/digest.example" }];
    assert.equal(worthSending(sites), true);
    const mail = renderDigestMail(sites, "https://agenttracking.co/api/digest?off=t");
    assert.equal(mail.subject, "digest.example: 1 agent interaction this week");
    assert.match(mail.text, /ChatGPT 1/);
    assert.match(mail.html, /Stop the digest/);
    assert.doesNotMatch(mail.text, /\u2014/);
  });
});
