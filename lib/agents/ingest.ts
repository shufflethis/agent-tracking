import { randomUUID } from "node:crypto";
import { dayKey, db, monthKey } from "../tracking/db";
import { AGENT_EVENT_TYPES, AGENT_EVENTS_PER_MONTH, AGENT_KINDS, AGENT_LIMIT, MAX_BATCH, type AgentEvent, type AgentEventType, type AgentKind } from "./types";

/**
 * Agent event ingest.
 *
 * Allowlist, not denylist: an event is rebuilt from the documented fields
 * only, so anything else a client sends (tool input, prompts, paths) never
 * reaches a statement. Run state is folded in on write, the dashboard and the
 * status job read agent_runs, never agent_events.
 */

const PAST_MS = 7 * 86_400_000;
const FUTURE_MS = 5 * 60_000;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
const RUN = /^[0-9a-f-]{16,64}$/;
const LABEL = /^[\w .:/@-]{1,64}$/;
const TOOL = /^[A-Za-z0-9_.:-]{1,128}$/;

const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : undefined;

function parseEvent(raw: unknown, now: number): AgentEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const agent = r.agent as Record<string, unknown> | undefined;
  if (r.v !== 1 || typeof r.id !== "string" || !ID.test(r.id)) return null;
  if (!AGENT_EVENT_TYPES.includes(r.type as AgentEventType)) return null;
  if (!agent || !AGENT_KINDS.includes(agent.kind as AgentKind)) return null;
  if (typeof agent.name !== "string" || !LABEL.test(agent.name) || typeof agent.host !== "string" || !LABEL.test(agent.host)) return null;
  if (typeof r.run !== "string" || !RUN.test(r.run)) return null;
  const type = r.type as AgentEventType;
  const at = typeof r.at === "number" && Number.isFinite(r.at) && r.at >= now - PAST_MS && r.at <= now + FUTURE_MS ? Math.round(r.at) : now;
  const event: AgentEvent = { v: 1, id: r.id, type, at, agent: { kind: agent.kind as AgentKind, name: agent.name, host: agent.host }, run: r.run };
  if (type === "tool_start" || type === "tool_end") {
    if (typeof r.tool !== "string" || !TOOL.test(r.tool)) return null;
    event.tool = r.tool;
    if (type === "tool_end" && typeof r.ok === "boolean") event.ok = r.ok;
  }
  if (type === "cron_start") {
    const every = int(r.expectEveryMs, 60_000, 31 * 86_400_000);
    if (every !== undefined) event.expectEveryMs = every;
  }
  if (type === "cron_end") {
    const exitCode = int(r.exitCode, 0, 255);
    if (exitCode === undefined) return null;
    event.exitCode = exitCode;
    const duration = int(r.durationMs, 0, PAST_MS);
    if (duration !== undefined) event.durationMs = duration;
    if (typeof r.tail === "string" && r.tail.length) event.tail = r.tail.slice(-4000);
  }
  return event;
}

export function parseAgentBatch(body: unknown, now = Date.now()): { events: AgentEvent[]; dropped: number } | null {
  const list = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(list) || list.length > MAX_BATCH) return null;
  const events: AgentEvent[] = [];
  for (const raw of list) {
    const e = parseEvent(raw, now);
    if (e) events.push(e);
  }
  return { events, dropped: list.length - events.length };
}

type RunState = { id: string; status: string; ended_at: number | null; last_event_at: number };

export function recordAgentEvents(owner: string, events: AgentEvent[], now = Date.now()): { accepted: number; duplicates: number; rejected: "agent_limit" | "quota" | null } {
  const d = db();
  const month = monthKey(now);
  const used = (d.prepare("select count from agent_usage where owner = ? and month = ?").get(owner, month) as { count: number } | undefined)?.count ?? 0;
  const exists = d.prepare("select 1 from agent_events where owner = ? and id = ?");
  const fresh = events.filter((e) => !exists.get(owner, e.id));
  const duplicates = events.length - fresh.length;
  if (fresh.length && used + fresh.length > AGENT_EVENTS_PER_MONTH) return { accepted: 0, duplicates, rejected: "quota" };

  const findAgent = d.prepare("select id from agents where owner = ? and kind = ? and host = ? and name = ?");
  const countAgents = d.prepare("select count(*) as n from agents where owner = ?");
  const insertAgent = d.prepare("insert into agents (id, owner, kind, name, host, first_seen, last_seen) values (?, ?, ?, ?, ?, ?, ?)");
  const touchAgent = d.prepare("update agents set last_seen = max(last_seen, ?) where id = ?");
  const setEvery = d.prepare("update agents set expect_every_ms = ? where id = ?");
  const findRun = d.prepare("select id, status, ended_at, last_event_at from agent_runs where agent_id = ? and run_key = ?");
  const insertRun = d.prepare("insert into agent_runs (id, agent_id, run_key, started_at, status, last_event_at, last_event_type) values (?, ?, ?, ?, 'running', ?, ?)");
  const insertEvent = d.prepare("insert into agent_events (id, owner, run_id, at, received_at, type, tool, ok) values (?, ?, ?, ?, ?, ?, ?, ?)");
  const bumpDaily = d.prepare(
    "insert into agent_daily (agent_id, day, runs, failed, tool_calls) values (?, ?, ?, ?, ?) on conflict(agent_id, day) do update set runs = runs + excluded.runs, failed = failed + excluded.failed, tool_calls = tool_calls + excluded.tool_calls",
  );
  const update = (sql: string, ...args: (string | number | null)[]) => d.prepare(`update agent_runs set ${sql} where id = ?`).run(...args);

  let accepted = 0;
  let rejected: "agent_limit" | null = null;
  d.exec("begin");
  try {
    for (const e of fresh) {
      let agentId = (findAgent.get(owner, e.agent.kind, e.agent.host, e.agent.name) as { id: string } | undefined)?.id;
      if (!agentId) {
        if ((countAgents.get(owner) as { n: number }).n >= AGENT_LIMIT) { rejected = "agent_limit"; continue; }
        agentId = randomUUID();
        insertAgent.run(agentId, owner, e.agent.kind, e.agent.name, e.agent.host, e.at, e.at);
      }
      touchAgent.run(e.at, agentId);
      if (e.type === "cron_start" && e.expectEveryMs) setEvery.run(e.expectEveryMs, agentId);

      let run = findRun.get(agentId, e.run) as RunState | undefined;
      if (!run) {
        const id = randomUUID();
        insertRun.run(id, agentId, e.run, e.at, e.at, e.type);
        bumpDaily.run(agentId, dayKey(e.at), 1, 0, 0);
        run = { id, status: "running", ended_at: null, last_event_at: e.at };
      } else if (e.at >= run.last_event_at) {
        update("last_event_at = ?, last_event_type = ?", e.at, e.type, run.id);
      }
      insertEvent.run(e.id, owner, run.id, e.at, now, e.type, e.tool ?? null, e.ok === undefined ? null : e.ok ? 1 : 0);
      accepted++;

      if (run.ended_at !== null) continue; // a finished run is never reopened
      if (run.status === "hung") update("status = 'running', alerted_at = null", run.id);
      switch (e.type) {
        case "tool_start": update("open_tools = open_tools + 1", run.id); break;
        case "tool_end":
          update("open_tools = max(0, open_tools - 1), tool_calls = tool_calls + 1, tool_errors = tool_errors + ?", e.ok === false ? 1 : 0, run.id);
          bumpDaily.run(agentId, dayKey(e.at), 0, 0, 1);
          break;
        case "turn_end": update("turns = turns + 1", run.id); break;
        case "session_end": update("ended_at = ?, open_tools = 0, status = case when status = 'failed' then 'failed' else 'ok' end", e.at, run.id); break;
        case "cron_end": {
          const failed = e.exitCode !== 0;
          update("ended_at = ?, exit_code = ?, duration_ms = ?, status = ?, tail = ?, tail_at = ?", e.at, e.exitCode ?? null, e.durationMs ?? null, failed ? "failed" : "ok", e.tail ?? null, e.tail ? now : null, run.id);
          if (failed) bumpDaily.run(agentId, dayKey(e.at), 0, 1, 0);
          break;
        }
        default: break;
      }
    }
    if (accepted) {
      d.prepare("insert into agent_usage (owner, month, count) values (?, ?, ?) on conflict(owner, month) do update set count = count + excluded.count").run(owner, month, accepted);
    }
    d.exec("commit");
  } catch (error) {
    d.exec("rollback");
    throw error;
  }
  return { accepted, duplicates, rejected };
}
