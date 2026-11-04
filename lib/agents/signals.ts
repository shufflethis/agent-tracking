import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import type { DashLang } from "../tracking/copy";
import type { Snapshot } from "./snapshot";

/**
 * Signals: things an agent did that are worth a look although nothing failed.
 * Pro only (AgentPlan.signals). Both kinds are derived from data that is
 * already stored, so no new data leaves the machine:
 *
 * - config_change: the sanitized configuration snapshot differs from the
 *   previous one for the same agent (counts of MCP servers, plugins and
 *   permission rules; fingerprints of settings, .mcp.json and CLAUDE.md).
 * - new_tool: an agent with a history uses a tool it has not used within the
 *   event retention window. A learning period keeps new agents quiet.
 *
 * Each signal is stored once (unique per agent, kind and key) and alerted once.
 */

export type SignalKind = "config_change" | "new_tool";
export type ConfigChange = { field: "mcpServers" | "plugins" | "allowRules" | "askRules" | "denyRules"; from: number; to: number } | { file: string; change: "changed" | "added" | "removed" };
export type SignalPayload = { changes: ConfigChange[] } | { tool: string };

/** An agent counts as established after this long and this many tool calls. */
export const LEARNING_MS = 3 * 86_400_000;
export const LEARNING_TOOL_CALLS = 20;

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
