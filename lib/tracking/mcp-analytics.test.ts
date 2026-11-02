import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MCPAnalyticsPanel from "../../components/MCPAnalyticsPanel";
import { addSite, closeDb, db, ensureAccount, pruneRaw } from "./db";
import { mcpInvocation, mcpMetrics, mcpWarnings, recentMCPInvocations, type MCPMetric } from "./mcp-analytics";
import { outcomeSummary, recordServerOutcome, recordServerToolCall, serverToolSummary } from "./server-ingest";

const now = Date.UTC(2026, 9, 1, 10);
const id = (n: number) => `invocation_0000000000_${n}`;
let old: string | undefined;
before(() => { old = process.env.TRACKING_DB; process.env.TRACKING_DB = ":memory:"; closeDb(); ensureAccount("mcp@example.com", now); addSite("a.example", "mcp@example.com", now); addSite("b.example", "mcp@example.com", now); });
after(() => { closeDb(); if (old === undefined) delete process.env.TRACKING_DB; else process.env.TRACKING_DB = old; });

const baseline = (): MCPMetric => ({ toolName: "quote", pluginVersion: "1", calls: 20, completed: 17, failed: 3, cancelled: 0, timedOut: 0, unknown: 0, avgMs: 10, pdfCreated: 0, pdfFetched: 0, businessResults: 0, failureRate: 0.15, unknownRate: 0, durationSamples: 20, p95Ms: 100 });

test("warnings enforce minimum sample, failure count and duration coverage", () => {
  assert.equal(mcpWarnings([baseline()])[0].kind, "errors");
  assert.equal(mcpWarnings([{ ...baseline(), calls: 19 }]).length, 0);
  assert.equal(mcpWarnings([{ ...baseline(), failed: 2, failureRate: .1 }]).length, 0);
  assert.equal(mcpWarnings([{ ...baseline(), failureRate: .09 }]).length, 0);
  const latency = { ...baseline(), failed: 0, failureRate: 0, p95Ms: 5000 };
  assert.equal(mcpWarnings([latency])[0].kind, "latency");
  assert.equal(mcpWarnings([{ ...latency, durationSamples: 19 }]).length, 0);
  assert.equal(mcpWarnings([{ ...latency, p95Ms: null }]).length, 0);
});

test("version cohorts and nearest-rank p95 exclude missing durations, other sites and environments", () => {
  for (let n = 1; n <= 20; n++) recordServerToolCall("a.example", { invocationId: id(n), toolName: "quote", pluginVersion: "1", technicalOutcome: n <= 3 ? "failed" : "completed", actorKind: "unknown", durationMs: n * 100, occurredAt: now }, now);
  recordServerToolCall("a.example", { invocationId: id(21), toolName: "quote", pluginVersion: "1", technicalOutcome: "unknown", actorKind: "unknown", occurredAt: now }, now);
  recordServerToolCall("a.example", { invocationId: id(22), toolName: "quote", pluginVersion: "2", technicalOutcome: "completed", actorKind: "unknown", durationMs: 8000, occurredAt: now }, now);
  recordServerToolCall("a.example", { invocationId: id(23), toolName: "quote", pluginVersion: "1", technicalOutcome: "failed", actorKind: "unknown", durationMs: 999999, environment: "test", occurredAt: now }, now);
  recordServerToolCall("b.example", { invocationId: id(1), toolName: "quote", pluginVersion: "1", technicalOutcome: "failed", actorKind: "unknown", durationMs: 999999, occurredAt: now }, now);
  recordServerToolCall("a.example", { invocationId: id(24), toolName: "quote", pluginVersion: "1", technicalOutcome: "failed", actorKind: "unknown", durationMs: 999999, occurredAt: now - 2 * 86400000 }, now - 2 * 86400000);
  const rows = mcpMetrics("a.example", 1, "production", now);
  const one = rows.find(row => row.pluginVersion === "1")!;
  assert.equal(one.calls, 21); assert.equal(one.durationSamples, 20); assert.equal(one.p95Ms, 1900);
  assert.equal(one.unknown, 1); assert.equal(one.failureRate, 3 / 21);
  assert.equal(rows.find(row => row.pluginVersion === "2")!.p95Ms, 8000);
  assert.equal(mcpWarnings(rows).length, 1);
  assert.equal(mcpMetrics("a.example", 1, "test", now)[0].calls, 1);
});

test("timeline uses exact site and environment links, tolerates out-of-order receipts and respects window", () => {
  const invocationId = id(31), taskId = "conversation_1234567890";
  recordServerOutcome("a.example", { receiptId: "receipt_000000000001", kind: "pdf_created", status: "confirmed", occurredAt: now - 1000, invocationId }, now - 500);
  recordServerOutcome("a.example", { receiptId: "receipt_000000000002", kind: "pdf_fetched", status: "confirmed", occurredAt: now, invocationId }, now);
  recordServerOutcome("a.example", { receiptId: "receipt_000000000003", kind: "pdf_fetched", status: "confirmed", occurredAt: now, invocationId, environment: "test" }, now);
  recordServerOutcome("b.example", { receiptId: "receipt_000000000004", kind: "pdf_fetched", status: "confirmed", occurredAt: now, invocationId }, now);
  recordServerOutcome("a.example", { receiptId: "receipt_000000000005", kind: "booking_created", status: "confirmed", occurredAt: now, taskId }, now);
  recordServerToolCall("a.example", { invocationId, taskId, toolName: "pdf", technicalOutcome: "completed", actorKind: "unknown", occurredAt: now - 900 }, now);
  const detail = mcpInvocation("a.example", invocationId, 1, now)!;
  assert.deepEqual(detail.outcomes.map(o => o.kind), ["pdf_created", "pdf_fetched"]);
  assert.equal(mcpInvocation("b.example", invocationId, 1, now), null);
  assert.equal(mcpInvocation("a.example", "invalid", 1, now), null);
  assert.equal(mcpInvocation("a.example", id(24), 1, now), null);
  assert.equal(recentMCPInvocations("a.example", 1, "production", now).find(row => row.invocationId === invocationId)!.outcomeReceipts, 2);
  assert.equal(mcpMetrics("a.example", 1, "production", now).find(row => row.toolName === "pdf")!.businessResults, 0);
});

test("future receipts are excluded from current cohort outcomes", () => {
  recordServerOutcome("a.example", { receiptId: "future_receipt_000001", kind: "pdf_created", status: "confirmed", occurredAt: now + 1000, invocationId: id(1) }, now + 1000);
  assert.equal(mcpMetrics("a.example", 1, "production", now).find(row => row.pluginVersion === "1")!.pdfCreated, 0);
});

test("comparison does not silently substitute requested missing versions or compare the same version", () => {
  const rows = [baseline(), { ...baseline(), pluginVersion: "2", calls: 5 }];
  const panel = (before: string, after: string) => renderToStaticMarkup(createElement(MCPAnalyticsPanel, { domain: "a.example", days: 30, environment: "production", rows, recent: [], lang: "en", tool: "quote", before, after }));
  assert.ok(panel("1", "2").includes("Unknown technical outcome"));
  assert.ok(panel("missing", "2").includes("Two different known versions"));
  assert.ok(panel("1", "1").includes("Two different known versions"));
});

test("server-reported calls and receipts expire with raw retention and views never reach past it", () => {
  const site = "retention.example";
  addSite(site, "mcp@example.com", now);
  const day = 86_400_000;
  const oldAt = now - 91 * day, freshAt = now - 10 * day;
  recordServerToolCall(site, { invocationId: id(31), toolName: "quote", technicalOutcome: "completed", actorKind: "unknown", occurredAt: oldAt }, oldAt);
  recordServerToolCall(site, { invocationId: id(32), toolName: "quote", technicalOutcome: "completed", actorKind: "unknown", occurredAt: freshAt }, freshAt);
  recordServerOutcome(site, { receiptId: "retention_old_receipt1", kind: "pdf_created", status: "confirmed", occurredAt: oldAt, invocationId: id(31) }, oldAt);
  recordServerOutcome(site, { receiptId: "retention_new_receipt1", kind: "pdf_created", status: "confirmed", occurredAt: freshAt, invocationId: id(32) }, freshAt);
  // A 365-day plan window is clamped to retention even before the daily prune runs.
  assert.equal(mcpMetrics(site, 365, "production", now).reduce((n, row) => n + row.calls, 0), 1);
  assert.equal(serverToolSummary(site, 365, now).reports, 1);
  assert.equal(outcomeSummary(site, 365, now).reports, 1);
  pruneRaw(now);
  const count = (table: string) => (db().prepare(`select count(*) as n from ${table} where domain=?`).get(site) as { n: number }).n;
  assert.equal(count("server_tool_calls"), 1);
  assert.equal(count("server_outcomes"), 1);
});
