import assert from "node:assert/strict";
import { test } from "node:test";
import { mintSessionToken, readSessionToken, sessionIssuedAt } from "../session";
import { recordAgentEvents } from "../agents/ingest";
import { mintAgentToken } from "../agents/tokens";
import { withDb } from "../agents/test-db";
import { addSite, db, deleteAccount, ensureAccount, getAccount, revokeSessions, setAgentPlan } from "./db";

process.env.UNLOCK_SECRET ||= "test-secret-for-account-tests-0123456789";

const T = Date.UTC(2026, 11, 2, 9, 0);
const count = (table: string, where: string, arg: string) => (db().prepare(`select count(*) as n from ${table} where ${where}`).get(arg) as { n: number }).n;

function seed(email: string, domain: string) {
  ensureAccount(email);
  setAgentPlan(email, "pro");
  addSite(domain, email, T);
  db().prepare("insert into events (domain, t, kind, path) values (?, ?, 'pageview', '/')").run(domain, T);
  mintAgentToken(email, "server1", T);
  const agent = { kind: "claude" as const, name: "proj", host: "server1" };
  recordAgentEvents(email, [
    { v: 1, id: `${email}-1-xxxxxxxx`, type: "session_start", at: T, agent, run: "a".repeat(16) },
    { v: 1, id: `${email}-2-xxxxxxxx`, type: "tool_end", at: T + 1, agent, run: "a".repeat(16), tool: "Bash", ok: true },
  ], T);
}

test("deleting an account removes all of its data and nothing of anyone else", () => withDb(() => {
  seed("gone@example.com", "gone.example");
  seed("stay@example.com", "stay.example");
  assert.equal(count("events", "domain = ?", "gone.example"), 1, "fixture has data to delete");
  assert.equal(deleteAccount("gone@example.com"), true);
  assert.equal(getAccount("gone@example.com"), null);
  for (const [table, where] of [["sites", "owner = ?"], ["agents", "owner = ?"], ["agent_events", "owner = ?"], ["agent_tokens", "owner = ?"], ["agent_usage", "owner = ?"]] as const) {
    assert.equal(count(table, where, "gone@example.com"), 0, `${table} cleared`);
  }
  assert.equal((db().prepare("select count(*) as n from agent_runs").get() as { n: number }).n, 1, "only the other account's run is left");
  assert.equal((db().prepare("select count(*) as n from agent_daily").get() as { n: number }).n, 1, "only the other account's daily row is left");
  assert.equal(count("events", "domain = ?", "gone.example"), 0);
  // The other account is untouched.
  assert.ok(getAccount("stay@example.com"));
  assert.equal(count("agents", "owner = ?", "stay@example.com"), 1);
  assert.equal(count("agent_events", "owner = ?", "stay@example.com"), 2);
  assert.equal(count("sites", "owner = ?", "stay@example.com"), 1);
  assert.equal(deleteAccount("gone@example.com"), false, "second delete is a no-op");
}));

test("sign out everywhere invalidates sessions issued before it, not after", () => withDb(() => {
  ensureAccount("me@example.com");
  const before = readSessionToken(mintSessionToken("me@example.com", T))!;
  revokeSessions("me@example.com", T + 1000);
  const after = readSessionToken(mintSessionToken("me@example.com", T + 2000), T + 2000)!;
  const cut = getAccount("me@example.com")!.sessions_after!;
  assert.ok(sessionIssuedAt(before.expires) <= cut, "old session is revoked");
  assert.ok(sessionIssuedAt(after.expires) > cut, "new session is valid");
}));

test("an account created again after deletion does not accept cookies from before", () => withDb(() => {
  const old = readSessionToken(mintSessionToken("again@example.com", T - 5000), T)!;
  ensureAccount("again@example.com", T);
  const fresh = readSessionToken(mintSessionToken("again@example.com", T), T)!;
  const cut = getAccount("again@example.com")!.sessions_after!;
  assert.ok(sessionIssuedAt(old.expires) <= cut, "cookie from before the account is refused");
  assert.ok(sessionIssuedAt(fresh.expires) > cut, "the sign-in session itself is valid");
}));

test("Stripe's cancellation webhook after a deletion does not bring the account back", () => withDb(async () => {
  const { createHmac } = await import("node:crypto");
  const { POST } = await import("../../app/api/billing/webhook/route");
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_only";
  ensureAccount("bye@example.com");
  assert.equal(deleteAccount("bye@example.com"), true);
  const raw = JSON.stringify({ type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_1", metadata: { email: "bye@example.com", product: "agents" } } } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_test_only").update(`${t}.${raw}`).digest("hex");
  const res = await POST(new Request("https://agenttracking.co/api/billing/webhook", { method: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}` }, body: raw }));
  assert.equal(res.status, 200);
  assert.equal(getAccount("bye@example.com"), null);
}));
