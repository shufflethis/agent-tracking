import assert from "node:assert/strict";
import { test } from "node:test";
import { db, monthKey } from "../tracking/db";
import { parseAgentBatch, recordAgentEvents } from "./ingest";
import type { AgentEvent } from "./types";
import { owner, withDb } from "./test-db";

const NOW = Date.UTC(2026, 10, 2, 3, 0);
const RUN = "a".repeat(64);
let n = 0;
const ev = (type: AgentEvent["type"], extra: Partial<AgentEvent> = {}): AgentEvent => ({
  v: 1, id: `e${++n}-${"0".repeat(8)}`, type, at: NOW + n, agent: { kind: "claude", name: "agent-tracking", host: "server1" }, run: RUN, ...extra,
});
const run = () => db().prepare("select * from agent_runs").get() as Record<string, unknown>;

test("allowlist drops unknown and sensitive fields", () => withDb(() => {
  const o = owner();
  const raw = { events: [{ ...ev("tool_end", { tool: "Bash", ok: true }), tool_input: { command: "cat /root/secret" }, prompt: "my prompt", transcript_path: "/root/.claude/x.jsonl", cwd: "/root/secret" }] };
  const parsed = parseAgentBatch(raw, NOW);
  assert.ok(parsed);
  assert.equal(parsed.events.length, 1);
  assert.equal(JSON.stringify(parsed.events).includes("secret"), false);
  recordAgentEvents(o, parsed.events, NOW);
  const dump = JSON.stringify([db().prepare("select * from agent_events").all(), db().prepare("select * from agent_runs").all(), db().prepare("select * from agents").all()]);
  assert.doesNotMatch(dump, /secret|tool_input|prompt|transcript/);
}));

test("invalid events are dropped one by one", () => withDb(() => {
  const parsed = parseAgentBatch({ events: [ev("session_start"), { ...ev("tool_start"), tool: "rm -rf /" }, { ...ev("session_start"), run: "short" }, { type: "nope" }] }, NOW);
  assert.ok(parsed);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.dropped, 3);
}));

test("events outside the time window are dropped, not restamped", () => withDb(() => {
  const parsed = parseAgentBatch({ events: [ev("session_start", { at: NOW + 3_600_000 }), ev("turn_end", { at: NOW - 8 * 86_400_000 }), ev("turn_end", { at: NOW - 1000 })] }, NOW);
  assert.deepEqual(parsed?.events.map((e) => e.at), [NOW - 1000]);
  assert.equal(parsed?.dropped, 2);
}));

test("a duplicate id inside one batch is ignored, not a 500", () => withDb(() => {
  const o = owner();
  const e = ev("session_start");
  const r = recordAgentEvents(o, [e, e, ev("turn_end")], NOW);
  assert.equal(r.accepted, 2);
  assert.equal(r.duplicates, 1);
}));

test("a resumed session after its end starts a new run", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, [ev("session_start"), ev("turn_end"), ev("session_end")], NOW);
  recordAgentEvents(o, [ev("session_start"), ev("tool_start", { tool: "Bash" })], NOW);
  const runs = db().prepare("select status, open_tools, ended_at from agent_runs order by started_at, rowid").all() as { status: string; open_tools: number; ended_at: number | null }[];
  assert.equal(runs.length, 2);
  assert.equal(runs[0].status, "ok");
  assert.deepEqual([runs[1].status, runs[1].open_tools, runs[1].ended_at], ["running", 1, null]);
}));

test("duplicate ids are ignored", () => withDb(() => {
  const o = owner();
  const batch = [ev("session_start"), ev("tool_start", { tool: "Edit" }), ev("tool_end", { tool: "Edit", ok: true })];
  assert.equal(recordAgentEvents(o, batch, NOW).accepted, 3);
  const again = recordAgentEvents(o, batch, NOW);
  assert.equal(again.duplicates, 3);
  assert.equal(again.accepted, 0);
  assert.equal(run().tool_calls, 1);
  assert.equal((db().prepare("select count from agent_usage").get() as { count: number }).count, 3);
}));

test("out of order events keep counters sane", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, [ev("tool_end", { tool: "Bash", ok: false })], NOW);
  assert.equal(run().open_tools, 0);
  assert.equal(run().tool_errors, 1);
  assert.equal(run().status, "running");
  recordAgentEvents(o, [ev("session_end")], NOW);
  recordAgentEvents(o, [ev("tool_start", { tool: "Bash" })], NOW);
  assert.equal(run().status, "ok");
  assert.ok(run().ended_at);
  assert.equal(run().open_tools, 0);
}));

test("a late event does not overwrite the newer last event type", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, [ev("turn_end", { at: NOW })], NOW);
  recordAgentEvents(o, [ev("tool_start", { tool: "Bash", at: NOW - 60_000 })], NOW);
  assert.equal(run().last_event_type, "turn_end");
  assert.equal(run().last_event_at, NOW);
}));

test("a hung run comes back to running on new activity", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, [ev("session_start")], NOW);
  db().prepare("update agent_runs set status = 'hung', alerted_at = 1").run();
  recordAgentEvents(o, [ev("turn_end")], NOW);
  assert.equal(run().status, "running");
  assert.equal(run().alerted_at, null);
}));

test("cron_end sets status from exit code", () => withDb(() => {
  const o = owner();
  const cron = { kind: "cron" as const, name: "backup", host: "server1" };
  recordAgentEvents(o, [ev("cron_start", { agent: cron, run: "b".repeat(32), expectEveryMs: 86_400_000 }), ev("cron_end", { agent: cron, run: "b".repeat(32), exitCode: 0, durationMs: 1200 })], NOW);
  recordAgentEvents(o, [ev("cron_end", { agent: cron, run: "c".repeat(32), exitCode: 2, durationMs: 50, tail: "disk full" })], NOW);
  const runs = db().prepare("select run_key, status, exit_code, duration_ms, tail from agent_runs order by run_key").all() as Record<string, unknown>[];
  assert.deepEqual(runs.map((r) => [r.status, r.exit_code]), [["ok", 0], ["failed", 2]]);
  assert.equal(runs[1].tail, "disk full");
  assert.equal((db().prepare("select expect_every_ms from agents").get() as { expect_every_ms: number }).expect_every_ms, 86_400_000);
  assert.deepEqual({ ...(db().prepare("select runs, failed from agent_daily").get() as object) }, { runs: 2, failed: 1 });
}));

test("51st agent is rejected", () => withDb(() => {
  const o = owner();
  for (let i = 0; i < 50; i++) recordAgentEvents(o, [ev("session_start", { agent: { kind: "claude", name: `p${i}`, host: "h" } })], NOW);
  const r = recordAgentEvents(o, [ev("session_start", { agent: { kind: "claude", name: "p50", host: "h" } })], NOW);
  assert.equal(r.rejected, "agent_limit");
  assert.equal((db().prepare("select count(*) as n from agents").get() as { n: number }).n, 50);
  assert.equal(recordAgentEvents(o, [ev("turn_end", { agent: { kind: "claude", name: "p3", host: "h" } })], NOW).rejected, null);
}));

test("quota stops at 50000", () => withDb(() => {
  const o = owner();
  db().prepare("insert into agent_usage (owner, month, count) values (?, ?, 49999)").run(o, monthKey(NOW));
  assert.equal(recordAgentEvents(o, [ev("session_start")], NOW).rejected, null);
  assert.equal(recordAgentEvents(o, [ev("turn_end")], NOW).rejected, "quota");
}));

test("parseAgentBatch rejects more than 100 events and non-arrays", () => {
  assert.equal(parseAgentBatch({ events: Array.from({ length: 101 }, () => ev("turn_end")) }, NOW), null);
  assert.equal(parseAgentBatch({ events: "x" }, NOW), null);
  assert.equal(parseAgentBatch(null, NOW), null);
});
