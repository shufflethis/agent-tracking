import { db } from "./db";
import { eventId } from "./measurement";
import { serverWindowDays } from "./plans";
import { mcpToolBreakdown } from "./server-ingest";

export type MCPEnvironment = "production" | "test";
export const MCP_WARNING_RULES = { minimumCalls: 20, minimumFailures: 3, failureRate: 0.1, minimumDurations: 20, p95Ms: 5000 } as const;
export type MCPMetric = ReturnType<typeof mcpMetrics>[number];

/** Query only after site authorization. All cohorts use receipt time and the same window. */
export function mcpMetrics(domain: string, days: number, environment: MCPEnvironment, now = Date.now()) {
  days = serverWindowDays(days);
  const timing =db().prepare(`with ranked as (
    select tool_name, plugin_version, duration_ms,
      row_number() over (partition by tool_name, plugin_version order by duration_ms) as rank,
      count(*) over (partition by tool_name, plugin_version) as samples
    from server_tool_calls where domain=? and environment=? and received_at between ? and ? and duration_ms is not null
  ) select tool_name as toolName, plugin_version as pluginVersion, max(samples) as durationSamples,
    max(case when rank = cast((95*samples+99)/100 as integer) then duration_ms end) as p95Ms
    from ranked group by tool_name, plugin_version`).all(domain.toLowerCase(), environment, now - days * 86_400_000, now) as { toolName: string; pluginVersion: string | null; durationSamples: number; p95Ms: number }[];
  return mcpToolBreakdown(domain, days, environment, now).map(row => {
    const latency = timing.find(t => t.toolName === row.toolName && t.pluginVersion === row.pluginVersion);
    return { ...row, failureRate: (row.failed + row.timedOut) / row.calls,
      unknownRate: row.unknown / row.calls, durationSamples: latency?.durationSamples ?? 0, p95Ms: latency?.p95Ms ?? null };
  });
}

export function mcpWarnings(rows: MCPMetric[]) {
  return rows.flatMap(row => {
    const warnings: { kind: "errors" | "latency"; metric: MCPMetric }[] = [];
    if (row.calls >= MCP_WARNING_RULES.minimumCalls && row.failed + row.timedOut >= MCP_WARNING_RULES.minimumFailures && row.failureRate >= MCP_WARNING_RULES.failureRate) warnings.push({ kind: "errors", metric: row });
    if (row.durationSamples >= MCP_WARNING_RULES.minimumDurations && row.p95Ms !== null && row.p95Ms >= MCP_WARNING_RULES.p95Ms) warnings.push({ kind: "latency", metric: row });
    return warnings;
  });
}

export type MCPInvocation = {
  invocationId: string; toolName: string; pluginVersion: string | null; environment: MCPEnvironment;
  occurredAt: number; receivedAt: number; durationMs: number | null; technicalOutcome: string;
  errorClass: string | null; actorKind: string; outcomeReceipts: number;
};
export function recentMCPInvocations(domain: string, days: number, environment: MCPEnvironment, now = Date.now()) {
  days = serverWindowDays(days);
  return db().prepare(`select t.invocation_id as invocationId, t.tool_name as toolName,
    t.plugin_version as pluginVersion, t.environment, t.occurred_at as occurredAt,
    t.received_at as receivedAt, t.duration_ms as durationMs, t.technical_outcome as technicalOutcome,
    t.error_class as errorClass, t.actor_kind as actorKind,
    (select count(*) from server_outcomes o where o.domain=t.domain and o.environment=t.environment
      and o.invocation_id=t.invocation_id and o.received_at<=?) as outcomeReceipts
    from server_tool_calls t where t.domain=? and t.environment=? and t.received_at between ? and ?
    order by t.received_at desc, t.invocation_id desc limit 50`).all(now, domain.toLowerCase(), environment, now - days * 86_400_000, now) as MCPInvocation[];
}

export function mcpInvocation(domain: string, invocationId: string, days: number, now = Date.now()) {
  if (!eventId(invocationId)) return null;
  days = serverWindowDays(days);
  const call = db().prepare(`select invocation_id as invocationId, tool_name as toolName,
    plugin_version as pluginVersion, environment, occurred_at as occurredAt, received_at as receivedAt,
    duration_ms as durationMs, technical_outcome as technicalOutcome, error_class as errorClass, actor_kind as actorKind
    from server_tool_calls where domain=? and invocation_id=? and received_at between ? and ?`)
    .get(domain.toLowerCase(), invocationId, now - days * 86_400_000, now) as Omit<MCPInvocation, "outcomeReceipts"> | undefined;
  if (!call) return null;
  // Show up to 100 receipts; missing and late reports never become inferred failures.
  const outcomes = db().prepare(`select receipt_id as receiptId, kind, status, occurred_at as occurredAt, received_at as receivedAt
    from server_outcomes where domain=? and environment=? and invocation_id=? and received_at<=?
    order by occurred_at, received_at, receipt_id limit 101`).all(domain.toLowerCase(), call.environment, invocationId, now) as { receiptId: string; kind: string; status: string; occurredAt: number; receivedAt: number }[];
  return { call, outcomes: outcomes.slice(0, 100), truncated: outcomes.length > 100 };
}
