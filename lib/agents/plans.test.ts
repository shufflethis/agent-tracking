import assert from "node:assert/strict";
import { test } from "node:test";
import { interpretEvent } from "../billing";
import { db, getAccount, setAgentPlan, setPlan } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { effectiveAgentPlan, pricingActive } from "./plans";
import type { AgentEvent } from "./types";
import { owner, withDb } from "./test-db";

const NOW = Date.UTC(2026, 11, 10, 9, 0);
const STARTED = NOW - 86_400_000;
const LATER = NOW + 86_400_000;
let n = 0;
const ev = (name: string, type: AgentEvent["type"], extra: Partial<AgentEvent> = {}): AgentEvent => {
  n += 1;
  return { v: 1, id: `p${n}-${"0".repeat(8)}`, type, at: NOW + n, agent: { kind: "claude", name, host: "server1" }, run: n.toString(16).padStart(16, "0"), ...extra };
};
const agents = () => (db().prepare("select count(*) as n from agents").get() as { n: number }).n;

test("during the beta everyone has the Pro limits", () => {
  assert.equal(pricingActive(NOW, null), false);
  assert.equal(pricingActive(NOW, LATER), false);
  assert.equal(effectiveAgentPlan("free", NOW, null).agents, 50);
  assert.equal(effectiveAgentPlan("free", NOW, LATER).webhooks, true);
});

test("after the start the stored plan applies", () => {
  const free = effectiveAgentPlan("free", NOW, STARTED);
  assert.deepEqual([free.agents, free.webhooks, free.otlp, free.checks], [5, false, false, false]);
  assert.equal(effectiveAgentPlan("pro", NOW, STARTED).agents, 50);
  assert.equal(effectiveAgentPlan(null, NOW, STARTED).agents, 5);
  assert.equal(effectiveAgentPlan("agency", NOW, STARTED).agents, 5, "unknown values fall back to free");
});

test("a free account over the limit keeps its agents and only new ones are refused", () => withDb(() => {
  const o = owner();
  for (let i = 0; i < 7; i++) recordAgentEvents(o, [ev(`beta${i}`, "session_start")], NOW, null);
  assert.equal(agents(), 7);
  const existing = recordAgentEvents(o, [ev("beta3", "turn_end")], NOW, STARTED);
  assert.equal(existing.accepted, 1);
  assert.equal(existing.rejected, null);
  const fresh = recordAgentEvents(o, [ev("new-one", "session_start")], NOW, STARTED);
  assert.equal(fresh.accepted, 0);
  assert.equal(fresh.rejected, "agent_limit");
  assert.equal(agents(), 7);
}));

test("Pro allows new agents up to 50 after the start", () => withDb(() => {
  const o = owner();
  setAgentPlan(o, "pro", { customer: "cus_1", subscription: "sub_1" });
  for (let i = 0; i < 6; i++) recordAgentEvents(o, [ev(`pro${i}`, "session_start")], NOW, STARTED);
  assert.equal(agents(), 6);
}));

test("task checks are kept on Pro and ignored on Free after the start", () => withDb(() => {
  const check = (who: string, starts: number | null) => {
    const o = owner(who);
    const cron = { kind: "cron" as const, name: "booking", host: "server1" };
    const start = ev("x", "cron_start", { agent: cron });
    recordAgentEvents(o, [start, ev("x", "cron_end", { agent: cron, run: start.run, exitCode: 0, checkName: "booking", checkVersion: "v1" })], NOW, starts);
    return db().prepare("select r.check_name as name from agent_runs r join agents a on a.id = r.agent_id where a.owner = ?").get(o) as { name: string | null };
  };
  assert.equal(check("free@example.com", STARTED).name, null);
  assert.equal(check("beta@example.com", null).name, "booking");
}));

test("the agent plan and the website plan are stored separately", () => withDb(() => {
  const o = owner();
  setPlan(o, "agency", { customer: "cus_1", subscription: "sub_sites" });
  setAgentPlan(o, "pro", { customer: "cus_1", subscription: "sub_agents" });
  let a = getAccount(o)!;
  assert.deepEqual([a.plan, a.stripe_subscription, a.agent_plan, a.agent_stripe_subscription], ["agency", "sub_sites", "pro", "sub_agents"]);
  setAgentPlan(o, "free");
  a = getAccount(o)!;
  assert.deepEqual([a.plan, a.stripe_subscription, a.agent_plan, a.agent_stripe_subscription], ["agency", "sub_sites", "free", null]);
}));

test("webhook events are routed to the right product", () => {
  const env = { ...process.env };
  process.env.STRIPE_PRICE_AGENTS_PRO_MONTH = "price_agents_m";
  process.env.STRIPE_PRICE_AGENTS_PRO_YEAR = "price_agents_y";
  process.env.STRIPE_PRICE_PRO = "price_sites_pro";
  try {
    const sub = (price: string, extra: Record<string, unknown> = {}, meta: Record<string, string> = { email: "a@example.com" }) =>
      ({ id: "sub_1", customer: "cus_1", status: "active", metadata: meta, items: { data: [{ price: { id: price } }] }, ...extra });

    const checkout = interpretEvent({ type: "checkout.session.completed", data: { object: { customer: "cus_1", subscription: "sub_1", metadata: { email: "a@example.com", product: "agents", plan: "pro" } } } });
    assert.deepEqual(checkout, { product: "agents", email: "a@example.com", plan: "pro", customer: "cus_1", subscription: "sub_1" });

    const sites = interpretEvent({ type: "checkout.session.completed", data: { object: { customer: "cus_1", subscription: "sub_2", metadata: { email: "a@example.com", plan: "pro" } } } });
    assert.equal(sites?.product, "sites");

    // A cancellation scheduled in the portal keeps the plan until the period ends.
    const scheduled = interpretEvent({ type: "customer.subscription.updated", data: { object: sub("price_agents_y", { cancel_at_period_end: true }) } });
    assert.deepEqual([scheduled?.product, scheduled?.plan], ["agents", "pro"]);

    const ended = interpretEvent({ type: "customer.subscription.deleted", data: { object: sub("price_agents_m") } });
    assert.deepEqual([ended?.product, ended?.plan, ended?.subscription], ["agents", "free", null]);

    const sitesEnded = interpretEvent({ type: "customer.subscription.deleted", data: { object: sub("price_sites_pro") } });
    assert.deepEqual([sitesEnded?.product, sitesEnded?.plan], ["sites", "free"]);

    assert.equal(interpretEvent({ type: "customer.subscription.updated", data: { object: sub("price_unknown") } }), null);
  } finally {
    process.env = env;
  }
});
