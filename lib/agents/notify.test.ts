import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { dueBriefingOwners, markBriefed, sendAlerts, webhookRequest, type Alert } from "./notify";
import { saveNotifySettings } from "./store";
import type { AgentEvent } from "./types";
import { owner, withDb } from "./test-db";

const alert: Alert = { agent: "backup", host: "server1", status: "failed", at: Date.UTC(2026, 10, 2, 2, 3), detail: "Exit 1", url: "https://agenttracking.co/app/fleet/x" };

test("telegram preset builds sendMessage request", () => {
  const r = webhookRequest({ kind: "telegram", url: "123:abc", chatId: "-100" }, alert, "en");
  assert.equal(r.url, "https://api.telegram.org/bot123:abc/sendMessage");
  const body = JSON.parse(r.body);
  assert.equal(body.chat_id, "-100");
  assert.match(body.text, /backup \(server1\)/);
  assert.match(body.text, /https:\/\/agenttracking\.co\/app\/fleet\/x/);
});

test("slack and discord use their field names", () => {
  assert.ok(JSON.parse(webhookRequest({ kind: "slack", url: "https://hooks.slack.com/x" }, alert, "en").body).text);
  assert.ok(JSON.parse(webhookRequest({ kind: "discord", url: "https://discord.com/api/webhooks/x" }, alert, "en").body).content);
  const generic = JSON.parse(webhookRequest({ kind: "generic", url: "https://example.com/h" }, alert, "en").body);
  assert.deepEqual(Object.keys(generic).sort(), ["agent", "status", "text", "url"]);
});

const T = Date.UTC(2026, 10, 2, 2, 0);
let n = 0;
const failing = (name: string): AgentEvent[] => {
  const run = (++n).toString(16).padStart(32, "0");
  const agent = { kind: "cron" as const, name, host: "h" };
  return [{ v: 1, id: `x${n}-xxxxxxxx`, type: "cron_end", at: T, agent, run, exitCode: 1 }];
};

async function withFetch<T>(fn: (calls: { url: string; body: string }[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => { calls.push({ url: String(url), body: String(init?.body) }); return Response.json({ ok: true }); }) as typeof fetch;
  const key = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = "test";
  try { return await fn(calls); } finally { globalThis.fetch = original; if (key === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = key; }
}

test("alerts are sent once", () => withDb(() => withFetch(async (calls) => {
  const o = owner();
  saveNotifySettings(o, { briefingHour: 7, alertsEmail: true, webhook: { kind: "slack", url: "https://hooks.slack.com/x" } });
  recordAgentEvents(o, failing("backup"), T);
  assert.equal(await sendAlerts(T + 60_000), 1);
  assert.equal(calls.filter((c) => c.url.includes("slack")).length, 1);
  assert.equal(calls.filter((c) => c.url.includes("brevo")).length, 1);
  assert.equal(await sendAlerts(T + 120_000), 0);
  assert.equal(calls.length, 2);
})));

test("more than 10 alerts are summarized", () => withDb(() => withFetch(async (calls) => {
  const o = owner();
  saveNotifySettings(o, { briefingHour: 7, alertsEmail: false, webhook: { kind: "generic", url: "https://example.com/h" } });
  for (let i = 0; i < 13; i++) recordAgentEvents(o, failing(`job${i}`), T);
  await sendAlerts(T + 60_000);
  assert.equal(calls.length, 11);
  assert.match(JSON.parse(calls[10].body).text, /and 3 more/);
  assert.equal((db().prepare("select count(*) as n from agent_runs where alerted_at is null").get() as { n: number }).n, 0);
})));

test("briefing is due once per day after the hour", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, failing("any"), T);
  const at = (h: number, m: number) => Date.UTC(2026, 10, 2, h - 1, m); // Berlin is UTC+1 in November
  assert.deepEqual(dueBriefingOwners(at(6, 59)), []);
  assert.deepEqual(dueBriefingOwners(at(7, 0)), [o]);
  markBriefed(o, at(7, 0));
  assert.deepEqual(dueBriefingOwners(at(7, 15)), []);
  assert.deepEqual(dueBriefingOwners(at(7, 0) + 86_400_000), [o]);
}));

test("accounts without agents get no briefing", () => withDb(() => {
  owner("empty@example.com");
  assert.deepEqual(dueBriefingOwners(Date.UTC(2026, 10, 2, 10)), []);
}));
