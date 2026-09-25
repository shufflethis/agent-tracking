import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveInsights, type InsightInput } from "./insights";
import type { ToolStat } from "./dashboard";
import type { TaskRun } from "./task-runs";
const now = Date.UTC(2026, 8, 25, 12);
const base = (): InsightInput => ({ domain: "client.example", lang: "en", days: 30, now, owner: true, state: "active", quotaGaps: 0, tools: [], attempts: [], outcomes: { reports: 0, failed: 0 }, goalAttempts: 0, outcomeConfigured: false, runs: [], findings: [] });
const tool = (patch: Partial<ToolStat>): ToolStat => ({ name: "inquiry", calls: 10, errors: 0, successRate: 1, completionRate: null, completed: 0, failed: 0, cancelled: 0, timedOut: 0, unknownOutcome: 0, avgMs: 10, simulated: 0, declarative: false, registered: true, captureMode: "wrapped", neverCalled: false, lastSeen: now, topErrors: [], ...patch });
const run = (patch: Partial<TaskRun>): TaskRun => ({ domain: "client.example", runId: "run_1234567890123456", taskKind: "inquiry_form", targetUrl: "https://test.client.example/contact", mode: "deterministic_browser", status: "finished", startedAt: now-1000, finishedAt: now-900, deadlineAt: now, result: "failed", steps: [], errorClass: "test_form_missing", releaseId: null, toolVersion: null, schemaVersion: null, modelVersion: null, synthetic: true, ...patch });

test("quiet, synthetic-only, cancelled and unknown calls do not become business failures", () => {
  assert.deepEqual(deriveInsights(base()), []);
  assert.deepEqual(deriveInsights({ ...base(), tools: [tool({ calls: 0, simulated: 50, cancelled: 2, unknownOutcome: 3 })] }), []);
});
test("missing outcome evidence is setup, never a lost lead or conversion rate", () => {
  const items = deriveInsights({ ...base(), goalAttempts: 4 });
  assert.equal(items.length, 1); assert.equal(items[0].priority, "setup");
  assert.match(items[0].boundary, /unknown/);
  assert.equal(deriveInsights({ ...base(), goalAttempts: 4, outcomeConfigured: true, outcomes: { reports: 1, failed: 0 } }).length, 0);
});
test("overlapping legacy and classified tool errors are not added together", () => {
  const items = deriveInsights({ ...base(), tools: [tool({ errors: 3, failed: 2, timedOut: 1 })], quotaGaps: 1 });
  assert.equal(items[0].id, "quota");
  assert.match(items[1].evidence, /^3 error/);
});
test("only verified denied crawler GET requests become access investigations", () => {
  const attempt = { result: "denied", resource: "html", method: "GET", identityStatus: "verified", status: 403, count: 2 };
  assert.equal(deriveInsights({ ...base(), attempts: [{ ...attempt, identityStatus: "unavailable" }] }).length, 0);
  assert.equal(deriveInsights({ ...base(), attempts: [{ ...attempt, method: "POST" }] }).length, 0);
  const items = deriveInsights({ ...base(), attempts: [attempt, { ...attempt, status: 429 }] });
  assert.match(items[0].evidence, /^4 GET/); assert.match(items[0].boundary, /intentional/);
});
test("a later pass clears the same task failure but not a different target", () => {
  const failed = run({});
  const passed = run({ runId: "run_pass_123456789012", startedAt: now-100, result: "passed" });
  assert.equal(deriveInsights({ ...base(), runs: [failed, passed] }).length, 0);
  assert.equal(deriveInsights({ ...base(), runs: [failed, { ...passed, targetUrl: "https://test.client.example/other" }] }).length, 1);
  assert.equal(deriveInsights({ ...base(), runs: [run({ startedAt: now-31*86400000 })] }).length, 0);
});
test("reader setup actions do not link to owner-only settings; both languages keep the same rules", () => {
  const input = { ...base(), state: "not_configured" as const, owner: false, goalAttempts: 2, tools: [tool({ errors: 1 })] };
  const en = deriveInsights(input), de = deriveInsights({ ...input, lang: "de" });
  assert.deepEqual(en.map(i => i.id), de.map(i => i.id));
  assert.ok(de.every(i => !i.href.endsWith("/settings")));
  assert.equal(de.find(i => i.id === "source")?.href, "/de/docs");
});
