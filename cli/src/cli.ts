#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { configDir, readConfig } from "./config.js";
import { connectClaude, defaultCommand, disconnectClaude, installRuntime, settingsPathFor } from "./connect-claude.js";
import { agyPathFor, codexPathFor, connectAgy, connectCodex, connectCursor, connectGemini, cursorPathFor, disconnectAgy, disconnectCodex, disconnectCursor, disconnectGemini, geminiPathFor } from "./connect-harnesses.js";
import { runAudit } from "./audit.js";
import { runDoctor } from "./doctor.js";
import { runFix } from "./fix.js";
import { flush } from "./flush.js";
import { describeGuard, runGuardCommand, runPause, runResume } from "./guard.js";
import { login } from "./login.js";
import { runHook } from "./hook.js";
import { spoolSize } from "./spool.js";
import { observe } from "./observe.js";
import { captureSnapshot } from "./snapshot.js";
import { runUpgrade } from "./upgrade.js";
import { wrap } from "./wrap.js";

const HELP = `agenttracking: see what your agents did while you slept

  agenttracking login                 connect this machine to your account
  agenttracking connect <target> [--project]
                                      track claude | agy | cursor | codex | gemini | all
  agenttracking disconnect <target> [--project]
                                      remove hooks for claude | agy | cursor | codex | gemini | all
  agenttracking audit [--share|--json] 100% offline security, MCP & cost-readiness audit (no login)
  agenttracking fix [--yes|--dry-run] 1-command auto-fix (guardrails + pin MCPs + externalize secrets)
  agenttracking doctor                check hooks, crontab jobs and local MCP count
  agenttracking wrap --name <n> [--kind cron|agy|codex|...] [--every 24h] [--tail 20] -- <cmd...>
                                      run a cron/CI command and report start, end, exit code
  agenttracking wrap --name eval --check booking --version v1 -- ./check.sh
                                      record a named task check, using its exit code
  agenttracking pause [--agent <n>] [--reason <text>]
                                      locally pause connected agent tool calls on this machine
  agenttracking resume                clear local pause, turn budgets and failure streaks
  agenttracking guard [--max-failures <n|off>] [--max-calls <n|off>] [--max-minutes <m|off>]
                      [--block-destructive <on|off>] [--deny-tool <Tool>] [--reset]
                                      configure local-only safety & runaway-loop circuit breaker
  agenttracking snapshot              preview sanitized configuration metadata
  agenttracking observe --pid <PID> --name <agent> [--seconds 60]
                                      optional Linux eBPF observation (requires bpftrace)
  agenttracking upgrade [--yes]       upgrade CLI to latest version ([Y/n], Enter = Yes)
  agenttracking status                show this machine's connection
  agenttracking flush                 send queued events now

Lifecycle status, hashed IDs and configuration fingerprints/counts are sent.
Optional Linux observation sends operation types only. No prompts, tool payloads
or file contents. Cron --tail explicitly adds masked stderr. https://agenttracking.co/docs
`;

const TARGETS = ["claude", "agy", "cursor", "codex", "gemini"] as const;
type Target = typeof TARGETS[number];

function connectOne(target: Target, scope: "user" | "project", cliPath: string): number {
  const command = defaultCommand(cliPath);
  if (target === "claude") {
    const p = process.env.AGENTTRACKING_CLAUDE_SETTINGS ?? settingsPathFor(scope);
    const r = connectClaude({ settingsPath: p, command });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "already" ? `Claude Code: already connected (${p}).` : `Claude Code: connected (${p}; backup saved next to it).`);
    return 0;
  }
  if (target === "agy") {
    const p = agyPathFor(scope);
    const r = connectAgy({ settingsPath: p, command });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "already" ? `Antigravity (agy): already connected (${p}).` : `Antigravity (agy): connected (${p}; backup saved next to it).`);
    return 0;
  }
  if (target === "cursor") {
    const p = cursorPathFor(scope);
    const r = connectCursor({ settingsPath: p, command });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "already" ? `Cursor: already connected (${p}).` : `Cursor: connected (${p}; backup saved next to it).`);
    return 0;
  }
  if (target === "gemini") {
    const p = geminiPathFor(scope);
    const r = connectGemini({ settingsPath: p, command });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "already" ? `Gemini CLI: already connected (${p}).` : `Gemini CLI: connected (${p}; backup saved next to it).`);
    return 0;
  }
  const p = codexPathFor();
  const r = connectCodex({ configPath: p, cliPath });
  if (r === "foreign_notify") {
    console.log(`Codex CLI: ${p} already has a custom 'notify' entry; left untouched. Use 'agenttracking wrap --kind codex --name <n> -- codex ...' instead.`);
    return 0;
  }
  console.log(r === "already" ? `Codex CLI: already connected (${p}).` : `Codex CLI: connected (${p}; backup saved next to it).`);
  return 0;
}

function disconnectOne(target: Target, scope: "user" | "project"): number {
  if (target === "claude") {
    const p = process.env.AGENTTRACKING_CLAUDE_SETTINGS ?? settingsPathFor(scope);
    const r = disconnectClaude({ settingsPath: p });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "disconnected" ? `Removed agenttracking hooks from ${p}.` : `No agenttracking hooks in ${p}.`);
    return 0;
  }
  if (target === "agy") {
    const p = agyPathFor(scope);
    const r = disconnectAgy({ settingsPath: p });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "disconnected" ? `Removed agenttracking hooks from ${p}.` : `No agenttracking hooks in ${p}.`);
    return 0;
  }
  if (target === "cursor") {
    const p = cursorPathFor(scope);
    const r = disconnectCursor({ settingsPath: p });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "disconnected" ? `Removed agenttracking hooks from ${p}.` : `No agenttracking hooks in ${p}.`);
    return 0;
  }
  if (target === "gemini") {
    const p = geminiPathFor(scope);
    const r = disconnectGemini({ settingsPath: p });
    if (r === "invalid_json") { console.log(`${p} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(r === "disconnected" ? `Removed agenttracking hooks from ${p}.` : `No agenttracking hooks in ${p}.`);
    return 0;
  }
  const p = codexPathFor();
  const r = disconnectCodex({ configPath: p });
  console.log(r === "disconnected" ? `Removed agenttracking notify from ${p}.` : `No agenttracking notify in ${p}.`);
  return 0;
}

type Command = (args: string[]) => Promise<number>;
const commands: Record<string, Command> = {
  async hook(args) { await runHook(args[0] ?? "", process.stdin, { extraArgs: args.slice(1) }); return 0; },
  async flush() { await flush(); return 0; },
  audit: (args) => runAudit(args),
  fix: (args) => runFix(args),
  doctor: (args) => runDoctor(args),
  upgrade: (args) => runUpgrade(args),
  pause: (args) => runPause(args),
  resume: (args) => runResume(args),
  guard: (args) => runGuardCommand(args),
  observe,
  async snapshot() { const cfg = readConfig(); if (!cfg) throw new Error("Connect this machine first"); console.log(JSON.stringify(captureSnapshot(cfg, process.cwd()), null, 2)); return 0; },
  wrap: (args) => wrap(args),
  async login(args) {
    const value = (name: string) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
    return (await login({ token: value("--token"), origin: value("--origin"), host: value("--host") })) === "ok" ? 0 : 1;
  },
  async connect(args) {
    const target = args[0] as Target | "all" | undefined;
    if (!target || (target !== "all" && !TARGETS.includes(target))) {
      console.log("Usage: agenttracking connect <claude|agy|cursor|codex|gemini|all> [--project]");
      return 1;
    }
    if (!readConfig() && (await login()) !== "ok") return 1;
    const scope = args.includes("--project") ? "project" : "user";
    const cliPath = installRuntime();
    const list: readonly Target[] = target === "all" ? TARGETS : [target];
    let rc = 0;
    for (const t of list) if (connectOne(t, scope, cliPath) !== 0) rc = 1;
    return rc;
  },
  async disconnect(args) {
    const target = args[0] as Target | "all" | undefined;
    if (!target || (target !== "all" && !TARGETS.includes(target))) {
      console.log("Usage: agenttracking disconnect <claude|agy|cursor|codex|gemini|all> [--project]");
      return 1;
    }
    const scope = args.includes("--project") ? "project" : "user";
    const list: readonly Target[] = target === "all" ? TARGETS : [target];
    let rc = 0;
    for (const t of list) if (disconnectOne(t, scope) !== 0) rc = 1;
    return rc;
  },
  async status() {
    const c = readConfig();
    if (!c) { console.log("Not connected. Run: agenttracking login"); return 1; }
    console.log(`Connected as host "${c.host}" to ${c.origin}`);
    console.log(`Queued events: ${spoolSize()}`);
    const guard = describeGuard();
    if (guard) console.log(`Local guard: ${guard}`);
    const loss = join(configDir(), "telemetry-loss");
    if (existsSync(loss)) console.log(`Telemetry warning: ${readFileSync(loss, "utf8").trim()}`);
    const auth = join(configDir(), "auth-error");
    if (existsSync(auth)) console.log(`Last send was refused (${readFileSync(auth, "utf8").trim()}). Run: agenttracking login`);
    return 0;
  },
};

async function main(argv: string[]): Promise<number> {
  const [name, ...rest] = argv;
  const command = name ? commands[name] : undefined;
  if (!command) { process.stdout.write(HELP); return name && name !== "help" && name !== "--help" ? 1 : 0; }
  return command(rest);
}

const isHook = process.argv[2] === "hook";
main(process.argv.slice(2)).then(
  (code) => { process.exitCode = isHook ? 0 : code; },
  (error) => { if (!isHook) console.error(error instanceof Error ? error.message : error); process.exitCode = isHook ? 0 : 1; },
);
