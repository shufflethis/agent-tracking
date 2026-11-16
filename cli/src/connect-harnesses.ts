import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Installs and removes agenttracking hooks for Cursor, Gemini CLI and OpenAI Codex CLI.
 *
 * Same safety rules as connect-claude.ts:
 *  - Foreign hooks and settings are never modified or overwritten.
 *  - Invalid JSON is never touched.
 *  - Every modification writes a timestamped backup next to the target file.
 */

type Json = Record<string, unknown>;
export type ConnectResult = "connected" | "already" | "invalid_json" | "foreign_notify" | "disconnected" | "not_connected";

const MARKER = "--from=agenttracking";
const isOurCmd = (cmd: unknown): boolean =>
  typeof cmd === "string" && (cmd.endsWith(` ${MARKER}`) || (/agenttracking/.test(cmd) && / hook [A-Za-z]+/.test(cmd)));

function loadJson(file: string): { data: Json; raw: string | null } | "invalid_json" {
  if (!existsSync(file)) return { data: {}, raw: null };
  const raw = readFileSync(file, "utf8");
  if (!raw.trim()) return { data: {}, raw };
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { data: parsed as Json, raw } : "invalid_json";
  } catch {
    return "invalid_json";
  }
}

function saveWithBackup(file: string, raw: string | null, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  if (raw !== null) writeFileSync(`${file}.agenttracking-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`, raw);
  writeFileSync(file, content);
}

/* ------------------------------------------------------------------ Cursor */

const CURSOR_EVENTS: readonly [string, string][] = [
  ["beforeShellExecution", "CursorBeforeShell"],
  ["beforeMCPExecution", "CursorBeforeMCP"],
  ["afterFileEdit", "CursorAfterEdit"],
  ["stop", "CursorStop"],
];

export const cursorPathFor = (scope: "user" | "project", userHome = homedir(), cwd = process.cwd()): string =>
  scope === "project" ? join(cwd, ".cursor", "hooks.json") : join(userHome, ".cursor", "hooks.json");

type CursorHookEntry = { command?: string };

export function connectCursor(opts: { settingsPath: string; command: (event: string) => string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const baseHooks = { ...((loaded.data.hooks as Record<string, CursorHookEntry[]> | undefined) ?? {}) };
  for (const k of Object.keys(baseHooks)) {
    const kept = (Array.isArray(baseHooks[k]) ? baseHooks[k] : []).filter((e) => !isOurCmd(e?.command));
    if (kept.length) baseHooks[k] = kept;
    else delete baseHooks[k];
  }
  for (const [cursorKey, hookEvent] of CURSOR_EVENTS) {
    baseHooks[cursorKey] = [...(baseHooks[cursorKey] ?? []), { command: opts.command(hookEvent) }];
  }
  const next: Json = { ...loaded.data, version: typeof loaded.data.version === "number" ? loaded.data.version : 1, hooks: baseHooks };
  if (JSON.stringify(next) === JSON.stringify(loaded.data)) return "already";
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "connected";
}

export function disconnectCursor(opts: { settingsPath: string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const baseHooks = { ...((loaded.data.hooks as Record<string, CursorHookEntry[]> | undefined) ?? {}) };
  for (const k of Object.keys(baseHooks)) {
    const kept = (Array.isArray(baseHooks[k]) ? baseHooks[k] : []).filter((e) => !isOurCmd(e?.command));
    if (kept.length) baseHooks[k] = kept;
    else delete baseHooks[k];
  }
  const next: Json = { ...loaded.data };
  if (Object.keys(baseHooks).length) next.hooks = baseHooks;
  else delete next.hooks;
  if (JSON.stringify(next) === JSON.stringify(loaded.data)) return "not_connected";
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "disconnected";
}

/* -------------------------------------------------------------- Gemini CLI */

const GEMINI_EVENTS: readonly [string, string, boolean][] = [
  ["SessionStart", "GeminiSessionStart", false],
  ["BeforeAgent", "GeminiBeforeAgent", false],
  ["AfterAgent", "GeminiAfterAgent", false],
  ["BeforeTool", "GeminiBeforeTool", true],
  ["AfterTool", "GeminiAfterTool", true],
  ["Notification", "GeminiNotification", false],
  ["SessionEnd", "GeminiSessionEnd", false],
];

export const geminiPathFor = (scope: "user" | "project", userHome = homedir(), cwd = process.cwd()): string =>
  scope === "project" ? join(cwd, ".gemini", "settings.json") : join(userHome, ".gemini", "settings.json");

type GeminiEntry = { matcher?: string; hooks?: { type?: string; command?: string; timeout?: number }[] };
const isOursGemini = (e: GeminiEntry) => (e.hooks ?? []).some((h) => isOurCmd(h?.command));

export function connectGemini(opts: { settingsPath: string; command: (event: string) => string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const hooks = { ...((loaded.data.hooks as Record<string, GeminiEntry[]> | undefined) ?? {}) };
  for (const k of Object.keys(hooks)) {
    const kept = (Array.isArray(hooks[k]) ? hooks[k] : []).filter((e) => !isOursGemini(e));
    if (kept.length) hooks[k] = kept;
    else delete hooks[k];
  }
  for (const [geminiKey, hookEvent, matchAll] of GEMINI_EVENTS) {
    const entry: GeminiEntry = {
      ...(matchAll ? { matcher: "*" } : {}),
      hooks: [{ type: "command", command: opts.command(hookEvent), timeout: 5000 }],
    };
    hooks[geminiKey] = [...(hooks[geminiKey] ?? []), entry];
  }
  const next: Json = { ...loaded.data, hooks };
  if (JSON.stringify(next) === JSON.stringify(loaded.data)) return "already";
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "connected";
}

export function disconnectGemini(opts: { settingsPath: string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const hooks = { ...((loaded.data.hooks as Record<string, GeminiEntry[]> | undefined) ?? {}) };
  for (const k of Object.keys(hooks)) {
    const kept = (Array.isArray(hooks[k]) ? hooks[k] : []).filter((e) => !isOursGemini(e));
    if (kept.length) hooks[k] = kept;
    else delete hooks[k];
  }
  const next: Json = { ...loaded.data };
  if (Object.keys(hooks).length) next.hooks = hooks;
  else delete next.hooks;
  if (JSON.stringify(next) === JSON.stringify(loaded.data)) return "not_connected";
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "disconnected";
}

/* --------------------------------------------------------------- Codex CLI */

export const codexPathFor = (userHome = homedir()): string => join(userHome, ".codex", "config.toml");

const CODEX_COMMENT = "# agenttracking";

export function buildCodexNotifyLine(execPath: string, cliPath: string): string {
  const esc = (s: string) => JSON.stringify(s);
  return `notify = [${esc(execPath)}, ${esc(cliPath)}, "hook", "CodexNotify", "${MARKER}"] ${CODEX_COMMENT}`;
}

export function connectCodex(opts: { configPath: string; execPath?: string; cliPath: string }): ConnectResult {
  const raw = existsSync(opts.configPath) ? readFileSync(opts.configPath, "utf8") : null;
  const line = buildCodexNotifyLine(opts.execPath ?? process.execPath, opts.cliPath);
  const lines = raw ? raw.split(/\r?\n/) : [];

  // Check top-level section (before first [table]) for an existing notify = ...
  const firstTable = lines.findIndex((l) => /^\s*\[/.test(l));
  const topEnd = firstTable === -1 ? lines.length : firstTable;
  for (let i = 0; i < topEnd; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith("notify") || !/^notify\s*=/.test(trimmed)) continue;
    const isOurs = lines[i].includes(CODEX_COMMENT) || lines[i].includes("agenttracking");
    if (!isOurs) return "foreign_notify";
    if (lines[i] === line) return "already";
    lines[i] = line;
    saveWithBackup(opts.configPath, raw, lines.join("\n"));
    return "connected";
  }

  // Insert top-level notify before the first [table] so TOML keeps it at root scope.
  const updated = [...lines];
  if (firstTable === -1) {
    if (updated.length && updated[updated.length - 1] === "") updated.splice(updated.length - 1, 0, line);
    else updated.push(line, "");
  } else {
    updated.splice(firstTable, 0, line, "");
  }
  saveWithBackup(opts.configPath, raw, updated.join("\n"));
  return "connected";
}

export function disconnectCodex(opts: { configPath: string }): ConnectResult {
  if (!existsSync(opts.configPath)) return "not_connected";
  const raw = readFileSync(opts.configPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const kept = lines.filter((l) => !( /^notify\s*=/.test(l.trim()) && (l.includes(CODEX_COMMENT) || l.includes("agenttracking")) ));
  if (kept.length === lines.length) return "not_connected";
  saveWithBackup(opts.configPath, raw, kept.join("\n"));
  return "disconnected";
}

/* ----------------------------------------------------- Google Antigravity */

/**
 * Antigravity (agy) hooks.json format:
 * Top-level keys are named hook groups (e.g. "agenttracking"), so our group
 * coexists cleanly beside any user-defined hook groups ("lint-checker", etc.).
 * Global path: ~/.gemini/config/hooks.json; workspace path: .agents/hooks.json.
 */
export function agyPathFor(scope: "user" | "project", userHome = homedir(), cwd = process.cwd()): string {
  if (scope === "user") return join(userHome, ".gemini", "config", "hooks.json");
  return existsSync(join(cwd, ".agent", "hooks.json")) ? join(cwd, ".agent", "hooks.json") : join(cwd, ".agents", "hooks.json");
}

export function connectAgy(opts: { settingsPath: string; command: (event: string) => string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  const group = {
    SessionStart: [{ type: "command", command: opts.command("AgySessionStart"), timeout: 5 }],
    PreInvocation: [{ type: "command", command: opts.command("AgyPreInvocation"), timeout: 5 }],
    PostToolUse: [{ matcher: "*", hooks: [{ type: "command", command: opts.command("AgyPostToolUse"), timeout: 5 }] }],
    Stop: [{ type: "command", command: opts.command("AgyStop"), timeout: 5 }],
  };
  const next: Json = { ...loaded.data, agenttracking: group };
  if (JSON.stringify(next) === JSON.stringify(loaded.data)) return "already";
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "connected";
}

export function disconnectAgy(opts: { settingsPath: string }): ConnectResult {
  const loaded = loadJson(opts.settingsPath);
  if (loaded === "invalid_json") return "invalid_json";
  if (!("agenttracking" in loaded.data)) return "not_connected";
  const next: Json = { ...loaded.data };
  delete next.agenttracking;
  saveWithBackup(opts.settingsPath, loaded.raw, JSON.stringify(next, null, 2) + "\n");
  return "disconnected";
}
