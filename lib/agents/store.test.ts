import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { agentRuns, getNotifySettings, listAgents, medianDurationMs, saveNotifySettings } from "./store";
import type { AgentEvent } from "./types";
import { owner, withDb } from "./test-db";

const T = 1_800_000_000_000;
const D = 86_400_000;
let n = 0;
const cronRun = (name: string, at: number, exitCode: number, durationMs = 1000): AgentEvent[] => {
  const run = (++n).toString(16).padStart(32, "0");
  const agent = { kind: "cron" as const, name, host: "h" };
  return [
    { v: 1, id: `s${n}-xxxxxxxx`, type: "cron_start", at, agent, run },
    { v: 1, id: `e${n}-xxxxxxxx`, type: "cron_end", at: at + durationMs, agent, run, exitCode, durationMs },
  ];
};

test("agents are isolated per owner", () => withDb(() => {
  const a = owner("a@example.com");
  const b = owner("b@example.com");
  recordAgentEvents(a, cronRun("job-a", T, 0), T);
  recordAgentEvents(b, cronRun("job-b", T, 0), T);
  assert.deepEqual(listAgents(a).map((x) => x.name), ["job-a"]);
  const bAgent = listAgents(b)[0].id;
  assert.equal(agentRuns(a, bAgent), null);
  assert.equal(agentRuns(b, bAgent)?.length, 1);
}));

test("problems sort first", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, cronRun("fine", T + 1000, 0), T);
  recordAgentEvents(o, cronRun("broken", T, 1), T);
  const list = listAgents(o, T + 5000);
  assert.deepEqual(list.map((x) => [x.name, x.health]), [["broken", "problem"], ["fine", "ok"]]);
}));

test("idle after 7 days without activity", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, cronRun("old", T, 0), T);
  assert.equal(listAgents(o, T + 8 * D)[0].health, "idle");
}));

test("median over 14 days ignores running runs", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, cronRun("j", T - 20 * D, 0, 99_000), T - 20 * D + 1);
  recordAgentEvents(o, cronRun("j", T - 3 * D, 0, 1000), T);
  recordAgentEvents(o, cronRun("j", T - 2 * D, 0, 3000), T);
  recordAgentEvents(o, cronRun("j", T - 1 * D, 0, 2000), T);
  db().prepare("insert into agent_runs (id, agent_id, run_key, started_at, status, last_event_at, last_event_type) select 'open', id, 'open', ?, 'running', ?, 'cron_start' from agents").run(T, T);
  const id = listAgents(o, T)[0].id;
  assert.equal(medianDurationMs(id, 14, T), 2000);
}));

test("webhook must be https and telegram needs a bot token", () => withDb(() => {
  const o = owner();
  assert.equal(getNotifySettings(o).briefingHour, 7);
  assert.equal(getNotifySettings(o).webhook, null);
  assert.equal(saveNotifySettings(o, { briefingHour: 6, alertsEmail: true, webhook: { kind: "slack", url: "http://hooks.slack.com/x" } }), "invalid_url");
  assert.equal(saveNotifySettings(o, { briefingHour: 6, alertsEmail: true, webhook: { kind: "telegram", url: "nope", chatId: "1" } }), "invalid_url");
  assert.equal(saveNotifySettings(o, { briefingHour: 6, alertsEmail: false, webhook: { kind: "telegram", url: `123456:${"A".repeat(35)}`, chatId: "-1001" } }), "ok");
  const s = getNotifySettings(o);
  assert.equal(s.briefingHour, 6);
  assert.equal(s.alertsEmail, false);
  assert.equal(s.webhook?.chatId, "-1001");
  assert.equal(saveNotifySettings(o, { briefingHour: 24, alertsEmail: true, webhook: null }), "invalid_hour");
}));

test("slack and discord webhooks must point at their own hosts, generic not at other ports", () => withDb(() => {
  const o = owner();
  const save = (kind: "slack" | "discord" | "generic", url: string) => saveNotifySettings(o, { briefingHour: 7, alertsEmail: true, webhook: { kind, url } });
  assert.equal(save("slack", "https://internal.example/hooks.slack.com"), "invalid_url");
  assert.equal(save("discord", "https://discord.com.evil.example/api/webhooks/1"), "invalid_url");
  assert.equal(save("generic", "https://localhost:3200/api/admin/x"), "invalid_url");
  assert.equal(save("slack", "https://hooks.slack.com/services/T/B/x"), "ok");
}));
