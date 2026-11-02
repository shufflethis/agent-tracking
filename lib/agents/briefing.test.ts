import assert from "node:assert/strict";
import { test } from "node:test";
import { recordAgentEvents } from "./ingest";
import { briefingWorthSending, buildBriefing, renderBriefingMail } from "./briefing";
import type { AgentEvent } from "./types";
import { owner, withDb } from "./test-db";

const T = Date.UTC(2026, 10, 2, 1, 0); // 02:00 Berlin
let n = 0;
const cron = (name: string, exitCode: number, tail?: string): AgentEvent[] => {
  const run = (++n).toString(16).padStart(32, "0");
  const agent = { kind: "cron" as const, name, host: "server1" };
  return [
    { v: 1, id: `s${n}-xxxxxxxx`, type: "cron_start", at: T, agent, run },
    { v: 1, id: `e${n}-xxxxxxxx`, type: "cron_end", at: T + 1000, agent, run, exitCode, durationMs: 1000, ...(tail ? { tail } : {}) },
  ];
};

test("headline counts problems and quiet agents", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, [...cron("a", 1), ...cron("b", 2)], T);
  for (let i = 0; i < 9; i++) recordAgentEvents(o, cron(`ok${i}`, 0), T);
  const b = buildBriefing(o, T - 3_600_000, T + 3_600_000);
  assert.equal(b.problems.length, 2);
  assert.equal(b.quiet.length, 9);
  assert.equal(renderBriefingMail(b, "de", "https://x/app/fleet").subject, "2 Probleme, 9 Agents unauffällig");
  assert.equal(renderBriefingMail(b, "en", "https://x/app/fleet").subject, "2 problems, 9 agents quiet");
  const text = renderBriefingMail(b, "de", "https://x/app/fleet").text;
  assert.match(text, /a \(server1\): fehlgeschlagen um 02:00, Exit 1/);
}));

test("all quiet subject", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, cron("only", 0), T);
  const b = buildBriefing(o, T - 3_600_000, T + 3_600_000);
  assert.equal(renderBriefingMail(b, "de", "u").subject, "Alles ruhig: 1 Agent unauffällig");
  assert.equal(renderBriefingMail(b, "en", "u").subject, "All quiet: 1 agent ran fine");
}));

test("tail is escaped and trimmed to 5 lines", () => withDb(() => {
  const o = owner();
  recordAgentEvents(o, cron("x", 1, ["l1", "l2", "l3", "l4", "l5", "<script>alert(1)</script>"].join("\n")), T);
  const mail = renderBriefingMail(buildBriefing(o, T - 3_600_000, T + 3_600_000), "en", "u");
  assert.match(mail.html, /&lt;script&gt;/);
  assert.doesNotMatch(mail.html, /<script>/);
  assert.doesNotMatch(mail.text, /\bl1\b/);
  assert.match(mail.text, /l2/);
}));

test("no agents, no briefing", () => withDb(() => {
  const o = owner();
  assert.equal(briefingWorthSending(buildBriefing(o, T - 3_600_000, T + 3_600_000)), false);
  recordAgentEvents(o, cron("y", 0), T);
  assert.equal(briefingWorthSending(buildBriefing(o, T - 3_600_000, T + 3_600_000)), true);
}));

test("long loops count turns and tool calls inside the window only", () => withDb(() => {
  const o = owner();
  const agent = { kind: "claude" as const, name: "loop", host: "server1" };
  const run = "f".repeat(64);
  const DAY = 86_400_000;
  const e = (id: string, type: AgentEvent["type"], at: number, extra: Partial<AgentEvent> = {}): AgentEvent => ({ v: 1, id: `${id}-xxxxxxxx`, type, at, agent, run, ...extra });
  recordAgentEvents(o, [e("a", "session_start", T - 2 * DAY), e("b", "turn_end", T - 2 * DAY + 1), e("c", "tool_end", T - 2 * DAY + 2, { tool: "Bash", ok: true })], T - 2 * DAY + 3);
  recordAgentEvents(o, [e("d", "turn_end", T - 1000), e("f", "tool_end", T - 900, { tool: "Edit", ok: true }), e("g", "tool_end", T - 800, { tool: "Edit", ok: true })], T);
  const b = buildBriefing(o, T - DAY / 2, T + 1);
  const loop = [...b.problems, ...b.quiet].find((a) => a.name === "loop")!;
  assert.equal(loop.turns, 1);
  assert.equal(loop.toolCalls, 2);
}));
