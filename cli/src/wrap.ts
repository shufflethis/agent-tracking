import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:os";
import { readConfig } from "./config.js";
import { label, type AgentEvent } from "./event.js";
import { flush } from "./flush.js";
import { maskSecrets } from "./mask.js";
import { appendEvent } from "./spool.js";

/**
 * `agenttracking wrap --name <n> [--every 24h] [--tail N] -- <command...>`
 *
 * Runs the command exactly as cron would, passes its output through and exits
 * with its exit code. Around it: one start and one end event. Tracking can
 * never change the result of the job; at worst it is not reported.
 */

const UNITS: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

export function parseEvery(value: string): number | null {
  const m = /^(\d+)([mhd])$/.exec(value.trim());
  return m ? Number(m[1]) * UNITS[m[2]] : null;
}

type Options = { home?: string; flushTimeoutMs?: number; quiet?: boolean };
const USAGE = "Usage: agenttracking wrap --name <name> [--every 30m|2h|24h|7d] [--tail 1-50] [--check <task> --version <version>] -- <command> [args...]";

export async function wrap(argv: string[], opts: Options = {}): Promise<number> {
  const sep = argv.indexOf("--");
  const flags = sep === -1 ? argv : argv.slice(0, sep);
  const command = sep === -1 ? [] : argv.slice(sep + 1);
  const flag = (name: string) => { const i = flags.indexOf(name); return i === -1 ? undefined : flags[i + 1]; };
  const name = flag("--name");
  const checkName = flag("--check");
  const checkVersion = flag("--version");
  if ((checkName || checkVersion) && (!checkName || !checkVersion || !/^[A-Za-z0-9_.:-]{1,64}$/.test(checkName) || !/^[A-Za-z0-9_.:-]{1,64}$/.test(checkVersion))) { if (!opts.quiet) console.error(USAGE); return 2; }
  const every = flag("--every");
  const tailLines = Math.max(0, Math.min(50, Number(flag("--tail") ?? 0) || 0));
  if (!name || !command.length) { if (!opts.quiet) console.error(USAGE); return 2; }
  const expectEveryMs = every ? parseEvery(every) : null;
  if (every && expectEveryMs === null) { if (!opts.quiet) console.error(USAGE); return 2; }

  const cfg = readConfig(opts.home);
  if (!cfg && !opts.quiet) console.error("agenttracking: not logged in, running without reporting. Run: agenttracking login");
  const base = cfg ? { v: 1 as const, agent: { kind: "cron" as const, name: label(name), host: label(cfg.host) }, run: randomUUID() } : null;
  const report = (e: Omit<AgentEvent, "v" | "agent" | "run" | "id">) => {
    if (!base) return;
    try { appendEvent({ ...base, id: randomUUID(), ...e } as AgentEvent, opts.home); } catch { /* never fail the job */ }
  };

  const started = Date.now();
  report({ type: "cron_start", at: started, ...(expectEveryMs ? { expectEveryMs } : {}) });

  const recent: string[] = [];
  let partial = "";
  const exitCode = await new Promise<number>((resolve) => {
    const stdio = opts.quiet ? (["ignore", "ignore", tailLines ? "pipe" : "ignore"] as const) : (["inherit", "inherit", tailLines ? "pipe" : "inherit"] as const);
    const child = spawn(command[0], command.slice(1), { stdio: [...stdio] });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (!opts.quiet) process.stderr.write(chunk);
      const text = partial + chunk.toString("utf8");
      const parts = text.split("\n");
      partial = parts.pop() ?? "";
      recent.push(...parts);
      if (recent.length > tailLines) recent.splice(0, recent.length - tailLines);
    });
    child.on("error", () => resolve(127));
    child.on("close", (code, signal) => resolve(signal ? 128 + (constants.signals[signal] ?? 0) : code ?? 1));
  });
  if (partial) { recent.push(partial); if (recent.length > tailLines) recent.shift(); }

  const tail = tailLines && recent.length ? maskSecrets(recent.join("\n")).slice(-4000) : undefined;
  report({ type: "cron_end", at: Date.now(), exitCode: Math.min(255, exitCode), durationMs: Date.now() - started, ...(tail ? { tail } : {}), ...(checkName && checkVersion ? { checkName, checkVersion } : {}) });
  if (base) await Promise.race([flush(opts.home).catch(() => undefined), new Promise((r) => setTimeout(r, opts.flushTimeoutMs ?? 3000).unref())]);
  return exitCode;
}
