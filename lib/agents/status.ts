import { randomUUID } from "node:crypto";
import { db } from "../tracking/db";
import type { AgentEventType, AgentKind, RunStatus } from "./types";

/**
 * Deciding "hung" and "missed" from rules, never from guesses.
 *
 * A Claude loop that is waiting for input (last event Stop or Notification)
 * is not stuck, however long it waits; a session with an open tool call is
 * given hours, because builds and test runs are slow. A cron job is only
 * "missed" when the wrapper was told how often it runs.
 */

export const HUNG_IDLE_MS = 30 * 60_000;
export const HUNG_OPEN_TOOL_MS = 3 * 3_600_000;
export const WAITING_CLOSE_MS = 12 * 3_600_000;
export const CRON_HUNG_MS = 24 * 3_600_000;
const MIN_GRACE_MS = 15 * 60_000;

export type RunRow = { id: string; agentKind: AgentKind; status: RunStatus; endedAt: number | null; lastEventAt: number; lastEventType: AgentEventType; openTools: number };
export type AgentRow = { id: string; kind: AgentKind; expectEveryMs: number | null; lastRunStartedAt: number | null; lastMissedAt: number | null };

const WAITING: AgentEventType[] = ["turn_end", "notification"];

export function evaluateRun(run: RunRow, now: number): RunStatus | "close_ok" | null {
  if (run.status !== "running" || run.endedAt !== null) return null;
  const idle = now - run.lastEventAt;
  if (run.agentKind === "cron") return idle > CRON_HUNG_MS ? "hung" : null;
  if (WAITING.includes(run.lastEventType)) return idle > WAITING_CLOSE_MS ? "close_ok" : null;
  return idle > (run.openTools > 0 ? HUNG_OPEN_TOOL_MS : HUNG_IDLE_MS) ? "hung" : null;
}

/** When the next run was due, or null when nothing is expected. */
export function dueAt(agent: AgentRow): number | null {
  if (!agent.expectEveryMs || agent.lastRunStartedAt === null) return null;
  return agent.lastRunStartedAt + agent.expectEveryMs;
}

export function missedDue(agent: AgentRow, now: number): boolean {
  const due = dueAt(agent);
  if (due === null || !agent.expectEveryMs) return false;
  const grace = Math.max(MIN_GRACE_MS, agent.expectEveryMs * 0.1);
  return due + grace < now && (agent.lastMissedAt === null || agent.lastMissedAt < due);
}

export function applyStatus(now = Date.now()): { newlyHung: string[]; newlyMissed: string[] } {
  const d = db();
  const running = (d.prepare(
    `select r.id, a.kind as agentKind, r.status, r.ended_at as endedAt, r.last_event_at as lastEventAt, r.last_event_type as lastEventType, r.open_tools as openTools
     from agent_runs r join agents a on a.id = r.agent_id where r.status = 'running' and r.ended_at is null`,
  ).all() as RunRow[]);
  const newlyHung: string[] = [];
  const setHung = d.prepare("update agent_runs set status = 'hung' where id = ? and status = 'running'");
  const close = d.prepare("update agent_runs set status = 'ok', ended_at = last_event_at, open_tools = 0 where id = ? and status = 'running'");
  for (const run of running) {
    const verdict = evaluateRun(run, now);
    if (verdict === "hung") { setHung.run(run.id); newlyHung.push(run.id); }
    else if (verdict === "close_ok") close.run(run.id);
  }

  const agents = (d.prepare(
    `select a.id, a.kind, a.expect_every_ms as expectEveryMs,
       (select max(started_at) from agent_runs where agent_id = a.id and status <> 'missed') as lastRunStartedAt,
       (select max(started_at) from agent_runs where agent_id = a.id and status = 'missed') as lastMissedAt
     from agents a where a.expect_every_ms is not null`,
  ).all() as AgentRow[]);
  const newlyMissed: string[] = [];
  const insertMissed = d.prepare(
    "insert or ignore into agent_runs (id, agent_id, run_key, started_at, ended_at, status, last_event_at, last_event_type) values (?, ?, ?, ?, ?, 'missed', ?, 'cron_end')",
  );
  for (const agent of agents) {
    if (!missedDue(agent, now)) continue;
    const due = dueAt(agent)!;
    const id = randomUUID();
    if (Number(insertMissed.run(id, agent.id, `missed:${due}`, due, due, due).changes)) newlyMissed.push(id);
  }
  return { newlyHung, newlyMissed };
}
