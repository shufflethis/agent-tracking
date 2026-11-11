import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { configDir, ensureDir } from "./config.js";
import { label } from "./event.js";

/**
 * Opt-in local PreToolUse circuit breaker (~/.agenttracking/guard.json).
 *
 * Default cost is one stat() call when guard.json is absent. No network call,
 * no prompt inspection, no tool argument inspection: only local pause state,
 * optional tool-name denylist, and per-session consecutive failure streak.
 */

export type GuardPolicy = {
  paused?: { target: string; reason: string; at: number } | null;
  maxConsecutiveFailures?: number | null;
  denyTools?: string[];
};

type GuardState = Record<string, { streak: number; at: number }>;

const guardPath = (home?: string) => join(configDir(home), "guard.json");
const statePath = (home?: string) => join(configDir(home), "guard-state.json");

export function readGuard(home?: string): GuardPolicy | null {
  const file = guardPath(home);
  if (!existsSync(file)) return null;
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as GuardPolicy;
    return raw && typeof raw === "object" ? raw : null;
  } catch {
    return null;
  }
}

export function writeGuard(policy: GuardPolicy, home?: string): void {
  const hasPause = Boolean(policy.paused && policy.paused.target);
  const hasMax = typeof policy.maxConsecutiveFailures === "number" && policy.maxConsecutiveFailures > 0;
  const deny = (policy.denyTools ?? []).filter(Boolean);
  const file = join(ensureDir(home), "guard.json");
  if (!hasPause && !hasMax && deny.length === 0) {
    if (existsSync(file)) unlinkSync(file);
    const s = statePath(home);
    if (existsSync(s)) unlinkSync(s);
    return;
  }
  const clean: GuardPolicy = {
    ...(hasPause ? { paused: policy.paused } : {}),
    ...(hasMax ? { maxConsecutiveFailures: policy.maxConsecutiveFailures } : {}),
    ...(deny.length ? { denyTools: [...new Set(deny)] } : {}),
  };
  writeFileSync(file, JSON.stringify(clean, null, 2) + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
}

function readState(home?: string): GuardState {
  const file = statePath(home);
  if (!existsSync(file)) return {};
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as GuardState;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeState(state: GuardState, home?: string): void {
  const entries = Object.entries(state)
    .filter(([, v]) => v && typeof v.streak === "number" && v.streak > 0)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 50);
  const file = join(ensureDir(home), "guard-state.json");
  if (entries.length === 0) {
    if (existsSync(file)) unlinkSync(file);
    return;
  }
  writeFileSync(file, JSON.stringify(Object.fromEntries(entries)) + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function checkPreToolGuard(
  runKey: string,
  agentName: string,
  toolName: string,
  home?: string,
): { block: false } | { block: true; reason: string } {
  const policy = readGuard(home);
  if (!policy) return { block: false };
  if (policy.paused && (policy.paused.target === "*" || policy.paused.target === agentName)) {
    const detail = policy.paused.reason ? ` (${policy.paused.reason})` : "";
    return {
      block: true,
      reason: `agenttracking guard: paused locally${detail}. Run 'agenttracking resume' on this machine to continue.`,
    };
  }
  if (policy.denyTools?.includes(toolName)) {
    return {
      block: true,
      reason: `agenttracking guard: tool '${toolName}' is blocked by local policy. Run 'agenttracking guard --allow-tool ${toolName}' to allow.`,
    };
  }
  if (policy.maxConsecutiveFailures && policy.maxConsecutiveFailures > 0) {
    const streak = readState(home)[runKey]?.streak ?? 0;
    if (streak >= policy.maxConsecutiveFailures) {
      return {
        block: true,
        reason: `agenttracking guard: stopped after ${streak} consecutive failed tool calls. Send a new prompt or run 'agenttracking resume' to continue.`,
      };
    }
  }
  return { block: false };
}

export function recordGuardOutcome(
  runKey: string,
  eventType: string,
  ok: boolean | undefined,
  now: number,
  home?: string,
): void {
  const policy = readGuard(home);
  if (!policy?.maxConsecutiveFailures || policy.maxConsecutiveFailures <= 0) return;
  if (eventType === "turn_start" || eventType === "session_start") {
    const state = readState(home);
    if (state[runKey]) {
      delete state[runKey];
      writeState(state, home);
    }
    return;
  }
  if (eventType !== "tool_end") return;
  const state = readState(home);
  if (ok === false) {
    state[runKey] = { streak: (state[runKey]?.streak ?? 0) + 1, at: now };
    writeState(state, home);
  } else if (state[runKey]) {
    delete state[runKey];
    writeState(state, home);
  }
}

export function describeGuard(home?: string): string | null {
  const policy = readGuard(home);
  if (!policy) return null;
  const parts: string[] = [];
  if (policy.paused) {
    const scope = policy.paused.target === "*" ? "all agents" : `agent "${policy.paused.target}"`;
    parts.push(`paused (${scope}${policy.paused.reason ? `: ${policy.paused.reason}` : ""})`);
  }
  if (policy.maxConsecutiveFailures) parts.push(`max ${policy.maxConsecutiveFailures} consecutive tool failures`);
  if (policy.denyTools?.length) parts.push(`blocked tools: ${policy.denyTools.join(", ")}`);
  return parts.length ? parts.join("; ") : null;
}

export async function runPause(args: string[], home?: string): Promise<number> {
  const value = (flag: string) => { const i = args.indexOf(flag); return i === -1 ? undefined : args[i + 1]; };
  const rawAgent = value("--agent");
  const target = rawAgent ? label(rawAgent) : "*";
  const reason = (value("--reason") ?? "manual pause").slice(0, 140);
  const current = readGuard(home) ?? {};
  writeGuard({ ...current, paused: { target, reason, at: Date.now() } }, home);
  console.log(`Paused ${target === "*" ? "all Claude Code sessions on this machine" : `agent "${target}"`}. Next tool call will stop cleanly. Run: agenttracking resume`);
  return 0;
}

export async function runResume(_args: string[], home?: string): Promise<number> {
  const current = readGuard(home);
  if (current) writeGuard({ ...current, paused: null }, home);
  writeState({}, home);
  console.log("Resumed. Local pause and failure streaks cleared.");
  return 0;
}

export async function runGuardCommand(args: string[], home?: string): Promise<number> {
  if (args.includes("--reset")) {
    writeGuard({}, home);
    console.log("Local guard cleared.");
    return 0;
  }
  const value = (flag: string) => { const i = args.indexOf(flag); return i === -1 ? undefined : args[i + 1]; };
  const maxRaw = value("--max-failures");
  const denyTool = value("--deny-tool");
  const allowTool = value("--allow-tool");
  if (maxRaw === undefined && !denyTool && !allowTool) {
    const desc = describeGuard(home);
    console.log(desc ? `Local guard: ${desc}` : "Local guard: inactive (no rules configured).");
    console.log("Usage: agenttracking guard [--max-failures <n|off>] [--deny-tool <Tool>] [--allow-tool <Tool>] [--reset]");
    return 0;
  }
  const next: GuardPolicy = { ...(readGuard(home) ?? {}) };
  if (maxRaw !== undefined) {
    if (maxRaw === "off" || maxRaw === "0") next.maxConsecutiveFailures = null;
    else {
      const n = Number(maxRaw);
      if (!Number.isInteger(n) || n < 2 || n > 100) {
        console.log("--max-failures must be an integer between 2 and 100, or 'off'.");
        return 1;
      }
      next.maxConsecutiveFailures = n;
    }
  }
  const deny = new Set(next.denyTools ?? []);
  if (denyTool) deny.add(denyTool.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 128));
  if (allowTool) deny.delete(allowTool);
  next.denyTools = [...deny];
  writeGuard(next, home);
  const desc = describeGuard(home);
  console.log(desc ? `Local guard updated: ${desc}` : "Local guard cleared.");
  return 0;
}
