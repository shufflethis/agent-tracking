import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { configDir, readConfig } from "./config.js";
import { describeGuard } from "./guard.js";
import { maskSecrets } from "./mask.js";
import { spoolSize } from "./spool.js";

/**
 * Local-only machine discovery (`agenttracking doctor`).
 *
 * Inspects connection state, Claude Code hook installation, MCP server counts,
 * and crontab jobs on this machine. Nothing is sent over the network; MCP env
 * values and credentials are never read or printed.
 */

export type CronEntry = {
  schedule: string;
  wrapped: boolean;
  suggestedName: string;
  suggestedEvery: string | null;
  preview: string;
};

export type DoctorReport = {
  connected: { host: string; origin: string } | null;
  queuedEvents: number;
  authError: string | null;
  telemetryWarning: string | null;
  guard: string | null;
  claudeUserHooks: "connected" | "not_connected" | "invalid_json";
  claudeProjectHooks: "connected" | "not_connected" | "invalid_json";
  mcpServersTotal: number;
  cronJobs: CronEntry[];
};

function hookState(file: string): "connected" | "not_connected" | "invalid_json" {
  if (!existsSync(file)) return "not_connected";
  const raw = readFileSync(file, "utf8");
  if (!raw.trim()) return "not_connected";
  try {
    const parsed = JSON.parse(raw) as { hooks?: Record<string, { hooks?: { command?: string }[] }[]> };
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "invalid_json";
    const hooks = parsed.hooks ?? {};
    const found = Object.values(hooks).some((entries) =>
      Array.isArray(entries) && entries.some((e) =>
        (e.hooks ?? []).some((h) => typeof h.command === "string" && h.command.includes("agenttracking") && h.command.includes("hook")),
      ),
    );
    return found ? "connected" : "not_connected";
  } catch {
    return "invalid_json";
  }
}

function countMcpInFile(file: string): number {
  if (!existsSync(file)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { mcpServers?: unknown };
    const servers = parsed?.mcpServers;
    return servers && typeof servers === "object" && !Array.isArray(servers) ? Object.keys(servers).length : 0;
  } catch {
    return 0;
  }
}

function inferEvery(schedule: string): string | null {
  const s = schedule.trim().toLowerCase();
  if (s === "@hourly") return "1h";
  if (s === "@daily" || s === "@midnight") return "24h";
  if (s === "@weekly") return "168h";
  const fields = s.split(/\s+/);
  if (fields.length !== 5) return null;
  const [min, hour, dom, mon, dow] = fields;
  if (/^\d+$/.test(min) && hour === "*" && dom === "*" && mon === "*" && dow === "*") return "1h";
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === "*" && mon === "*" && dow === "*") return "24h";
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === "*" && mon === "*" && /^\d+$/.test(dow)) return "168h";
  const stepMin = /^\*\/(\d+)$/.exec(min);
  if (stepMin && hour === "*" && dom === "*" && mon === "*" && dow === "*") return `${stepMin[1]}m`;
  return null;
}

function inferCronName(cmd: string, index: number): string {
  const tokens = cmd
    .replace(/^\s*(?:cd\s+\S+\s*&&\s*|[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const skip = new Set(["sudo", "nice", "ionice", "flock", "timeout", "env", "bash", "sh", "zsh", "python", "python3", "node", "npx", "tsx", "ruby", "php", "perl"]);
  let candidate = tokens.find((t) => !t.startsWith("-") && !skip.has(basename(t))) ?? tokens[0] ?? `job-${index + 1}`;
  candidate = basename(candidate).replace(/\.(sh|py|js|ts|mjs|cjs|rb|pl|php)$/i, "");
  const clean = candidate.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return clean || `cron-${index + 1}`;
}

export function parseCrontab(text: string): CronEntry[] {
  const entries: CronEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)) continue;
    let schedule = "";
    let cmd = "";
    if (line.startsWith("@")) {
      const m = /^(@\w+)\s+(.+)$/.exec(line);
      if (!m || m[1].toLowerCase() === "@reboot") continue;
      schedule = m[1];
      cmd = m[2];
    } else {
      const m = /^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/.exec(line);
      if (!m) continue;
      schedule = m[1];
      cmd = m[2];
    }
    const wrapped = /\bagenttracking\b.*\bwrap\b/.test(cmd);
    entries.push({
      schedule,
      wrapped,
      suggestedName: inferCronName(cmd, entries.length),
      suggestedEvery: inferEvery(schedule),
      preview: maskSecrets(cmd).slice(0, 96),
    });
  }
  return entries;
}

function readSystemCrontab(): string {
  try {
    const r = spawnSync("crontab", ["-l"], { encoding: "utf8", timeout: 2000 });
    return r.status === 0 && typeof r.stdout === "string" ? r.stdout : "";
  } catch {
    return "";
  }
}

export function inspectMachine(opts: { home?: string; userHome?: string; cwd?: string; crontabText?: string } = {}): DoctorReport {
  const home = configDir(opts.home);
  const userHome = opts.userHome ?? homedir();
  const cwd = opts.cwd ?? process.cwd();
  const cfg = readConfig(home);
  const lossFile = join(home, "telemetry-loss");
  const authFile = join(home, "auth-error");
  const mcpFiles = [
    join(userHome, ".claude", "settings.json"),
    join(userHome, ".claude.json"),
    join(cwd, ".mcp.json"),
    join(userHome, ".cursor", "mcp.json"),
  ];
  const cronText = opts.crontabText !== undefined ? opts.crontabText : readSystemCrontab();
  return {
    connected: cfg ? { host: cfg.host, origin: cfg.origin } : null,
    queuedEvents: existsSync(home) ? spoolSize(home) : 0,
    authError: existsSync(authFile) ? readFileSync(authFile, "utf8").trim() : null,
    telemetryWarning: existsSync(lossFile) ? readFileSync(lossFile, "utf8").trim() : null,
    guard: describeGuard(home),
    claudeUserHooks: hookState(join(userHome, ".claude", "settings.json")),
    claudeProjectHooks: hookState(join(cwd, ".claude", "settings.json")),
    mcpServersTotal: mcpFiles.reduce((sum, f) => sum + countMcpInFile(f), 0),
    cronJobs: parseCrontab(cronText),
  };
}

const DOWNLOAD_CLI = "npx --yes https://agenttracking.co/downloads/agenttracking-0.4.0.tgz";

export function formatDoctorReport(r: DoctorReport): string {
  const lines: string[] = ["agenttracking doctor (local check only, nothing sent)", ""];
  lines.push(r.connected
    ? `[ok]      Account connection: host "${r.connected.host}" -> ${r.connected.origin} (${r.queuedEvents} queued)`
    : `[missing] Account connection: not connected. Run: ${DOWNLOAD_CLI} login`);
  if (r.authError) lines.push(`[warn]    Last send was refused (${r.authError}). Run: ${DOWNLOAD_CLI} login`);
  if (r.telemetryWarning) lines.push(`[warn]    Queue warning: ${r.telemetryWarning}`);
  lines.push(r.claudeUserHooks === "connected"
    ? "[ok]      Claude Code hooks (user): connected"
    : r.claudeUserHooks === "invalid_json"
      ? "[warn]    Claude Code hooks (user): ~/.claude/settings.json is invalid JSON"
      : r.claudeProjectHooks === "connected"
        ? "[ok]      Claude Code hooks (project): connected"
        : `[missing] Claude Code hooks: not installed. Run: ${DOWNLOAD_CLI} connect claude`);
  lines.push(`[info]    Local MCP servers configured: ${r.mcpServersTotal} (names and credentials stay local)`);
  lines.push(`[info]    Local guard: ${r.guard ?? "inactive (optional: agenttracking guard --max-failures 5)"}`);

  const wrapped = r.cronJobs.filter((c) => c.wrapped);
  const unwrapped = r.cronJobs.filter((c) => !c.wrapped);
  lines.push(`[info]    Crontab jobs: ${r.cronJobs.length} found (${wrapped.length} wrapped, ${unwrapped.length} unwrapped)`);
  for (const job of unwrapped.slice(0, 8)) {
    const every = job.suggestedEvery ? ` --every ${job.suggestedEvery}` : "";
    lines.push(`          -> unwrapped [${job.schedule}]: ${job.preview}`);
    lines.push(`             wrap with: ${DOWNLOAD_CLI} wrap --name ${job.suggestedName}${every} -- <command>`);
  }
  return lines.join("\n") + "\n";
}

export async function runDoctor(args: string[]): Promise<number> {
  const report = inspectMachine();
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else process.stdout.write(formatDoctorReport(report));
  return 0;
}
