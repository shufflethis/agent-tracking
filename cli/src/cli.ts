#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { configDir, readConfig } from "./config.js";
import { flush } from "./flush.js";
import { runHook } from "./hook.js";
import { spoolSize } from "./spool.js";

const HELP = `agenttracking: see what your agents did while you slept

  agenttracking login                 connect this machine to your account
  agenttracking connect claude        track Claude Code sessions (user settings)
  agenttracking disconnect claude     remove the hooks again
  agenttracking wrap --name <n> [--every 24h] [--tail 20] -- <command...>
                                      run a cron command and report start, end, exit code
  agenttracking status                show this machine's connection
  agenttracking flush                 send queued events now

Only run status is sent: start, end, exit code, tool names. Never prompts,
tool input or output, or file contents. https://agenttracking.co/docs
`;

type Command = (args: string[]) => Promise<number>;
const commands: Record<string, Command> = {
  async hook(args) { await runHook(args[0] ?? ""); return 0; },
  async flush() { await flush(); return 0; },
  async status() {
    const c = readConfig();
    if (!c) { console.log("Not connected. Run: agenttracking login"); return 1; }
    console.log(`Connected as host "${c.host}" to ${c.origin}`);
    console.log(`Queued events: ${spoolSize()}`);
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
