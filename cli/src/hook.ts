import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { configDir, readConfig, type Config } from "./config.js";
import { label, type AgentEvent, type AgentEventType } from "./event.js";
import { appendEvent } from "./spool.js";

/**
 * Claude Code hook entry point: `agenttracking hook <Event>`.
 *
 * Reads the hook JSON from stdin, keeps a handful of fields, spools one event
 * and starts a detached sender. It never prints (some hook output is fed to
 * Claude as context), never exits non-zero, never waits on the network.
 * Tool input, tool output, prompts and transcript paths are read past, not kept.
 */

const MAP: Record<string, AgentEventType> = {
  SessionStart: "session_start", PreToolUse: "tool_start", PostToolUse: "tool_end", Stop: "turn_end",
  SubagentStop: "subagent_end", Notification: "notification", SessionEnd: "session_end",
};
export const HOOK_EVENTS = Object.keys(MAP);
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

export function eventFromHook(hookEvent: string, input: unknown, cfg: Config, now: number): AgentEvent | null {
  const type = MAP[hookEvent];
  if (!type || !input || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const session = typeof i.session_id === "string" && i.session_id ? i.session_id : "unknown-session";
  const event: AgentEvent = {
    v: 1, id: randomUUID(), type, at: now,
    agent: { kind: "claude", name: label(typeof i.cwd === "string" ? agentName(i.cwd) : ""), host: label(cfg.host) },
    run: createHmac("sha256", cfg.secret).update(session).digest("hex"),
  };
  if (type === "tool_start" || type === "tool_end") {
    event.tool = (typeof i.tool_name === "string" ? i.tool_name : "unknown").replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 128) || "unknown";
    if (type === "tool_end") {
      const r = i.tool_response as Record<string, unknown> | undefined;
      event.ok = !(r && typeof r === "object" && (r.is_error === true || r.success === false));
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

export async function runHook(hookEvent: string, stdin: NodeJS.ReadableStream = process.stdin, opts: { home?: string; spawnFlush?: boolean } = {}): Promise<void> {
  try {
    const raw = await readStdin(stdin);
    const cfg = readConfig(opts.home);
    if (!cfg) return;
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return; }
    const now = Date.now();
    const event = eventFromHook(hookEvent, input, cfg, now);
    if (!event) return;
    appendEvent(event, opts.home);
    if (opts.spawnFlush !== false && shouldFlush(opts.home, event.type, now)) {
      spawn(process.execPath, [...process.execArgv, process.argv[1], "flush"], { detached: true, stdio: "ignore", env: process.env }).unref();
    }
  } catch {
    // A tracking problem must never become the agent's problem.
  }
}
