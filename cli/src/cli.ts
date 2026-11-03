#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { configDir, readConfig } from "./config.js";
import { connectClaude, defaultCommand, disconnectClaude, installRuntime, settingsPathFor } from "./connect-claude.js";
import { flush } from "./flush.js";
import { login } from "./login.js";
import { runHook } from "./hook.js";
import { spoolSize } from "./spool.js";
import { observe } from "./observe.js";
import { captureSnapshot } from "./snapshot.js";
import { wrap } from "./wrap.js";

const HELP = `agenttracking: see what your agents did while you slept

  agenttracking login                 connect this machine to your account
  agenttracking connect claude        track Claude Code sessions (user settings)
  agenttracking disconnect claude     remove the hooks again
  agenttracking wrap --name <n> [--every 24h] [--tail 20] -- <command...>
                                      run a cron command and report start, end, exit code
  agenttracking wrap --name eval --check booking --version v1 -- ./check.sh
                                      record a named task check, using its exit code
  agenttracking snapshot              preview sanitized configuration metadata
  agenttracking observe --pid <PID> --name <agent> [--seconds 60]
                                      optional Linux eBPF observation (requires bpftrace)
  agenttracking status                show this machine's connection
  agenttracking flush                 send queued events now

Lifecycle status, hashed IDs and configuration fingerprints/counts are sent.
Optional Linux observation sends operation types only. No prompts, tool payloads
or file contents. Cron --tail explicitly adds masked stderr. https://agenttracking.co/docs
`;

type Command = (args: string[]) => Promise<number>;
const commands: Record<string, Command> = {
  async hook(args) { await runHook(args[0] ?? ""); return 0; },
  async flush() { await flush(); return 0; },
  observe,
  async snapshot() { const cfg = readConfig(); if (!cfg) throw new Error("Connect this machine first"); console.log(JSON.stringify(captureSnapshot(cfg, process.cwd()), null, 2)); return 0; },
  wrap: (args) => wrap(args),
  async login(args) {
    const value = (name: string) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1]; };
    return (await login({ token: value("--token"), origin: value("--origin"), host: value("--host") })) === "ok" ? 0 : 1;
  },
  async connect(args) {
    if (args[0] !== "claude") { console.log("Usage: agenttracking connect claude [--project]"); return 1; }
    if (!readConfig() && (await login()) !== "ok") return 1;
    const settingsPath = process.env.AGENTTRACKING_CLAUDE_SETTINGS ?? settingsPathFor(args.includes("--project") ? "project" : "user");
    const result = connectClaude({ settingsPath, command: defaultCommand(installRuntime()) });
    if (result === "invalid_json") { console.log(`${settingsPath} is not valid JSON. Nothing was changed. Fix the file and run this again.`); return 1; }
    console.log(result === "already" ? `Already connected (${settingsPath}).` : `Connected. Claude Code sessions are tracked from the next session on (${settingsPath}; a backup is next to it).`);
    return 0;
  },
  async disconnect(args) {
    if (args[0] !== "claude") { console.log("Usage: agenttracking disconnect claude [--project]"); return 1; }
    const settingsPath = process.env.AGENTTRACKING_CLAUDE_SETTINGS ?? settingsPathFor(args.includes("--project") ? "project" : "user");
    const result = disconnectClaude({ settingsPath });
    if (result === "invalid_json") { console.log(`${settingsPath} is not valid JSON. Nothing was changed.`); return 1; }
    console.log(result === "disconnected" ? `Removed the agenttracking hooks from ${settingsPath}.` : `No agenttracking hooks in ${settingsPath}.`);
    return 0;
  },
  async status() {
    const c = readConfig();
    if (!c) { console.log("Not connected. Run: agenttracking login"); return 1; }
    console.log(`Connected as host "${c.host}" to ${c.origin}`);
    console.log(`Queued events: ${spoolSize()}`);
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
