import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { parseAgentBatch, recordAgentEvents } from "./ingest";
import { runTimeline, checkComparisons } from "./store";
import { checkLabel, runLabel } from "./run-display";
import { owner, withDb } from "./test-db";

const now = Date.now();
const agent = { kind: "cron" as const, name: "evaluation", host: "fixture" };
test("version comparisons and timelines are owner-scoped and checks require explicit metadata", () => withDb(() => {
  const o = owner();
  for (const [i, version, exitCode] of [[1, "v1", 1], [2, "v2", 0], [3, null, 0]] as const) {
    const parsed = parseAgentBatch({ events: [{ v: 1, id: `event-000${i}`, type: "cron_end", at: now, agent, run: String(i).repeat(32), exitCode, durationMs: 10, checkName: version ? "booking" : undefined, checkVersion: version }] }, now)!;
    recordAgentEvents(o, parsed.events, now);
  }
  const rows = db().prepare("select id, agent_id from agent_runs order by run_key").all() as { id: string; agent_id: string }[];
  const first = rows[0];
  assert.equal(runTimeline("other@example.com", first.agent_id, first.id), null);
  assert.deepEqual(checkComparisons("other@example.com", first.agent_id), []);
  const result = checkComparisons(o, first.agent_id, now).sort((a, b) => a.version.localeCompare(b.version));
  assert.deepEqual(result.map(r => [r.version, r.passed, r.samples]), [["v1", 0, 1], ["v2", 1, 1]]);
  const unchecked = runTimeline(o, first.agent_id, rows[2].id)!;
  assert.equal(checkLabel(unchecked.run, "de"), "Ungeprüft");
  assert.equal(runLabel(unchecked.run, "de"), "Beendet");
  assert.equal(runTimeline(o, first.agent_id, first.id, 200)?.events.length, 0);
}));

test("timeline computes duration only for matched tool IDs and exposes recovered errors", () => withDb(() => {
  const o = owner(); const callId = "a".repeat(64);
  const events = [
    { type: "tool_end", at: now + 50, tool: "Bash", callId, ok: false },
    { type: "tool_start", at: now, tool: "Bash", callId },
    { type: "session_end", at: now + 60 },
  ].map((e, i) => ({ v: 1, id: `event-000${i}`, agent: { ...agent, kind: "claude" }, run: "b".repeat(32), ...e }));
  recordAgentEvents(o, parseAgentBatch({ events }, now)!.events, now);
  const row = db().prepare("select id, agent_id from agent_runs").get() as { id: string; agent_id: string };
  const result = runTimeline(o, row.agent_id, row.id)!;
  assert.equal(result.events[1].durationMs, 50);
  assert.equal(runLabel(result.run, "de"), "Mit Toolfehlern beendet");
  assert.equal(checkLabel(result.run, "de"), "Ungeprüft");
}));
