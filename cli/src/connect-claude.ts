import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureDir } from "./config.js";
import { HOOK_EVENTS } from "./hook.js";

/**
 * Installs the agenttracking hooks into Claude Code settings, and removes them.
 *
 * The person's own hooks are never touched: ours are recognised by a command
 * that names agenttracking and `hook`. A file that does not parse is never
 * written. Every change is preceded by a backup next to the file.
 */

type Json = Record<string, unknown>;
type HookEntry = { matcher?: string; hooks?: { type?: string; command?: string; timeout?: number }[] };
const TOOL_EVENTS = new Set(["PreToolUse", "PostToolUse", "PostToolUseFailure"]);

const MARKER = "--from=agenttracking";
const isOurs = (entry: HookEntry) => (entry.hooks ?? []).some((h) => typeof h.command === "string" &&
  (h.command.endsWith(` ${MARKER}`) || (/agenttracking/.test(h.command) && / hook [A-Za-z]+$/.test(h.command))));

export function removeHooks(settings: Json): Json {
  const hooks = { ...((settings.hooks as Record<string, HookEntry[]> | undefined) ?? {}) };
  for (const event of Object.keys(hooks)) {
    const kept = (hooks[event] ?? []).filter((e) => !isOurs(e));
    if (kept.length) hooks[event] = kept; else delete hooks[event];
  }
  const next = { ...settings };
  if (Object.keys(hooks).length) next.hooks = hooks; else delete next.hooks;
  return next;
}

export function mergeHooks(settings: Json, command: (event: string) => string): Json {
  const base = removeHooks(settings);
  const hooks = { ...((base.hooks as Record<string, HookEntry[]> | undefined) ?? {}) };
  for (const event of HOOK_EVENTS) {
    const entry: HookEntry = { ...(TOOL_EVENTS.has(event) ? { matcher: "*" } : {}), hooks: [{ type: "command", command: command(event), timeout: 5 }] };
    hooks[event] = [...(hooks[event] ?? []), entry];
  }
  return { ...base, hooks };
}

/** Copy of this build under ~/.agenttracking/runtime/<version>/, so hooks do not depend on the npx cache. Returns the cli.js path. */
export function installRuntime(home?: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let version = "dev";
  try { version = (JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as { version?: string }).version ?? "dev"; } catch { /* running from source */ }
  const target = join(ensureDir(home), "runtime", version);
  mkdirSync(target, { recursive: true });
  cpSync(here, target, { recursive: true, filter: (src) => !src.endsWith(".test.js") && !src.endsWith(".ts") });
  writeFileSync(join(target, "package.json"), JSON.stringify({ type: "module", version }) + "\n");
  return join(target, "cli.js");
}

export const defaultCommand = (cliPath: string) => (event: string) => `"${process.execPath}" "${cliPath}" hook ${event} ${MARKER}`;

export function settingsPathFor(scope: "user" | "project"): string {
  return scope === "project" ? join(process.cwd(), ".claude", "settings.json") : join(homedir(), ".claude", "settings.json");
}

type Result = "connected" | "already" | "invalid_json" | "disconnected" | "not_connected";

function load(file: string): { settings: Json; raw: string | null } | "invalid_json" {
  if (!existsSync(file)) return { settings: {}, raw: null };
  const raw = readFileSync(file, "utf8");
  if (!raw.trim()) return { settings: {}, raw };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { settings: parsed as Json, raw } : "invalid_json";
  } catch {
    return "invalid_json";
  }
}

function save(file: string, raw: string | null, settings: Json): void {
  mkdirSync(dirname(file), { recursive: true });
  if (raw !== null) writeFileSync(`${file}.agenttracking-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`, raw);
  writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
}

export function connectClaude(opts: { settingsPath: string; command: (event: string) => string }): Result {
  const loaded = load(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const next = mergeHooks(loaded.settings, opts.command);
  if (JSON.stringify(next) === JSON.stringify(loaded.settings)) return "already";
  save(opts.settingsPath, loaded.raw, next);
  return "connected";
}

export function disconnectClaude(opts: { settingsPath: string }): Result {
  const loaded = load(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const next = removeHooks(loaded.settings);
  if (JSON.stringify(next) === JSON.stringify(loaded.settings)) return "not_connected";
  save(opts.settingsPath, loaded.raw, next);
  return "disconnected";
}
