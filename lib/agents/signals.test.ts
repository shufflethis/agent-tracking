import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { sendAlerts } from "./notify";
import { configChanges, LEARNING_MS, signalText } from "./signals";
import type { Snapshot } from "./snapshot";
import { saveNotifySettings } from "./store";
import type { AgentEvent } from "./types";
import { owner, proOwner, withDb } from "./test-db";

const T0 = Date.UTC(2026, 11, 1, 8, 0);
const hex = (c: string) => c.repeat(64);
const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  fingerprint: hex("a"), cliVersion: "0.3.0", nodeVersion: "22.0.0",
  files: [{ scope: "user_settings", state: "present", fingerprint: hex("1") }, { scope: "project_instructions", state: "missing" }],
  mcpServers: 2, plugins: 1, allowRules: 4, askRules: 0, denyRules: 3, ...over,
});
let n = 0;
const agent = { kind: "claude" as const, name: "booking", host: "server1" };
const ev = (type: AgentEvent["type"], at: number, extra: Partial<AgentEvent> = {}): AgentEvent =>
  ({ v: 1, id: `s${++n}-${"0".repeat(8)}`, type, at, agent, run: (Math.floor(at / 3_600_000)).toString(16).padStart(16, "0"), ...extra });
const signals = () => db().prepare("select kind, key, payload from agent_signals order by at").all() as { kind: string; key: string; payload: string }[];

test("configChanges lists counts and files that differ", () => {
  const next = snap({ fingerprint: hex("b"), mcpServers: 3, denyRules: 1, files: [{ scope: "user_settings", state: "present", fingerprint: hex("2") }, { scope: "project_instructions", state: "present", fingerprint: hex("3") }] });
  assert.deepEqual(configChanges(snap(), next), [
    { field: "mcpServers", from: 2, to: 3 }, { field: "denyRules", from: 3, to: 1 },
    { file: "user_settings", change: "changed" }, { file: "project_instructions", change: "added" },
  ]);
  assert.equal(signalText("config_change", { changes: configChanges(snap(), next) }, "en"), "configuration changed: MCP servers 2 → 3, deny rules 3 → 1, user settings changed, CLAUDE.md added");
  assert.match(signalText("new_tool", { tool: "WebFetch" }, "de"), /zum ersten Mal das Tool WebFetch/);
});

test("a changed snapshot becomes one signal on Pro, the first snapshot none", () => withDb(() => {
  const o = proOwner();
  recordAgentEvents(o, [ev("session_start", T0, { snapshot: snap() })], T0);
  assert.equal(signals().length, 0, "no previous snapshot, nothing to compare");
  recordAgentEvents(o, [ev("session_start", T0 + 7_200_000, { snapshot: snap() })], T0 + 7_200_000);
  assert.equal(signals().length, 0, "unchanged");
  const changed = snap({ fingerprint: hex("c"), mcpServers: 5 });
  recordAgentEvents(o, [ev("session_start", T0 + 14_400_000, { snapshot: changed })], T0 + 14_400_000);
  recordAgentEvents(o, [ev("config_snapshot", T0 + 14_400_001, { snapshot: changed })], T0 + 14_400_001);
  const s = signals();
  assert.equal(s.length, 1);
  assert.equal(s[0].kind, "config_change");
  assert.deepEqual(JSON.parse(s[0].payload), { changes: [{ field: "mcpServers", from: 2, to: 5 }] });
}));

test("Free accounts get no signals once pricing has started", () => withDb(() => {
  const o = owner();
  const started = T0 - 86_400_000;
  recordAgentEvents(o, [ev("session_start", T0, { snapshot: snap() })], T0, started);
  recordAgentEvents(o, [ev("session_start", T0 + 7_200_000, { snapshot: snap({ fingerprint: hex("d"), plugins: 9 }) })], T0 + 7_200_000, started);
  assert.equal(signals().length, 0);
}));

test("a first-time tool is a signal only after the learning period", () => withDb(() => {
  const o = proOwner();
  const calls = (tool: string, at: number, count: number) => Array.from({ length: count }, (_, i) => ev("tool_end", at + i, { tool, ok: true }));
  recordAgentEvents(o, [ev("session_start", T0), ...calls("Bash", T0 + 1, 25)], T0);
  recordAgentEvents(o, calls("WebFetch", T0 + 3_600_000, 1), T0 + 3_600_000);
  assert.equal(signals().length, 0, "still learning: agent younger than three days");

  const later = T0 + LEARNING_MS + 3_600_000;
  recordAgentEvents(o, [...calls("Bash", later, 2), ...calls("Edit", later + 10, 2)], later);
  const s = signals();
  assert.deepEqual(s.map((x) => [x.kind, x.key]), [["new_tool", "Edit"]], "Bash is known, WebFetch was seen while learning, Edit is new and reported once");
}));

test("signals go out with the alerts once and are then marked", () => withDb(async () => {
  const o = proOwner();
  saveNotifySettings(o, { briefingHour: 7, alertsEmail: false, webhook: { kind: "slack", url: "https://hooks.slack.com/x" } });
  recordAgentEvents(o, [ev("session_start", T0, { snapshot: snap() })], T0);
  recordAgentEvents(o, [ev("session_start", T0 + 7_200_000, { snapshot: snap({ fingerprint: hex("e"), denyRules: 0 }) })], T0 + 7_200_000);
  const calls: { url: string; body: string }[] = [];
  const post = async (req: { url: string; body: string }) => { calls.push(req); return true; };
  assert.equal(await sendAlerts(T0 + 7_300_000, post), 1);
  assert.match(JSON.parse(calls[0].body).text, /booking \(server1\): configuration changed: deny rules 3 → 0/);
  assert.equal(await sendAlerts(T0 + 7_400_000, post), 0);
  assert.equal(calls.length, 1);
}));
