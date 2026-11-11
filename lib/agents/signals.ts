import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { DashLang } from "../tracking/copy";
import type { Snapshot } from "./snapshot";

/**
 * Signals: things an agent did that are worth a look although the run itself
 * has not crashed. Pro only (AgentPlan.signals). Derived solely from metadata
 * already stored, so no prompts, arguments or outputs ever leave the machine:
 *
 * - config_change: the sanitized configuration snapshot differs from the
 *   previous one for the same agent (counts of MCP servers, plugins and
 *   permission rules; fingerprints of settings, .mcp.json and CLAUDE.md).
 * - new_tool: an agent with an established history uses a tool it has not used
 *   within the event retention window.
 * - thrashing: a single run fails 5 tool calls in a row, or fails the same
 *   tool 8 times within 15 minutes (for example an edit-and-test death spiral
 *   where Edit succeeds and Bash keeps failing). Alerted at most once per run.
 *
 * Each signal is stored once (unique per agent, kind and key) and alerted once.
 */

export type SignalKind = "config_change" | "new_tool" | "thrashing";
export type ConfigChange = { field: "mcpServers" | "plugins" | "allowRules" | "askRules" | "denyRules"; from: number; to: number } | { file: string; change: "changed" | "added" | "removed" };
export type ThrashingPayload = { tool: string; failures: number; streak: boolean };
export type SignalPayload = { changes: ConfigChange[] } | { tool: string } | ThrashingPayload;

/** An agent counts as established after this long and this many tool calls. */
export const LEARNING_MS = 3 * 86_400_000;
export const LEARNING_TOOL_CALLS = 20;
export const THRASH_STREAK = 5;
export const THRASH_REPEAT = 8;
export const THRASH_WINDOW_MS = 15 * 60_000;

const COUNTS = ["mcpServers", "plugins", "allowRules", "askRules", "denyRules"] as const;

export function configChanges(prev: Snapshot, next: Snapshot): ConfigChange[] {
  const out: ConfigChange[] = [];
  for (const field of COUNTS) if (prev[field] !== next[field]) out.push({ field, from: prev[field], to: next[field] });
  const before = new Map(prev.files.map((f) => [f.scope, f]));
  const after = new Map(next.files.map((f) => [f.scope, f]));
  for (const scope of new Set([...before.keys(), ...after.keys()])) {
    const a = before.get(scope), b = after.get(scope);
    const was = a?.state === "present", is = b?.state === "present";
    if (!was && is) out.push({ file: scope, change: "added" });
    else if (was && !is && b) out.push({ file: scope, change: "removed" });
    else if (was && is && a?.fingerprint !== b?.fingerprint) out.push({ file: scope, change: "changed" });
  }
  return out;
}

function insert(d: DatabaseSync, owner: string, agentId: string, kind: SignalKind, key: string, payload: SignalPayload, at: number): boolean {
  return Number(d.prepare("insert or ignore into agent_signals (id, owner, agent_id, kind, key, payload, at) values (?, ?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), owner, agentId, kind, key, JSON.stringify(payload), at).changes) > 0;
}

/** Called before the new snapshot is stored on the run. Compares with the agent's latest earlier snapshot. */
export function checkConfig(d: DatabaseSync, owner: string, agentId: string, next: Snapshot, at: number): boolean {
  const row = d.prepare("select config_json from agent_runs where agent_id = ? and config_json is not null and config_at <= ? order by config_at desc limit 1").get(agentId, at) as { config_json: string } | undefined;
  if (!row) return false;
  let prev: Snapshot;
  try { prev = JSON.parse(row.config_json) as Snapshot; } catch { return false; }
  if (prev.fingerprint === next.fingerprint) return false;
  const changes = configChanges(prev, next);
  if (!changes.length) return false;
  return insert(d, owner, agentId, "config_change", `${prev.fingerprint.slice(0, 16)}>${next.fingerprint.slice(0, 16)}`, { changes }, at);
}

/** Called after a tool event was stored. */
export function checkNewTool(d: DatabaseSync, owner: string, agentId: string, tool: string, eventId: string, at: number): boolean {
  const agent = d.prepare("select first_seen from agents where id = ?").get(agentId) as { first_seen: number } | undefined;
  if (!agent || at - agent.first_seen < LEARNING_MS) return false;
  const used = d.prepare("select tool, count(*) as n from agent_events ev join agent_runs r on r.id = ev.run_id where r.agent_id = ? and ev.type = 'tool_end' and ev.tool is not null and ev.id <> ? group by tool").all(agentId, eventId) as { tool: string; n: number }[];
  if (used.some((u) => u.tool === tool)) return false;
  if (used.reduce((s, u) => s + u.n, 0) < LEARNING_TOOL_CALLS) return false;
  return insert(d, owner, agentId, "new_tool", tool, { tool }, at);
}

/** Called after a failed tool_end event. Detects runaway error loops once per run without reading prompts or output. */
export function checkThrashing(d: DatabaseSync, owner: string, agentId: string, runId: string, tool: string, at: number): boolean {
  const recent = d.prepare("select ok from agent_events where run_id = ? and type = 'tool_end' order by at desc, rowid desc limit ?")
    .all(runId, THRASH_STREAK) as { ok: number | null }[];
  if (recent.length >= THRASH_STREAK && recent.every((r) => r.ok === 0)) {
    return insert(d, owner, agentId, "thrashing", runId, { tool, failures: THRASH_STREAK, streak: true }, at);
  }
  const repeated = (d.prepare("select count(*) as n from agent_events where run_id = ? and type = 'tool_end' and tool = ? and ok = 0 and at >= ?")
    .get(runId, tool, at - THRASH_WINDOW_MS) as { n: number }).n;
  if (repeated >= THRASH_REPEAT) {
    return insert(d, owner, agentId, "thrashing", runId, { tool, failures: repeated, streak: false }, at);
  }
  return false;
}

const FILE = {
  en: { user_settings: "user settings", project_settings: "project settings", local_settings: "local settings", project_mcp: ".mcp.json", project_instructions: "CLAUDE.md" } as Record<string, string>,
  de: { user_settings: "Benutzer-Einstellungen", project_settings: "Projekt-Einstellungen", local_settings: "lokale Einstellungen", project_mcp: ".mcp.json", project_instructions: "CLAUDE.md" } as Record<string, string>,
};
const FIELD = {
  en: { mcpServers: "MCP servers", plugins: "plugins", allowRules: "allow rules", askRules: "ask rules", denyRules: "deny rules" },
  de: { mcpServers: "MCP-Server", plugins: "Plugins", allowRules: "Allow-Regeln", askRules: "Ask-Regeln", denyRules: "Deny-Regeln" },
};

export function signalText(kind: SignalKind, payload: SignalPayload, lang: DashLang): string {
  const de = lang === "de";
  if (kind === "thrashing" && "failures" in payload) {
    if (payload.streak) {
      return de
        ? `Schleife vermutet: ${payload.failures} fehlgeschlagene Tool-Aufrufe in Folge (zuletzt ${payload.tool})`
        : `suspected loop: ${payload.failures} failed tool calls in a row (last: ${payload.tool})`;
    }
    return de
      ? `Schleife vermutet: ${payload.tool} ist ${payload.failures}× in 15 Minuten fehlgeschlagen`
      : `suspected loop: ${payload.tool} failed ${payload.failures} times within 15 minutes`;
  }
  if (kind === "new_tool" && "tool" in payload) return de ? `nutzt zum ersten Mal das Tool ${payload.tool}` : `used the tool ${payload.tool} for the first time`;
  if ("changes" in payload) {
    const parts = payload.changes.map((c) => "field" in c
      ? `${FIELD[lang][c.field]} ${c.from} → ${c.to}`
      : `${FILE[lang][c.file] ?? c.file} ${de ? { changed: "geändert", added: "hinzugekommen", removed: "entfernt" }[c.change] : c.change}`);
    return `${de ? "Konfiguration geändert" : "configuration changed"}: ${parts.join(", ")}`;
  }
  return "";
}

export type SignalRow = { id: string; owner: string; agent_id: string; name: string; host: string; kind: SignalKind; payload: string; at: number };

export function agentSignals(d: DatabaseSync, owner: string, agentId: string, limit = 20): SignalRow[] {
  return d.prepare("select s.id, s.owner, s.agent_id, a.name, a.host, s.kind, s.payload, s.at from agent_signals s join agents a on a.id = s.agent_id where s.owner = ? and s.agent_id = ? order by s.at desc limit ?").all(owner, agentId, limit) as SignalRow[];
}
