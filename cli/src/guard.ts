import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { configDir, ensureDir } from "./config.js";
import { label } from "./event.js";

/**
 * Opt-in local PreToolUse circuit breaker & safety fuse (~/.agenttracking/guard.json).
 *
 * Default cost is one stat() call when guard.json is absent. No network call,
 * and nothing from prompts or tool inputs is ever written to disk or sent over
 * the network: `--block-destructive` inspects a shell command strictly in local
 * RAM and discards it immediately, emitting only a category name on block.
 */

export type GuardPolicy = {
  paused?: { target: string; reason: string; at: number } | null;
  maxConsecutiveFailures?: number | null;
  maxCallsPerTurn?: number | null;
  maxTurnMinutes?: number | null;
  blockDestructive?: boolean;
  denyTools?: string[];
};

type RunGuardEntry = {
  streak?: number;
  calls?: number;
  turnStartedAt?: number;
  at: number;
};

type GuardState = Record<string, RunGuardEntry>;

const guardPath = (home?: string) => join(configDir(home), "guard.json");
const statePath = (home?: string) => join(configDir(home), "guard-state.json");

const DESTRUCTIVE_PATTERNS: readonly [RegExp, string][] = [
  [/\brm\s+(?:-[A-Za-z]*r[A-Za-z]*f|-[A-Za-z]*f[A-Za-z]*r|--recursive\s+--force|--force\s+--recursive)\s+(?:\/(?:\s|$|\*)|~(?:\s|\/|$)|\$HOME\b|\.(?:\s|$)|\*)/, "rm -rf root/home/workspace"],
  [/\bgit\s+push\b(?=[^\n;&|]*(?:\s--force\b|\s-[A-Za-z]*f\b))(?![^\n;&|]*--force-with-lease)/, "git push --force"],
  [/\bgit\s+(?:reset\s+--hard|clean\s+-[A-Za-z]*(?:fd|df)[A-Za-z]*)\b/, "git reset --hard / clean -fd"],
  [/\b(?:DROP\s+(?:DATABASE|SCHEMA|TABLE)|TRUNCATE\s+TABLE)\b/i, "SQL DROP/TRUNCATE"],
  [/\b(?:mkfs(?:\.\w+)?|dd\s+[^\n]*\bof=\/dev\/(?:sd|nvme|vd|disk))/i, "raw disk overwrite"],
];

/** Purely in-memory check. Never logs, stores, or returns the command string itself. */
export function inspectDestructiveInput(toolInput: unknown): string | null {
  let command: string | null = null;
  if (typeof toolInput === "string") command = toolInput;
  else if (toolInput && typeof toolInput === "object") {
    const obj = toolInput as Record<string, unknown>;
    if (typeof obj.command === "string") command = obj.command;
    else if (typeof obj.cmd === "string") command = obj.cmd;
  }
  if (!command) return null;
  const sample = command.slice(0, 8192);
  for (const [re, category] of DESTRUCTIVE_PATTERNS) {
    if (re.test(sample)) return category;
  }
  return null;
}

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

function hasActiveRules(policy: GuardPolicy): boolean {
  return Boolean(
    (policy.paused && policy.paused.target) ||
    (typeof policy.maxConsecutiveFailures === "number" && policy.maxConsecutiveFailures > 0) ||
    (typeof policy.maxCallsPerTurn === "number" && policy.maxCallsPerTurn > 0) ||
    (typeof policy.maxTurnMinutes === "number" && policy.maxTurnMinutes > 0) ||
    policy.blockDestructive === true ||
    (policy.denyTools ?? []).some(Boolean),
  );
}

export function writeGuard(policy: GuardPolicy, home?: string): void {
  const deny = (policy.denyTools ?? []).filter(Boolean);
  const file = join(ensureDir(home), "guard.json");
  if (!hasActiveRules(policy)) {
    if (existsSync(file)) unlinkSync(file);
    const s = statePath(home);
    if (existsSync(s)) unlinkSync(s);
    return;
  }
  const clean: GuardPolicy = {
    ...(policy.paused?.target ? { paused: policy.paused } : {}),
    ...(typeof policy.maxConsecutiveFailures === "number" && policy.maxConsecutiveFailures > 0 ? { maxConsecutiveFailures: policy.maxConsecutiveFailures } : {}),
    ...(typeof policy.maxCallsPerTurn === "number" && policy.maxCallsPerTurn > 0 ? { maxCallsPerTurn: policy.maxCallsPerTurn } : {}),
    ...(typeof policy.maxTurnMinutes === "number" && policy.maxTurnMinutes > 0 ? { maxTurnMinutes: policy.maxTurnMinutes } : {}),
    ...(policy.blockDestructive ? { blockDestructive: true } : {}),
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
    .filter(([, v]) => v && ((v.streak ?? 0) > 0 || (v.calls ?? 0) > 0 || (v.turnStartedAt ?? 0) > 0))
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
  opts: { now?: number; toolInput?: unknown } = {},
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
  if (policy.blockDestructive && opts.toolInput !== undefined) {
    const category = inspectDestructiveInput(opts.toolInput);
    if (category) {
      return {
        block: true,
        reason: `agenttracking guard: blocked destructive command (${category}) by local safety fuse. Run 'agenttracking guard --block-destructive off' to disable.`,
      };
    }
  }
  const needsState = Boolean(
    (policy.maxConsecutiveFailures && policy.maxConsecutiveFailures > 0) ||
    (policy.maxCallsPerTurn && policy.maxCallsPerTurn > 0) ||
    (policy.maxTurnMinutes && policy.maxTurnMinutes > 0),
  );
  if (!needsState) return { block: false };

  const entry = readState(home)[runKey];
  if (policy.maxConsecutiveFailures && policy.maxConsecutiveFailures > 0 && (entry?.streak ?? 0) >= policy.maxConsecutiveFailures) {
    return {
      block: true,
      reason: `agenttracking guard: stopped after ${entry!.streak} consecutive failed tool calls. Send a new prompt or run 'agenttracking resume' to continue.`,
    };
  }
  if (policy.maxCallsPerTurn && policy.maxCallsPerTurn > 0 && (entry?.calls ?? 0) >= policy.maxCallsPerTurn) {
    return {
      block: true,
      reason: `agenttracking guard: stopped after ${entry!.calls} tool calls in one autonomous turn (max ${policy.maxCallsPerTurn}). Send a new prompt or run 'agenttracking resume' to continue.`,
    };
  }
  const now = opts.now ?? Date.now();
  if (policy.maxTurnMinutes && policy.maxTurnMinutes > 0 && entry?.turnStartedAt && now - entry.turnStartedAt >= policy.maxTurnMinutes * 60_000) {
    const elapsed = Math.floor((now - entry.turnStartedAt) / 60_000);
    return {
      block: true,
      reason: `agenttracking guard: stopped after ${elapsed} min in one autonomous turn (max ${policy.maxTurnMinutes} min). Send a new prompt or run 'agenttracking resume' to continue.`,
    };
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
  if (!policy) return;
  const trackStreak = Boolean(policy.maxConsecutiveFailures && policy.maxConsecutiveFailures > 0);
  const trackCalls = Boolean(policy.maxCallsPerTurn && policy.maxCallsPerTurn > 0);
  const trackMinutes = Boolean(policy.maxTurnMinutes && policy.maxTurnMinutes > 0);
  if (!trackStreak && !trackCalls && !trackMinutes) return;

  if (eventType === "turn_end" || eventType === "turn_error" || eventType === "session_end") {
    const state = readState(home);
    if (state[runKey]) {
      delete state[runKey];
      writeState(state, home);
    }
    return;
  }

  if (eventType === "invocation_start") {
    if (trackMinutes) {
      const state = readState(home);
      if (!state[runKey]?.turnStartedAt) {
        state[runKey] = { ...state[runKey], turnStartedAt: now, at: now };
        writeState(state, home);
      }
    }
    return;
  }

  if (eventType === "turn_start" || eventType === "session_start") {
    const state = readState(home);
    if (trackMinutes) {
      state[runKey] = { turnStartedAt: now, at: now };
      writeState(state, home);
    } else if (state[runKey]) {
      delete state[runKey];
      writeState(state, home);
    }
    return;
  }

  if (eventType === "tool_start" && (trackCalls || trackMinutes)) {
    const state = readState(home);
    const prev = state[runKey];
    state[runKey] = {
      ...prev,
      ...(trackCalls ? { calls: (prev?.calls ?? 0) + 1 } : {}),
      ...(trackMinutes ? { turnStartedAt: prev?.turnStartedAt ?? now } : {}),
      at: now,
    };
    writeState(state, home);
    return;
  }

  if (eventType !== "tool_end" || !trackStreak) return;
  const state = readState(home);
  const prev = state[runKey];
  if (ok === false) {
    state[runKey] = { ...prev, streak: (prev?.streak ?? 0) + 1, at: now };
    writeState(state, home);
  } else if (prev?.streak) {
    const next: RunGuardEntry = { ...prev, at: now };
    delete next.streak;
    if (!next.calls && !next.turnStartedAt) delete state[runKey];
    else state[runKey] = next;
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
  if (policy.maxCallsPerTurn) parts.push(`max ${policy.maxCallsPerTurn} tool calls/turn`);
  if (policy.maxTurnMinutes) parts.push(`max ${policy.maxTurnMinutes} min/turn`);
  if (policy.blockDestructive) parts.push("destructive shell fuse on");
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
  console.log(`Paused ${target === "*" ? "all connected agent sessions on this machine" : `agent "${target}"`}. Next tool call will stop cleanly. Run: agenttracking resume`);
  return 0;
}

export async function runResume(_args: string[], home?: string): Promise<number> {
  const current = readGuard(home);
  if (current) writeGuard({ ...current, paused: null }, home);
  writeState({}, home);
  console.log("Resumed. Local pause, turn budgets and failure streaks cleared.");
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
  const maxCallsRaw = value("--max-calls");
  const maxMinutesRaw = value("--max-minutes");
  const destructiveRaw = value("--block-destructive");
  const denyTool = value("--deny-tool");
  const allowTool = value("--allow-tool");
  if (
    maxRaw === undefined &&
    maxCallsRaw === undefined &&
    maxMinutesRaw === undefined &&
    destructiveRaw === undefined &&
    !denyTool &&
    !allowTool
  ) {
    const desc = describeGuard(home);
    console.log(desc ? `Local guard: ${desc}` : "Local guard: inactive (no rules configured).");
    console.log("Usage: agenttracking guard [--max-failures <2..100|off>] [--max-calls <5..5000|off>] [--max-minutes <1..1440|off>] [--block-destructive <on|off>] [--deny-tool <Tool>] [--allow-tool <Tool>] [--reset]");
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
  if (maxCallsRaw !== undefined) {
    if (maxCallsRaw === "off" || maxCallsRaw === "0") next.maxCallsPerTurn = null;
    else {
      const n = Number(maxCallsRaw);
      if (!Number.isInteger(n) || n < 5 || n > 5000) {
        console.log("--max-calls must be an integer between 5 and 5000, or 'off'.");
        return 1;
      }
      next.maxCallsPerTurn = n;
    }
  }
  if (maxMinutesRaw !== undefined) {
    if (maxMinutesRaw === "off" || maxMinutesRaw === "0") next.maxTurnMinutes = null;
    else {
      const n = Number(maxMinutesRaw);
      if (!Number.isInteger(n) || n < 1 || n > 1440) {
        console.log("--max-minutes must be an integer between 1 and 1440, or 'off'.");
        return 1;
      }
      next.maxTurnMinutes = n;
    }
  }
  if (destructiveRaw !== undefined) {
    if (destructiveRaw === "on" || destructiveRaw === "true" || destructiveRaw === "1") next.blockDestructive = true;
    else if (destructiveRaw === "off" || destructiveRaw === "false" || destructiveRaw === "0") next.blockDestructive = false;
    else {
      console.log("--block-destructive must be 'on' or 'off'.");
      return 1;
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
