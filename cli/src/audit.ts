import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { configDir } from "./config.js";
import { inspectMachine } from "./doctor.js";
import { describeGuard } from "./guard.js";

/**
 * Local-only security, MCP & cost-readiness audit (`agenttracking audit`).
 *
 * Runs 100% offline with zero network calls and no account required.
 * Inspects coding-agent harnesses (Claude Code, Cursor, Codex CLI, Gemini CLI,
 * Antigravity), MCP server configurations, overly broad permission rules,
 * local circuit-breaker guardrails, and unwrapped cron jobs.
 *
 * Secret values, prompts, and file contents are NEVER printed or exported.
 */

export type AuditSeverity = "high" | "medium" | "low" | "pass";

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  category: "guardrail" | "mcp" | "permissions" | "cron" | "hooks";
  title: string;
  detail: string;
  fix?: string;
};

export type AuditReport = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  harnessesConnected: number;
  mcpServersTotal: number;
  unpinnedNpxMcps: number;
  cleartextHttpMcps: number;
  mcpInlineSecretsCount: number;
  broadPermissionCount: number;
  unwrappedCronCount: number;
  guardActive: boolean;
  findings: AuditFinding[];
};

const SECRET_KEY_RE = /(key|token|secret|password|passwd|auth|bearer|pat|credential)/i;
const BROAD_PERMISSION_RE = /^(?:Bash(?:\(\*\)|\(\s*\))?|Edit\(\*\)|Write\(\*\)|MultiEdit\(\*\)|\*)$/i;

type McpInspection = {
  total: number;
  unpinnedNpx: number;
  cleartextHttp: number;
  inlineSecrets: number;
};

function readJson(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function inspectMcpConfig(file: string): McpInspection {
  const out: McpInspection = { total: 0, unpinnedNpx: 0, cleartextHttp: 0, inlineSecrets: 0 };
  const parsed = readJson(file);
  const raw = parsed?.mcpServers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const cfg of Object.values(raw as Record<string, unknown>)) {
    if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) continue;
    out.total += 1;
    const entry = cfg as Record<string, unknown>;
    const command = typeof entry.command === "string" ? entry.command.trim() : "";
    const args = Array.isArray(entry.args) ? entry.args.filter((a): a is string => typeof a === "string") : [];
    const url = typeof entry.url === "string" ? entry.url.trim() : typeof entry.serverUrl === "string" ? entry.serverUrl.trim() : "";

    // Unpinned `npx <pkg>` (no explicit @version) can silently pull a compromised release.
    if (/(?:^|\/)npx$/.test(command)) {
      const pkg = args.find((a) => !a.startsWith("-"));
      if (pkg && !/^@?[^@]+@\d/.test(pkg) && !pkg.startsWith(".") && !pkg.startsWith("/")) {
        out.unpinnedNpx += 1;
      }
    }

    // Cleartext http:// remote MCP (excluding loopback localhost / 127.0.0.1 / ::1).
    if (/^http:\/\//i.test(url) && !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(url)) {
      out.cleartextHttp += 1;
    }

    // Inline secret-like env vars or headers stored directly in plaintext JSON (count only, never read values).
    const env = entry.env;
    if (env && typeof env === "object" && !Array.isArray(env)) {
      for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
        if (SECRET_KEY_RE.test(k) && typeof v === "string" && v.trim().length > 0 && !v.trim().startsWith("${")) {
          out.inlineSecrets += 1;
          break;
        }
      }
    }
  }
  return out;
}

function inspectPermissions(file: string): { broad: number; skipPrompts: boolean } {
  const parsed = readJson(file);
  if (!parsed) return { broad: 0, skipPrompts: false };
  let broad = 0;
  let skipPrompts = Boolean(parsed.dangerouslySkipPermissions || parsed.bypassPermissions);
  const perms = parsed.permissions;
  if (perms && typeof perms === "object" && !Array.isArray(perms)) {
    const p = perms as Record<string, unknown>;
    if (p.defaultMode === "bypassPermissions") skipPrompts = true;
    const allow = Array.isArray(p.allow) ? p.allow : [];
    for (const rule of allow) {
      if (typeof rule === "string" && BROAD_PERMISSION_RE.test(rule.trim())) broad += 1;
    }
  }
  return { broad, skipPrompts };
}

function gradeFor(score: number): AuditReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function runLocalAudit(opts: { home?: string; userHome?: string; cwd?: string; crontabText?: string } = {}): AuditReport {
  const home = configDir(opts.home);
  const userHome = opts.userHome ?? homedir();
  const cwd = opts.cwd ?? process.cwd();
  const doc = inspectMachine(opts);
  const guardText = describeGuard(home);

  const mcpFiles = [
    join(userHome, ".claude", "settings.json"),
    join(userHome, ".claude.json"),
    join(cwd, ".mcp.json"),
    join(userHome, ".cursor", "mcp.json"),
    join(userHome, ".gemini", "settings.json"),
    join(userHome, ".gemini", "antigravity", "mcp_config.json"),
  ];

  const mcp: McpInspection = { total: 0, unpinnedNpx: 0, cleartextHttp: 0, inlineSecrets: 0 };
  for (const f of mcpFiles) {
    const r = inspectMcpConfig(f);
    mcp.total += r.total;
    mcp.unpinnedNpx += r.unpinnedNpx;
    mcp.cleartextHttp += r.cleartextHttp;
    mcp.inlineSecrets += r.inlineSecrets;
  }

  const permFiles = [
    join(userHome, ".claude", "settings.json"),
    join(cwd, ".claude", "settings.json"),
    join(userHome, ".gemini", "settings.json"),
    join(cwd, ".gemini", "settings.json"),
  ];
  let broadPermissionCount = 0;
  let skipPrompts = false;
  for (const f of permFiles) {
    const p = inspectPermissions(f);
    broadPermissionCount += p.broad;
    if (p.skipPrompts) skipPrompts = true;
  }

  const harnessesConnected = [
    doc.claudeUserHooks === "connected" || doc.claudeProjectHooks === "connected",
    doc.agyUserHooks === "connected" || doc.agyProjectHooks === "connected",
    doc.cursorUserHooks === "connected" || doc.cursorProjectHooks === "connected",
    doc.geminiUserHooks === "connected" || doc.geminiProjectHooks === "connected",
    doc.codexHooks === "connected",
  ].filter(Boolean).length;

  const unwrappedCronCount = doc.cronJobs.filter((c) => !c.wrapped).length;
  const guardActive = Boolean(guardText);
  const hasLoopCap = Boolean(guardText && (/max \d+ consecutive|max \d+ tool calls|max \d+ min/i.test(guardText)));
  const hasDestructiveBlock = Boolean(guardText && /destructive shell fuse on/i.test(guardText));

  const findings: AuditFinding[] = [];
  let score = 100;

  if (!hasLoopCap) {
    score -= 22;
    findings.push({
      id: "no-loop-guard",
      severity: "high",
      category: "guardrail",
      title: "No runaway-loop or spend circuit breaker configured",
      detail: "An autonomous coding session can spin on failing tool calls overnight and burn tokens without stopping.",
      fix: "agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45",
    });
  } else {
    findings.push({
      id: "loop-guard-ok",
      severity: "pass",
      category: "guardrail",
      title: "Local loop & turn-budget circuit breaker active",
      detail: guardText ?? "",
    });
  }

  if (!hasDestructiveBlock) {
    score -= 18;
    findings.push({
      id: "no-destructive-fuse",
      severity: "high",
      category: "guardrail",
      title: "Destructive shell command fuse is off",
      detail: "Dangerous commands (rm -rf /, git push --force, DROP DATABASE) are not blocked locally before execution.",
      fix: "agenttracking guard --block-destructive on",
    });
  } else {
    findings.push({
      id: "destructive-fuse-ok",
      severity: "pass",
      category: "guardrail",
      title: "Local destructive shell fuse enabled",
      detail: "PreToolUse hooks block dangerous shell patterns on-device before execution.",
    });
  }

  if (skipPrompts || broadPermissionCount > 0) {
    score -= skipPrompts ? 20 : 12;
    findings.push({
      id: "broad-permissions",
      severity: "high",
      category: "permissions",
      title: skipPrompts ? "Permission bypass mode enabled in agent config" : `${broadPermissionCount} wildcard permission allow rule(s) detected`,
      detail: "Blanket Bash(*)/Write(*) rules or bypass mode remove human approval gates. Pair them with a local guard fuse.",
      fix: "Tighten permissions.allow in settings.json and enable: agenttracking guard --block-destructive on --max-failures 5",
    });
  } else {
    findings.push({
      id: "permissions-ok",
      severity: "pass",
      category: "permissions",
      title: "No blanket wildcard permission rules found",
      detail: "Checked Claude Code and Gemini CLI settings files.",
    });
  }

  if (mcp.cleartextHttp > 0) {
    score -= 18;
    findings.push({
      id: "mcp-cleartext-http",
      severity: "high",
      category: "mcp",
      title: `${mcp.cleartextHttp} remote MCP server(s) use unencrypted http://`,
      detail: "Non-localhost MCP servers over cleartext HTTP expose tool payloads and headers to interception.",
      fix: "Switch remote MCP endpoints to https:// or bind them to localhost.",
    });
  }

  if (mcp.unpinnedNpx > 0) {
    score -= 12;
    findings.push({
      id: "mcp-unpinned-npx",
      severity: "medium",
      category: "mcp",
      title: `${mcp.unpinnedNpx} MCP server(s) run unpinned npx packages`,
      detail: "Running npx without an explicit @version allows upstream supply-chain drift on every restart.",
      fix: "Pin each MCP package to an exact version (e.g. @vendor/mcp-server@1.2.3) in your MCP config.",
    });
  }

  if (mcp.inlineSecrets > 0) {
    score -= 8;
    findings.push({
      id: "mcp-inline-secrets",
      severity: "medium",
      category: "mcp",
      title: `${mcp.inlineSecrets} MCP server config(s) contain inline plaintext secret env vars`,
      detail: "Hardcoded tokens in JSON configs risk accidental commits or broad exposure (values are never read or sent).",
      fix: "Move credentials to a secret manager or shell environment references instead of static JSON.",
    });
  }

  if (mcp.total > 0 && mcp.cleartextHttp === 0 && mcp.unpinnedNpx === 0 && mcp.inlineSecrets === 0) {
    findings.push({
      id: "mcp-ok",
      severity: "pass",
      category: "mcp",
      title: `${mcp.total} local MCP server(s) passed baseline checks`,
      detail: "No cleartext remote URLs, unpinned npx servers, or plaintext inline secret keys flagged.",
    });
  }

  if (unwrappedCronCount > 0) {
    score -= Math.min(14, unwrappedCronCount * 4);
    findings.push({
      id: "unwrapped-crons",
      severity: "medium",
      category: "cron",
      title: `${unwrappedCronCount} crontab job(s) have no missed-run or stall monitoring`,
      detail: "Standard cron only emails after a process exits. Hung or skipped jobs fail silently.",
      fix: "Run `agenttracking doctor` to see suggested `agenttracking wrap --every ...` commands.",
    });
  } else if (doc.cronJobs.length > 0) {
    findings.push({
      id: "crons-ok",
      severity: "pass",
      category: "cron",
      title: `All ${doc.cronJobs.length} crontab job(s) are wrapped`,
      detail: "Missed runs, stalls, and non-zero exit codes are monitored.",
    });
  }

  if (harnessesConnected === 0) {
    score -= 10;
    findings.push({
      id: "no-hooks",
      severity: "low",
      category: "hooks",
      title: "No coding-agent hooks connected yet",
      detail: "Local guardrails and stall/waiting alerts require hooks in Claude Code, Cursor, Codex, Gemini, or Antigravity.",
      fix: "agenttracking connect all  (or connect claude / cursor / codex / gemini / agy)",
    });
  } else {
    findings.push({
      id: "hooks-ok",
      severity: "pass",
      category: "hooks",
      title: `${harnessesConnected} coding-agent harness(es) hooked`,
      detail: doc.connected ? `Connected to ${doc.connected.origin} as "${doc.connected.host}".` : "Hooks installed locally (offline mode).",
    });
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    grade: gradeFor(score),
    harnessesConnected,
    mcpServersTotal: mcp.total,
    unpinnedNpxMcps: mcp.unpinnedNpx,
    cleartextHttpMcps: mcp.cleartextHttp,
    mcpInlineSecretsCount: mcp.inlineSecrets,
    broadPermissionCount,
    unwrappedCronCount,
    guardActive,
    findings,
  };
}

export function formatAuditReport(r: AuditReport): string {
  const badge: Record<AuditSeverity, string> = {
    high: "[HIGH]  ",
    medium: "[MED]   ",
    low: "[LOW]   ",
    pass: "[PASS]  ",
  };
  const lines: string[] = [
    "agenttracking audit — local agent safety, MCP & cost-readiness check",
    "100% offline. Zero network calls. No prompts, code, or secret values leave this machine.",
    "",
    `Score: ${r.score}/100 (Grade ${r.grade}) · Harnesses: ${r.harnessesConnected} · MCP servers: ${r.mcpServersTotal} · Unwrapped crons: ${r.unwrappedCronCount}`,
    "",
  ];
  for (const f of r.findings) {
    lines.push(`${badge[f.severity]} ${f.title}`);
    if (f.detail) lines.push(`         ${f.detail}`);
    if (f.fix) lines.push(`         Fix: ${f.fix}`);
  }
  lines.push("");
  if (r.score < 90) {
    lines.push("Quick hardening (100% local, no account needed):");
    lines.push("  agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on");
    lines.push("");
  }
  lines.push("Want instant Telegram/Slack/Discord alerts + MCP drift tracking across machines? (Free for 5 agents)");
  lines.push("  agenttracking connect all   # https://agenttracking.co");
  return lines.join("\n") + "\n";
}

export async function runAudit(args: string[]): Promise<number> {
  const report = runLocalAudit();
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else process.stdout.write(formatAuditReport(report));
  return 0;
}
