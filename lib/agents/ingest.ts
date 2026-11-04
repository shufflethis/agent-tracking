import { parseSnapshot } from "./snapshot";
import { checkConfig, checkNewTool } from "./signals";
import { randomUUID } from "node:crypto";
import { dayKey, db, monthKey } from "../tracking/db";
import { effectiveAgentPlan } from "./plans";
import { AGENT_EVENT_TYPES, AGENT_EVENTS_PER_MONTH, AGENT_KINDS, MAX_BATCH, type AgentEvent, type AgentEventType, type AgentKind } from "./types";

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
  // Outside the window the time is unknown; a made-up "now" would create false hung runs. Drop instead.
  if (typeof r.at !== "number" || !Number.isFinite(r.at) || r.at < now - PAST_MS || r.at > now + FUTURE_MS) return null;
  const at = Math.round(r.at);
  const event: AgentEvent = { v: 1, id: r.id, type, at, agent: { kind: agent.kind as AgentKind, name: agent.name, host: agent.host }, run: r.run };
  if ((type === "session_start" || type === "config_snapshot") && r.snapshot !== undefined) {
    const snapshot = parseSnapshot(r.snapshot); if (!snapshot) return null; event.snapshot = snapshot;
  }
  if (type === "kernel_event") {
    const k = r.kernel as Record<string, unknown> | undefined;
    if (!k || !["process_exec", "file_open", "network_connect"].includes(String(k.operation)) || typeof k.processId !== "string" || !/^[0-9a-f]{64}$/.test(k.processId)) return null;
    event.kernel = { operation: k.operation as NonNullable<AgentEvent["kernel"]>["operation"], processId: k.processId };
  }
  if (r.dataLoss === true) event.dataLoss = true;
  if ((type === "tool_start" || type === "tool_end") && typeof r.callId === "string" && /^[0-9a-f]{64}$/.test(r.callId)) event.callId = r.callId;
  if ((type === "subagent_start" || type === "subagent_end") && typeof r.childId === "string" && /^[0-9a-f]{64}$/.test(r.childId)) event.childId = r.childId;
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
    if (typeof r.checkName === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(r.checkName) && typeof r.checkVersion === "string" && /^[A-Za-z0-9_.:-]{1,64}$/.test(r.checkVersion)) {
      event.checkName = r.checkName; event.checkVersion = r.checkVersion;
    }
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

type RunState = { id: string; run_key: string; status: string; ended_at: number | null; last_event_at: number };

export function recordAgentEvents(owner: string, events: AgentEvent[], now = Date.now(), pricingStarts?: number | null): { accepted: number; duplicates: number; rejected: "agent_limit" | "quota" | null } {
  const d = db();
  const stored = (d.prepare("select agent_plan from accounts where email = ?").get(owner) as { agent_plan?: string } | undefined)?.agent_plan;
  const plan = pricingStarts === undefined ? effectiveAgentPlan(stored, now) : effectiveAgentPlan(stored, now, pricingStarts);
  const month = monthKey(now);
  const used = (d.prepare("select count from agent_usage where owner = ? and month = ?").get(owner, month) as { count: number } | undefined)?.count ?? 0;
  const exists = d.prepare("select 1 from agent_events where owner = ? and id = ?");
  const seen = new Set<string>();
  const fresh = events.filter((e) => {
    if (seen.has(e.id) || exists.get(owner, e.id)) return false;
    seen.add(e.id);
    return true;
  });
  let duplicates = events.length - fresh.length;
  if (fresh.length && used + fresh.length > AGENT_EVENTS_PER_MONTH) return { accepted: 0, duplicates, rejected: "quota" };

  const findAgent = d.prepare("select id from agents where owner = ? and kind = ? and host = ? and name = ?");
  const countAgents = d.prepare("select count(*) as n from agents where owner = ?");
  const insertAgent = d.prepare("insert into agents (id, owner, kind, name, host, first_seen, last_seen) values (?, ?, ?, ?, ?, ?, ?)");
  const touchAgent = d.prepare("update agents set last_seen = max(last_seen, ?) where id = ?");
  const setEvery = d.prepare("update agents set expect_every_ms = ? where id = ?");
  // A resumed session keeps its id, so its run key gets a suffix per restart: key, key:2, key:3 ...
  const findRun = d.prepare("select id, run_key, status, ended_at, last_event_at from agent_runs where agent_id = ? and (run_key = ? or run_key like ? || ':%') order by started_at desc, rowid desc limit 1");
  const countRuns = d.prepare("select count(*) as n from agent_runs where agent_id = ? and (run_key = ? or run_key like ? || ':%')");
  const insertRun = d.prepare("insert into agent_runs (id, agent_id, run_key, started_at, status, last_event_at, last_event_type) values (?, ?, ?, ?, 'running', ?, ?)");
  const insertEvent = d.prepare("insert or ignore into agent_events (id, owner, run_id, at, received_at, type, tool, ok, call_id, child_id, metadata) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
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
        if ((countAgents.get(owner) as { n: number }).n >= plan.agents) { rejected = "agent_limit"; continue; }
        agentId = randomUUID();
        insertAgent.run(agentId, owner, e.agent.kind, e.agent.name, e.agent.host, e.at, e.at);
      }
      touchAgent.run(e.at, agentId);
      if (e.type === "cron_start" && e.expectEveryMs) setEvery.run(e.expectEveryMs, agentId);

      let run = findRun.get(agentId, e.run, e.run) as RunState | undefined;
      const restart = run && run.ended_at !== null && (e.type === "session_start" || e.type === "turn_start") && e.at >= run.ended_at;
      if (!run || restart) {
        const id = randomUUID();
        const key = run ? `${e.run}:${(countRuns.get(agentId, e.run, e.run) as { n: number }).n + 1}` : e.run;
        insertRun.run(id, agentId, key, e.at, e.at, e.type);
        bumpDaily.run(agentId, dayKey(e.at), 1, 0, 0);
        run = { id, run_key: key, status: "running", ended_at: null, last_event_at: e.at };
      }
      if (e.dataLoss) update("data_loss = 1", run.id);
      if (!Number(insertEvent.run(e.id, owner, run.id, e.at, now, e.type, e.tool ?? null, e.ok === undefined ? null : e.ok ? 1 : 0, e.callId ?? null, e.childId ?? null, e.snapshot ? JSON.stringify({ snapshot: e.snapshot }) : e.kernel ? JSON.stringify({ kernel: e.kernel }) : null).changes)) { duplicates++; continue; }
      accepted++;
      if (plan.signals && e.snapshot) checkConfig(d, owner, agentId, e.snapshot, e.at);
      if (plan.signals && e.type === "tool_end" && e.tool) checkNewTool(d, owner, agentId, e.tool, e.id, e.at);
      if (e.snapshot) d.prepare("update agent_runs set config_json = ?, config_at = ? where id = ? and (config_at is null or config_at <= ?)").run(JSON.stringify(e.snapshot), e.at, run.id, e.at);
      if (e.type !== "config_snapshot" && run.ended_at === null && e.at >= run.last_event_at) update("last_event_at = ?, last_event_type = ?", e.at, e.type, run.id);
      update("started_at = min(started_at, ?)", e.at, run.id);
      // Late tool completions still contribute evidence without reopening a closed run.
      if (run.ended_at !== null && e.type === "tool_end") {
        update("tool_calls = tool_calls + 1, tool_errors = tool_errors + ?", e.ok === false ? 1 : 0, run.id);
        bumpDaily.run(agentId, dayKey(e.at), 0, 0, 1);
      }

      if (run.ended_at !== null) continue; // a finished run is never reopened
      if ((run.status === "hung" || (run.status === "failed" && e.type === "turn_start")) && e.at >= run.last_event_at) update("status = 'running', alerted_at = null", run.id);
      switch (e.type) {
        case "tool_start":
          if (!e.callId || !d.prepare("select 1 from agent_events where run_id = ? and call_id = ? and type = 'tool_end'").get(run.id, e.callId)) update("open_tools = open_tools + 1", run.id);
          break;
        case "tool_end":
          update("open_tools = max(0, open_tools - ?), tool_calls = tool_calls + 1, tool_errors = tool_errors + ?", !e.callId || d.prepare("select 1 from agent_events where run_id = ? and call_id = ? and type = 'tool_start'").get(run.id, e.callId) ? 1 : 0, e.ok === false ? 1 : 0, run.id);
          bumpDaily.run(agentId, dayKey(e.at), 0, 0, 1);
          break;
        case "turn_end": update("turns = turns + 1", run.id); break;
        case "turn_error": if (e.at >= run.last_event_at) update("status = 'failed'", run.id); break;
        case "session_end": update("end_reason = 'session_end', ended_at = ?, open_tools = 0, status = case when status = 'failed' then 'failed' else 'ok' end", e.at, run.id); break;
        case "cron_end": {
          const failed = e.exitCode !== 0;
          update("ended_at = ?, exit_code = ?, duration_ms = ?, status = ?, tail = ?, tail_at = ?", e.at, e.exitCode ?? null, e.durationMs ?? null, failed ? "failed" : "ok", e.tail ?? null, e.tail ? now : null, run.id);
          if (plan.checks && e.checkName && e.checkVersion) update("check_name = ?, check_version = ?, check_passed = ?", e.checkName, e.checkVersion, failed ? 0 : 1, run.id);
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
