import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { configDir, readConfig, type Config } from "./config.js";
import { label, type AgentEvent, type AgentEventType, type AgentKind } from "./event.js";
import { checkPreToolGuard, recordGuardOutcome } from "./guard.js";
import { captureSnapshot } from "./snapshot.js";
import { appendEvent } from "./spool.js";

/**
 * Multi-harness hook entry point: `agenttracking hook <Event>`.
 *
 * Supports Claude Code, Cursor, Gemini CLI and OpenAI Codex CLI.
 * Reads the hook JSON from stdin (or trailing argv JSON for Codex notify),
 * keeps only operational metadata, spools one event and starts a detached
 * sender. Tool inputs, prompts, responses and paths are never stored or sent.
 */

const CLAUDE_MAP: Record<string, AgentEventType> = {
  ConfigChange: "config_snapshot",
  UserPromptSubmit: "turn_start", StopFailure: "turn_error", SubagentStart: "subagent_start", PostToolUseFailure: "tool_end",
  SessionStart: "session_start", PreToolUse: "tool_start", PostToolUse: "tool_end", Stop: "turn_end",
  SubagentStop: "subagent_end", Notification: "notification", SessionEnd: "session_end",
};
export const HOOK_EVENTS = Object.keys(CLAUDE_MAP);

const GEMINI_MAP: Record<string, AgentEventType> = {
  GeminiSessionStart: "session_start",
  GeminiBeforeAgent: "turn_start",
  GeminiAfterAgent: "turn_end",
  GeminiBeforeTool: "tool_start",
  GeminiAfterTool: "tool_end",
  GeminiNotification: "notification",
  GeminiSessionEnd: "session_end",
};

const CURSOR_MAP: Record<string, AgentEventType> = {
  CursorBeforeShell: "tool_start",
  CursorBeforeMCP: "tool_start",
  CursorAfterEdit: "tool_end",
  CursorStop: "turn_end",
};

const STDIN_WAIT_MS = 50;
const FLUSH_EVERY_MS = 5000;

/**
 * The agent is named after its working folder. A throwaway temp folder (mkdtemp style,
 * "tool-k4tvbmnm" directly in the temp dir) loses its random suffix, so one tool's
 * many runs count as one agent instead of filling the agent limit.
 */
export function agentName(cwd: string): string {
  const base = basename(cwd);
  const parent = dirname(cwd);
  if (parent !== tmpdir() && parent !== "/tmp") return base;
  return base.replace(/-(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{6,8}$/, "") || base;
}

function cleanTool(raw: unknown, fallback = "unknown"): string {
  return (typeof raw === "string" ? raw : fallback).replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 128) || fallback;
}

export function eventFromHook(hookEvent: string, input: unknown, cfg: Config, now: number): AgentEvent | null {
  if (!input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;

  if (hookEvent === "CodexNotify") {
    const rawThread = typeof i["thread-id"] === "string" && i["thread-id"]
      ? i["thread-id"]
      : typeof i.thread_id === "string" && i.thread_id ? i.thread_id : "codex-session";
    const cwd = typeof i.cwd === "string" ? i.cwd : "";
    return {
      v: 1, id: randomUUID(), type: "turn_end", at: now,
      agent: { kind: "codex", name: label(cwd ? agentName(cwd) : "codex"), host: label(cfg.host) },
      run: createHmac("sha256", cfg.secret).update(`codex:${rawThread}`).digest("hex"),
    };
  }

  let kind: AgentKind = "claude";
  let type: AgentEventType | undefined = CLAUDE_MAP[hookEvent];
  if (!type && hookEvent in GEMINI_MAP) {
    kind = "gemini";
    type = GEMINI_MAP[hookEvent];
  } else if (!type && hookEvent in CURSOR_MAP) {
    kind = "cursor";
    type = CURSOR_MAP[hookEvent];
    if (hookEvent === "CursorStop" && i.status === "error") type = "turn_error";
  }
  if (!type) return null;

  if ((hookEvent === "Notification" || hookEvent === "GeminiNotification") && ["permission_prompt", "idle_prompt", "elicitation_dialog", "ToolPermission"].includes(String(i.notification_type))) {
    type = "waiting";
  }

  const rawSession =
    (typeof i.session_id === "string" && i.session_id) ||
    (typeof i.conversation_id === "string" && i.conversation_id) ||
    (typeof i.generation_id === "string" && i.generation_id) ||
    "unknown-session";

  const roots = Array.isArray(i.workspace_roots) ? i.workspace_roots : [];
  const rawCwd = typeof i.cwd === "string" ? i.cwd : typeof roots[0] === "string" ? roots[0] : "";

  const event: AgentEvent = {
    v: 1, id: randomUUID(), type, at: now,
    agent: { kind, name: label(rawCwd ? agentName(rawCwd) : kind), host: label(cfg.host) },
    run: createHmac("sha256", cfg.secret).update(kind === "claude" ? rawSession : `${kind}:${rawSession}`).digest("hex"),
  };
  const hash = (value: string) => createHmac("sha256", cfg.secret).update(rawSession + ":" + value).digest("hex");
  if (typeof i.tool_use_id === "string" && i.tool_use_id) event.callId = hash(i.tool_use_id);
  if ((type === "subagent_start" || type === "subagent_end") && typeof i.agent_id === "string") event.childId = hash(i.agent_id);
  if (type === "tool_start" || type === "tool_end") {
    const defaultTool = hookEvent === "CursorBeforeShell" ? "Shell" : hookEvent === "CursorAfterEdit" ? "Edit" : "unknown";
    event.tool = cleanTool(i.tool_name, defaultTool);
    if (type === "tool_end") {
      if (hookEvent === "CursorAfterEdit") event.ok = true;
      else {
        const r = i.tool_response as Record<string, unknown> | undefined;
        event.ok = hookEvent !== "PostToolUseFailure" && !(r && typeof r === "object" && (r.is_error === true || r.success === false || r.status === "error"));
      }
    }
  }
  return event;
}

function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    const done = () => { clearTimeout(timer); stream.removeAllListeners("data"); resolve(data); };
    const timer = setTimeout(done, STDIN_WAIT_MS);
    stream.on("data", (chunk) => { data += chunk; if (data.length > 1_000_000) done(); });
    stream.on("end", done);
    stream.on("error", done);
  });
}

function shouldFlush(home: string | undefined, type: AgentEventType, now: number): boolean {
  const file = join(configDir(home), "last-flush");
  let last = 0;
  try { last = Number(readFileSync(file, "utf8")) || 0; } catch { /* first time */ }
  if (type !== "session_end" && type !== "turn_end" && now - last < FLUSH_EVERY_MS) return false;
  writeFileSync(file, String(now));
  return true;
}

function formatBlockReply(hookEvent: string, reason: string): string {
  if (hookEvent.startsWith("Cursor")) {
    return JSON.stringify({ permission: "deny", user_message: reason, agent_message: reason }) + "\n";
  }
  if (hookEvent.startsWith("Gemini")) {
    return JSON.stringify({ decision: "deny", reason }) + "\n";
  }
  return JSON.stringify({ decision: "block", reason }) + "\n";
}

function extractGuardInput(hookEvent: string, input: Record<string, unknown>): unknown {
  if (hookEvent === "CursorBeforeShell" && typeof input.command === "string") return { command: input.command };
  return input.tool_input;
}

export async function runHook(
  hookEvent: string,
  stdin: NodeJS.ReadableStream = process.stdin,
  opts: { home?: string; spawnFlush?: boolean; stdout?: NodeJS.WritableStream; extraArgs?: string[] } = {},
): Promise<void> {
  try {
    const argJson = (opts.extraArgs ?? []).find((a) => a.trim().startsWith("{"));
    const raw = argJson ?? (await readStdin(stdin));
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return; }
    const now = Date.now();
    const cfg = readConfig(opts.home);
    const fallbackCfg: Config = cfg ?? { origin: "", token: "", secret: "local-guard", host: "local" };
    const event = eventFromHook(hookEvent, input, fallbackCfg, now);
    if (!event) return;
    const isPreTool = hookEvent === "PreToolUse" || hookEvent === "GeminiBeforeTool" || hookEvent === "CursorBeforeShell" || hookEvent === "CursorBeforeMCP";
    if (isPreTool && event.tool) {
      const verdict = checkPreToolGuard(event.run, event.agent.name, event.tool, opts.home, {
        now,
        toolInput: extractGuardInput(hookEvent, input as Record<string, unknown>),
      });
      if (verdict.block) {
        (opts.stdout ?? process.stdout).write(formatBlockReply(hookEvent, verdict.reason));
        if (!cfg) return;
        const waitingEvent: AgentEvent = { v: 1, id: event.id, type: "waiting", at: now, agent: event.agent, run: event.run };
        appendEvent(waitingEvent, opts.home);
        if (opts.spawnFlush !== false && shouldFlush(opts.home, waitingEvent.type, now)) {
          spawn(process.execPath, [...process.execArgv, process.argv[1], "flush"], { detached: true, stdio: "ignore", env: process.env }).unref();
        }
        return;
      }
    }
    recordGuardOutcome(event.run, event.type, event.ok, now, opts.home);
    if (!cfg) return;
    if ((event.type === "session_start" || event.type === "config_snapshot") && event.agent.kind === "claude") {
      const cwd = (input as { cwd?: unknown }).cwd;
      event.snapshot = captureSnapshot(cfg, typeof cwd === "string" ? cwd : "");
    }
    appendEvent(event, opts.home);
    if (opts.spawnFlush !== false && shouldFlush(opts.home, event.type, now)) {
      spawn(process.execPath, [...process.execArgv, process.argv[1], "flush"], { detached: true, stdio: "ignore", env: process.env }).unref();
    }
  } catch {
    // A tracking problem must never become the agent's problem.
  }
}
