import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { interpretEvent, verifyWebhook } from "../billing";
import { agents, interactions, overview, pages, tools } from "./dashboard";
import type { DailyRow } from "./db";

const NOW = Date.UTC(2026, 8, 8, 12);
const day = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(NOW - offset * 86_400_000));
const row = (offset: number, kind: string, name: string, count = 1, errors = 0, ms_total = 0): DailyRow => ({ day: day(offset), kind, name, count, errors, ms_total });

const ROWS: DailyRow[] = [
  row(0, "view", "all", 40),
  row(0, "ai_referral", "chatgpt", 3),
  row(1, "ai_referral", "perplexity", 1),
  row(0, "ai_fetch", "agent:claudebot", 2),
  row(0, "tool_call", "search", 5, 1, 500),
  row(2, "tool_call", "search", 1, 0, 100),
  row(0, "tool_call_sim", "search", 4),
  row(0, "tool_error", "search TypeError", 1),
  row(0, "conversion", "order", 1),
  row(0, "page", "/pricing", 3),
  row(0, "tool_page", "/", 6),
  // Previous period: 35 days ago, inside the 2x window for trends.
  row(35, "ai_referral", "chatgpt", 1),
  row(35, "tool_call", "search", 10),
];

describe("overview", () => {
  it("sums the window per day and keeps the previous period apart", () => {
    const o = overview(ROWS, [{ day: day(0), sessions: 2 }], 30, NOW);
    assert.equal(o.days.length, 30);
    assert.equal(o.totals.referrals, 4);
    assert.equal(o.totals.fetches, 2);
    assert.equal(o.totals.calls, 6);
    assert.equal(o.totals.conversions, 1);
    assert.equal(o.totals.views, 40);
    assert.equal(o.totals.sessions, 2);
    assert.equal(o.previous.calls, 10);
    assert.equal(o.previous.referrals, 1);
    assert.equal(interactions(o), 13);
    assert.equal(o.days[o.days.length - 1].calls, 5);
  });
});

describe("agents", () => {
  it("ranks sources with share and trend", () => {
    const a = agents(ROWS, 30, NOW);
    assert.equal(a[0].id, "chatgpt");
    assert.equal(a[0].label, "ChatGPT");
    assert.equal(a[0].kind, "referral");
    assert.equal(a[0].count, 3);
    assert.equal(a[0].share, 0.5);
    assert.equal(a[0].trend, 2);
    const fetch = a.find((x) => x.id === "claudebot")!;
    assert.equal(fetch.kind, "fetch");
    assert.equal(fetch.label, "ClaudeBot");
    assert.equal(fetch.trend, 1);
  });
});

describe("tools", () => {
  it("computes success rate, average time, top errors, and flags never-called tools", () => {
    const registry = [
      { name: "search", description_hash: "a", schema_hash: "b", first_seen: NOW, last_seen: NOW, declarative: 0 },
      { name: "lonely", description_hash: null, schema_hash: null, first_seen: NOW, last_seen: NOW, declarative: 1 },
    ];
    const t = tools(ROWS, registry, 30, NOW);
    const search = t.find((x) => x.name === "search")!;
    assert.equal(search.calls, 6);
    assert.equal(search.errors, 1);
    assert.equal(Math.round(search.successRate! * 100), 83);
    assert.equal(search.avgMs, 100);
    assert.equal(search.simulated, 4);
    assert.deepEqual(search.topErrors, [{ message: "TypeError", count: 1 }]);
    const lonely = t.find((x) => x.name === "lonely")!;
    assert.equal(lonely.neverCalled, true);
    assert.equal(lonely.declarative, true);
    assert.equal(lonely.successRate, null);
  });
});

describe("pages", () => {
  it("merges fetch and tool paths, busiest first", () => {
    const p = pages(ROWS, 30, NOW);
    assert.deepEqual(p, [
      { path: "/", fetches: 0, calls: 6 },
      { path: "/pricing", fetches: 3, calls: 0 },
    ]);
  });
});

describe("billing", () => {
  it("verifies a Stripe signature over t.body within tolerance", () => {
    const secret = "whsec_test";
    const body = '{"id":"evt_1"}';
    const t = Math.floor(NOW / 1000);
    const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    assert.equal(verifyWebhook(body, `t=${t},v1=${sig}`, secret, NOW), true);
    assert.equal(verifyWebhook(body, `t=${t},v1=${sig}`, secret, NOW + 10 * 60_000), false);
    assert.equal(verifyWebhook(body, `t=${t},v1=${"0".repeat(64)}`, secret, NOW), false);
    assert.equal(verifyWebhook(body, null, secret, NOW), false);
    assert.equal(verifyWebhook(body, `t=${t},v1=${sig}`, undefined, NOW), false);
  });
  it("reads a plan out of checkout and subscription events", () => {
    assert.deepEqual(interpretEvent({ type: "checkout.session.completed", data: { object: { metadata: { email: "a@x.com", plan: "pro" }, customer: "cus_1", subscription: "sub_1" } } }), {
      email: "a@x.com",
      plan: "pro",
      customer: "cus_1",
      subscription: "sub_1",
    });
    assert.deepEqual(interpretEvent({ type: "customer.subscription.deleted", data: { object: { metadata: { email: "a@x.com" }, customer: "cus_1" } } }), {
      email: "a@x.com",
      plan: "free",
      customer: "cus_1",
      subscription: null,
    });
    assert.equal(interpretEvent({ type: "invoice.paid", data: { object: {} } }), null);
    assert.equal(interpretEvent({ type: "checkout.session.completed", data: { object: { metadata: { plan: "gold", email: "a@x.com" } } } }), null);
  });
});
