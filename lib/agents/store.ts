import { db, monthKey } from "../tracking/db";
import { webhookHostAllowed } from "./safe-url";
import type { RunRow } from "./status";
import type { AgentKind, RunStatus } from "./types";

/**
 * Read model for the fleet dashboard and the briefing, plus the per-account
 * notification settings. Ownership is checked here, not in the pages, so a
 * page cannot forget it.
 */

const IDLE_AFTER_MS = 7 * 86_400_000;
const PROBLEM: RunStatus[] = ["failed", "hung", "missed"];

export type AgentHealth = "ok" | "running" | "problem" | "idle";
export type AgentSummary = {
  id: string; kind: AgentKind; name: string; host: string; lastSeen: number; health: AgentHealth;
  lastRun: { status: RunStatus; startedAt: number; endedAt: number | null; toolErrors: number; dataLoss: number; lastEventType: RunRow["lastEventType"]; endReason: string | null } | null;
};

const HEALTH_ORDER: Record<AgentHealth, number> = { problem: 0, running: 1, ok: 2, idle: 3 };

export function listAgents(owner: string, now = Date.now()): AgentSummary[] {
  const rows = db().prepare(
    `select a.id, a.kind, a.name, a.host, a.last_seen,
       r.status as run_status, r.started_at as run_started, r.ended_at as run_ended, r.tool_errors, r.data_loss, r.last_event_type, r.end_reason
     from agents a
     left join agent_runs r on r.id = (select id from agent_runs where agent_id = a.id order by started_at desc, rowid desc limit 1)
     where a.owner = ?`,
  ).all(owner) as { id: string; kind: AgentKind; name: string; host: string; last_seen: number; run_status: RunStatus | null; run_started: number | null; run_ended: number | null; tool_errors: number; data_loss: number; last_event_type: RunRow["lastEventType"]; end_reason: string | null }[];
  return rows
    .map((r): AgentSummary => {
      const lastRun = r.run_status ? { status: r.run_status, startedAt: r.run_started!, endedAt: r.run_ended, toolErrors: r.tool_errors, dataLoss: r.data_loss, lastEventType: r.last_event_type, endReason: r.end_reason } : null;
      const health: AgentHealth = lastRun && (PROBLEM.includes(lastRun.status) || lastRun.toolErrors > 0 || lastRun.dataLoss > 0) ? "problem"
        : now - r.last_seen > IDLE_AFTER_MS ? "idle"
        : lastRun?.status === "running" ? "running" : "ok";
      return { id: r.id, kind: r.kind, name: r.name, host: r.host, lastSeen: r.last_seen, health, lastRun };
    })
    .sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || b.lastSeen - a.lastSeen);
}

export type RunDetail = RunRow & {
  configJson: string | null;
  dataLoss: number; endReason: string | null; checkName: string | null; checkVersion: string | null; checkPassed: number | null;
  startedAt: number; exitCode: number | null; durationMs: number | null; toolCalls: number; toolErrors: number; turns: number; tail: string | null;
};

const RUN_COLUMNS = `r.id, a.kind as agentKind, r.status, r.ended_at as endedAt, r.last_event_at as lastEventAt, r.last_event_type as lastEventType,
  r.open_tools as openTools, r.started_at as startedAt, r.exit_code as exitCode, r.duration_ms as durationMs, r.tool_calls as toolCalls,
  r.tool_errors as toolErrors, r.turns, r.tail, r.data_loss as dataLoss, r.end_reason as endReason, r.check_name as checkName, r.check_version as checkVersion, r.check_passed as checkPassed, r.config_json as configJson`;

export function agentById(owner: string, agentId: string): { id: string; kind: AgentKind; name: string; host: string; expectEveryMs: number | null } | null {
  const row = db().prepare("select id, kind, name, host, expect_every_ms from agents where id = ? and owner = ?").get(agentId, owner) as
    | { id: string; kind: AgentKind; name: string; host: string; expect_every_ms: number | null }
    | undefined;
  return row ? { id: row.id, kind: row.kind, name: row.name, host: row.host, expectEveryMs: row.expect_every_ms } : null;
}

export function agentRuns(owner: string, agentId: string, limit = 50): RunDetail[] | null {
  if (!agentById(owner, agentId)) return null;
  return db().prepare(`select ${RUN_COLUMNS} from agent_runs r join agents a on a.id = r.agent_id where r.agent_id = ? order by r.started_at desc limit ?`).all(agentId, limit) as RunDetail[];
}

export type BriefingRun = RunDetail & { agentId: string; agentName: string; host: string };

/** Runs that started, or changed status, in [from, to). */
export function runsBetween(owner: string, from: number, to: number): BriefingRun[] {
  return db().prepare(
    `select ${RUN_COLUMNS}, a.id as agentId, a.name as agentName, a.host
     from agent_runs r join agents a on a.id = r.agent_id
     where a.owner = ? and ((r.started_at >= ? and r.started_at < ?) or (r.last_event_at >= ? and r.last_event_at < ?))
     order by r.started_at`,
  ).all(owner, from, to, from, to) as BriefingRun[];
}

/** Turns and tool calls of an agent whose events fall in [from, to). */
export function eventCountsBetween(agentId: string, from: number, to: number): { turns: number; toolCalls: number } {
  const row = db().prepare(
    `select sum(e.type = 'turn_end') as turns, sum(e.type = 'tool_end') as toolCalls
     from agent_events e join agent_runs r on r.id = e.run_id where r.agent_id = ? and e.at >= ? and e.at < ?`,
  ).get(agentId, from, to) as { turns: number | null; toolCalls: number | null };
  return { turns: row.turns ?? 0, toolCalls: row.toolCalls ?? 0 };
}

export function medianDurationMs(agentId: string, days: number, now = Date.now()): number | null {
  const values = (db().prepare("select duration_ms as v from agent_runs where agent_id = ? and started_at >= ? and ended_at is not null and duration_ms is not null order by duration_ms")
    .all(agentId, now - days * 86_400_000) as { v: number }[]).map((r) => r.v);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
}

export type WebhookKind = "telegram" | "slack" | "discord" | "generic";
export type NotifySettings = {
  briefingHour: number;
  alertsEmail: boolean;
  webhook: { kind: WebhookKind; url: string; chatId?: string } | null;
};
const WEBHOOK_KINDS: WebhookKind[] = ["telegram", "slack", "discord", "generic"];

export function getNotifySettings(owner: string): NotifySettings {
  const r = db().prepare("select briefing_hour, alerts_email, webhook_kind, webhook_url, webhook_chat_id from accounts where email = ?").get(owner) as
    | { briefing_hour: number; alerts_email: number; webhook_kind: string | null; webhook_url: string | null; webhook_chat_id: string | null }
    | undefined;
  if (!r) return { briefingHour: 7, alertsEmail: true, webhook: null };
  const webhook = r.webhook_kind && r.webhook_url && WEBHOOK_KINDS.includes(r.webhook_kind as WebhookKind)
    ? { kind: r.webhook_kind as WebhookKind, url: r.webhook_url, ...(r.webhook_chat_id ? { chatId: r.webhook_chat_id } : {}) }
    : null;
  return { briefingHour: r.briefing_hour, alertsEmail: r.alerts_email === 1, webhook };
}

export function validWebhook(w: NonNullable<NotifySettings["webhook"]>): boolean {
  if (!WEBHOOK_KINDS.includes(w.kind)) return false;
  if (w.kind === "telegram") return /^\d+:[\w-]{30,}$/.test(w.url) && typeof w.chatId === "string" && /^-?\d{1,20}$|^@\w{5,32}$/.test(w.chatId);
  if (w.url.length > 500) return false;
  try { return webhookHostAllowed(w.kind, new URL(w.url)); } catch { return false; }
}

export function saveNotifySettings(owner: string, s: NotifySettings): "ok" | "invalid_url" | "invalid_hour" {
  if (!Number.isInteger(s.briefingHour) || s.briefingHour < 0 || s.briefingHour > 23) return "invalid_hour";
  if (s.webhook && !validWebhook(s.webhook)) return "invalid_url";
  db().prepare("update accounts set briefing_hour = ?, alerts_email = ?, webhook_kind = ?, webhook_url = ?, webhook_chat_id = ? where email = ?").run(
    s.briefingHour, s.alertsEmail ? 1 : 0, s.webhook?.kind ?? null, s.webhook?.url ?? null, s.webhook?.chatId ?? null, owner,
  );
  return "ok";
}


export type TimelineEvent = { id: string; at: number; type: string; tool: string | null; ok: number | null; callId: string | null; childId: string | null; durationMs: number | null; metadata: string | null };

/** Ownership is checked before returning any session evidence. Timeline is bounded and paginated. */
export function runTimeline(owner: string, agentId: string, runId: string, offset = 0) {
  const run = db().prepare(`select ${RUN_COLUMNS} from agent_runs r join agents a on a.id = r.agent_id where a.owner = ? and a.id = ? and r.id = ?`).get(owner, agentId, runId) as RunDetail | undefined;
  if (!run) return null;
  const total = (db().prepare("select count(*) as n from agent_events where run_id = ?").get(runId) as { n: number }).n;
  const events = db().prepare(`select e.id, e.at, e.type, e.tool, e.ok, e.metadata, e.call_id as callId, e.child_id as childId,
    case when e.type = 'tool_end' and e.call_id is not null then
      (select e.at - s.at from agent_events s where s.run_id = e.run_id and s.call_id = e.call_id and s.type = 'tool_start' and s.at <= e.at)
    end as durationMs
    from agent_events e where e.run_id = ? order by e.at, e.rowid limit 200 offset ?`).all(runId, Math.max(0, Math.floor(offset))) as TimelineEvent[];
  return { run, events, total };
}

export function checkComparisons(owner: string, agentId: string, now = Date.now()) {
  if (!agentById(owner, agentId)) return [];
  return db().prepare(`select check_name as name, check_version as version, count(*) as samples,
    sum(check_passed = 1) as passed, sum(data_loss = 1) as incomplete, round(avg(duration_ms)) as durationMs
    from agent_runs where agent_id = ? and started_at >= ? and check_name is not null
    group by check_name, check_version order by max(started_at) desc limit 30`).all(agentId, now - 90 * 86_400_000) as {
      name: string; version: string; samples: number; passed: number; incomplete: number; durationMs: number | null;
    }[];
}

export function agentUsage(owner: string, now = Date.now()): number {
  return (db().prepare("select count from agent_usage where owner = ? and month = ?").get(owner, monthKey(now)) as { count: number } | undefined)?.count ?? 0;
}

export function previousConfiguration(owner: string, agentId: string, startedAt: number) {
  const row = db().prepare(`select r.config_json as json from agent_runs r join agents a on a.id = r.agent_id
    where a.owner = ? and a.id = ? and r.started_at < ? and r.config_json is not null order by r.started_at desc limit 1`).get(owner, agentId, startedAt) as { json: string } | undefined;
  return row?.json ?? null;
}
