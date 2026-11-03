import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { applyStatus, evaluateRun, missedDue, type AgentRow, type RunRow } from "./status";
import { owner, withDb } from "./test-db";

const T = 1_800_000_000_000;
const MIN = 60_000;
const H = 60 * MIN;
const claude = (lastEventType: RunRow["lastEventType"], openTools = 0): RunRow => ({ id: "r", agentKind: "claude", status: "running", endedAt: null, lastEventAt: T, lastEventType, openTools });

test("waiting loop never hangs", () => {
  assert.equal(evaluateRun(claude("turn_end"), T + 11 * H), null);
  assert.equal(evaluateRun(claude("waiting"), T + 11 * H), null);
  assert.equal(evaluateRun(claude("turn_end"), T + 13 * H), "close_ok");
});

test("a freshly opened session waits for input and never hangs", () => {
  assert.equal(evaluateRun(claude("session_start"), T + 5 * H), null);
  assert.equal(evaluateRun(claude("session_start"), T + 13 * H), "close_ok");
});

test("idle session hangs after 30 minutes", () => {
  assert.equal(evaluateRun(claude("tool_end"), T + 29 * MIN), null);
  assert.equal(evaluateRun(claude("tool_end"), T + 31 * MIN), "hung");
});

test("open tool waits 3 hours", () => {
  assert.equal(evaluateRun(claude("tool_start", 1), T + 2 * H + 59 * MIN), null);
  assert.equal(evaluateRun(claude("tool_start", 1), T + 3 * H + MIN), "hung");
});

test("only running runs are evaluated", () => {
  assert.equal(evaluateRun({ ...claude("tool_end"), status: "hung" }, T + 5 * H), null);
  assert.equal(evaluateRun({ ...claude("tool_end"), status: "ok", endedAt: T }, T + 5 * H), null);
});

test("cron run hangs after 24 hours", () => {
  const cron: RunRow = { ...claude("cron_start"), agentKind: "cron" };
  assert.equal(evaluateRun(cron, T + 23 * H), null);
  assert.equal(evaluateRun(cron, T + 25 * H), "hung");
});

test("missed cron fires once per due slot", () => {
  const a: AgentRow = { id: "a", kind: "cron", expectEveryMs: 24 * H, lastRunStartedAt: T - 24 * H - 2.5 * H, lastMissedAt: null };
  assert.equal(missedDue(a, T), true);
  assert.equal(missedDue({ ...a, lastRunStartedAt: T - 24 * H - 2.3 * H }, T), false);
  const hourly: AgentRow = { ...a, expectEveryMs: H, lastRunStartedAt: T - H - 16 * MIN };
  assert.equal(missedDue(hourly, T), true);
  assert.equal(missedDue({ ...hourly, lastRunStartedAt: T - H - 14 * MIN }, T), false);
  assert.equal(missedDue({ ...a, lastMissedAt: T - MIN }, T), false);
  // grace is 10% for long intervals: 7 days → 16.8 h
  const weekly: AgentRow = { ...a, expectEveryMs: 7 * 24 * H, lastRunStartedAt: T - 7 * 24 * H - 16 * H };
  assert.equal(missedDue(weekly, T), false);
});

test("missed without expectEveryMs is never due", () => {
  assert.equal(missedDue({ id: "a", kind: "cron", expectEveryMs: null, lastRunStartedAt: T - 100 * H, lastMissedAt: null }, T), false);
});

test("applyStatus writes hung, missed and closes waiting sessions once", () => withDb(() => {
  const o = owner();
  const base = { v: 1 as const, agent: { kind: "claude" as const, name: "p", host: "h" } };
  recordAgentEvents(o, [{ ...base, id: "s1-aaaaaaaa", type: "tool_end", tool: "Bash", ok: true, at: T, run: "1".repeat(32) }], T);
  recordAgentEvents(o, [{ ...base, id: "s2-aaaaaaaa", type: "turn_end", at: T, run: "2".repeat(32) }], T);
  const cron = { kind: "cron" as const, name: "backup", host: "h" };
  recordAgentEvents(o, [{ v: 1, agent: cron, id: "c1-aaaaaaaa", type: "cron_start", at: T, run: "3".repeat(32), expectEveryMs: H }], T);
  recordAgentEvents(o, [{ v: 1, agent: cron, id: "c2-aaaaaaaa", type: "cron_end", at: T + MIN, run: "3".repeat(32), exitCode: 0 }], T);
  const first = applyStatus(T + 13 * H);
  assert.equal(first.newlyHung.length, 1);
  assert.equal(first.newlyMissed.length, 1);
  const second = applyStatus(T + 13 * H + MIN);
  assert.deepEqual(second, { newlyHung: [], newlyMissed: [] });
  const statuses = (db().prepare("select run_key, status from agent_runs order by run_key").all() as { run_key: string; status: string }[]).map((r) => `${r.run_key.slice(0, 7)}:${r.status}`);
  assert.ok(statuses.includes(`${"1".repeat(7)}:hung`));
  assert.ok(statuses.includes(`${"2".repeat(7)}:ok`));
  assert.ok(statuses.some((s) => s.startsWith("missed:") && s.endsWith(":missed")));
}));
