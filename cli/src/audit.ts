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
 * Secret VALUES, prompts, and file contents are NEVER printed or exported.
 * Local terminal output only shows local config paths, MCP server names,
 * unpinned package names, and secret env var KEY names so the developer knows
 * concretely what to fix on their own machine.
 */

export type AuditSeverity = "high" | "medium" | "low" | "pass";

export type McpItemIssue = {
  server: string;
  file: string;
  detail: string;
  suggestion: string;
};

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  category: "guardrail" | "mcp" | "permissions" | "cron" | "hooks";
  title: string;
  detail: string;
  pointsLost: number;
  items?: McpItemIssue[];
  fix?: string;
};

export type HarnessStatus = {
  name: string;
  target: "claude" | "cursor" | "codex" | "gemini" | "agy";
  detected: boolean;
  connected: boolean;
};

export type AuditReport = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  harnessesConnected: number;
  harnesses: HarnessStatus[];
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
  unpinnedNpx: McpItemIssue[];
  cleartextHttp: McpItemIssue[];
  inlineSecrets: McpItemIssue[];
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

function shortPath(file: string, userHome: string, cwd: string): string {
  if (cwd !== userHome && file.startsWith(cwd + "/")) return "./" + file.slice(cwd.length + 1);
  if (file.startsWith(userHome + "/")) return "~/" + file.slice(userHome.length + 1);
  return file;
}

function inspectMcpConfig(file: string, displayFile: string): McpInspection {
  const out: McpInspection = { total: 0, unpinnedNpx: [], cleartextHttp: [], inlineSecrets: [] };
  const parsed = readJson(file);
  const raw = parsed?.mcpServers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [serverName, cfg] of Object.entries(raw as Record<string, unknown>)) {
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
        out.unpinnedNpx.push({
          server: serverName,
          file: displayFile,
          detail: `npx ${pkg}`,
          suggestion: `Pin to ${pkg}@<exact-version> in ${displayFile}`,
        });
      }
    }

    // Cleartext http:// remote MCP (excluding loopback localhost / 127.0.0.1 / ::1).
    if (/^http:\/\//i.test(url) && !/^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/i.test(url)) {
      let host = "remote host";
      try { host = new URL(url).host; } catch {}
      out.cleartextHttp.push({
        server: serverName,
        file: displayFile,
        detail: `http://${host}`,
        suggestion: `Change to https://${host} in ${displayFile}`,
      });
    }

    // Inline secret-like env vars stored directly in plaintext JSON (KEY NAME only — NEVER read/print value).
    const env = entry.env;
    if (env && typeof env === "object" && !Array.isArray(env)) {
      const flaggedKeys: string[] = [];
      for (const [k, v] of Object.entries(env as Record<string, unknown>)) {
        if (SECRET_KEY_RE.test(k) && typeof v === "string" && v.trim().length > 0 && !v.trim().startsWith("${")) {
          flaggedKeys.push(k);
        }
      }
      if (flaggedKeys.length > 0) {
        out.inlineSecrets.push({
          server: serverName,
          file: displayFile,
          detail: `env key${flaggedKeys.length > 1 ? "s" : ""}: ${flaggedKeys.join(", ")}`,
          suggestion: `Replace literal value with \${${flaggedKeys[0]}} or move to secret manager`,
        });
      }
    }
  }
  return out;
}

function inspectPermissions(file: string, displayFile: string): { items: McpItemIssue[]; skipPrompts: boolean } {
  const parsed = readJson(file);
  if (!parsed) return { items: [], skipPrompts: false };
  const items: McpItemIssue[] = [];
  let skipPrompts = Boolean(parsed.dangerouslySkipPermissions || parsed.bypassPermissions);
  const perms = parsed.permissions;
  if (perms && typeof perms === "object" && !Array.isArray(perms)) {
    const p = perms as Record<string, unknown>;
    if (p.defaultMode === "bypassPermissions") skipPrompts = true;
    const allow = Array.isArray(p.allow) ? p.allow : [];
    for (const rule of allow) {
      if (typeof rule === "string" && BROAD_PERMISSION_RE.test(rule.trim())) {
        items.push({
          server: rule.trim(),
          file: displayFile,
          detail: `wildcard allow rule "${rule.trim()}"`,
          suggestion: `Narrow to specific commands (e.g. Bash(npm test:*)) in ${displayFile}`,
        });
      }
    }
  }
  if (skipPrompts) {
    items.push({
      server: "bypassPermissions",
      file: displayFile,
      detail: "permission bypass mode enabled",
      suggestion: `Disable bypass mode or pair with agenttracking guard --block-destructive on`,
    });
  }
  return { items, skipPrompts };
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

  const mcp: McpInspection = { total: 0, unpinnedNpx: [], cleartextHttp: [], inlineSecrets: [] };
  for (const f of mcpFiles) {
    const r = inspectMcpConfig(f, shortPath(f, userHome, cwd));
    mcp.total += r.total;
    mcp.unpinnedNpx.push(...r.unpinnedNpx);
    mcp.cleartextHttp.push(...r.cleartextHttp);
    mcp.inlineSecrets.push(...r.inlineSecrets);
  }

  const permFiles = [
    join(userHome, ".claude", "settings.json"),
    join(cwd, ".claude", "settings.json"),
    join(userHome, ".gemini", "settings.json"),
    join(cwd, ".gemini", "settings.json"),
  ];
  const permItems: McpItemIssue[] = [];
  let skipPrompts = false;
  for (const f of permFiles) {
    const p = inspectPermissions(f, shortPath(f, userHome, cwd));
    permItems.push(...p.items);
    if (p.skipPrompts) skipPrompts = true;
  }

  const harnesses: HarnessStatus[] = [
    {
      name: "Claude Code",
      target: "claude",
      detected: existsSync(join(userHome, ".claude")) || existsSync(join(userHome, ".claude.json")) || existsSync(join(cwd, ".claude")),
      connected: doc.claudeUserHooks === "connected" || doc.claudeProjectHooks === "connected",
    },
    {
      name: "Cursor",
      target: "cursor",
      detected: existsSync(join(userHome, ".cursor")) || existsSync(join(cwd, ".cursor")),
      connected: doc.cursorUserHooks === "connected" || doc.cursorProjectHooks === "connected",
    },
    {
      name: "Codex CLI",
      target: "codex",
      detected: existsSync(join(userHome, ".codex")),
      connected: doc.codexHooks === "connected",
    },
    {
      name: "Gemini CLI",
      target: "gemini",
      detected: existsSync(join(userHome, ".gemini", "settings.json")) || existsSync(join(cwd, ".gemini")),
      connected: doc.geminiUserHooks === "connected" || doc.geminiProjectHooks === "connected",
    },
    {
      name: "Antigravity (agy)",
      target: "agy",
      detected: existsSync(join(userHome, ".gemini", "antigravity")) || existsSync(join(userHome, ".gemini", "config", "hooks.json")) || existsSync(join(cwd, ".agent")),
      connected: doc.agyUserHooks === "connected" || doc.agyProjectHooks === "connected",
    },
  ];

  const harnessesConnected = harnesses.filter((h) => h.connected).length;
  const unwrappedCrons = doc.cronJobs.filter((c) => !c.wrapped);
  const unwrappedCronCount = unwrappedCrons.length;
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
      detail: "An autonomous session can repeat failing tool calls overnight and burn $50–$180 in tokens without stopping.",
      pointsLost: 22,
      fix: "agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45",
    });
  } else {
    findings.push({
      id: "loop-guard-ok",
      severity: "pass",
      category: "guardrail",
      title: "Local loop & turn-budget circuit breaker active",
      detail: guardText ?? "",
      pointsLost: 0,
    });
  }

  if (!hasDestructiveBlock) {
    score -= 18;
    findings.push({
      id: "no-destructive-fuse",
      severity: "high",
      category: "guardrail",
      title: "Destructive shell command fuse is off",
      detail: "Dangerous commands (rm -rf /, git push --force, git reset --hard, DROP DATABASE) are not blocked locally.",
      pointsLost: 18,
      fix: "agenttracking guard --block-destructive on",
    });
  } else {
    findings.push({
      id: "destructive-fuse-ok",
      severity: "pass",
      category: "guardrail",
      title: "Local destructive shell fuse enabled",
      detail: "PreToolUse hooks block dangerous shell patterns on-device in <2 ms.",
      pointsLost: 0,
    });
  }

  if (skipPrompts || permItems.length > 0) {
    const pts = skipPrompts ? 20 : 12;
    score -= pts;
    findings.push({
      id: "broad-permissions",
      severity: "high",
      category: "permissions",
      title: skipPrompts ? "Permission bypass mode enabled in agent config" : `${permItems.length} wildcard permission allow rule(s) detected`,
      detail: "Blanket Bash(*)/Write(*) rules remove human approval gates. Narrow them or enforce local guardrails.",
      pointsLost: pts,
      items: permItems,
      fix: "Tighten permissions.allow in settings.json and enable: agenttracking guard --block-destructive on --max-failures 5",
    });
  } else {
    findings.push({
      id: "permissions-ok",
      severity: "pass",
      category: "permissions",
      title: "No blanket wildcard permission rules found",
      detail: "Checked Claude Code and Gemini CLI settings files.",
      pointsLost: 0,
    });
  }

  if (mcp.cleartextHttp.length > 0) {
    score -= 18;
    findings.push({
      id: "mcp-cleartext-http",
      severity: "high",
      category: "mcp",
      title: `${mcp.cleartextHttp.length} remote MCP server(s) use unencrypted http://`,
      detail: "Non-localhost MCP endpoints over cleartext HTTP expose auth headers and tool payloads on the network.",
      pointsLost: 18,
      items: mcp.cleartextHttp,
      fix: "Switch remote MCP URLs to https:// or bind them to localhost.",
    });
  }

  if (mcp.unpinnedNpx.length > 0) {
    score -= 12;
    findings.push({
      id: "mcp-unpinned-npx",
      severity: "medium",
      category: "mcp",
      title: `${mcp.unpinnedNpx.length} MCP server(s) run unpinned npx packages`,
      detail: "Running npx without an explicit @version pulls upstream updates automatically (supply-chain drift risk).",
      pointsLost: 12,
      items: mcp.unpinnedNpx,
      fix: "Pin each package to an exact version (e.g. @vendor/mcp@1.2.3) in the config file(s) listed below.",
    });
  }

  if (mcp.inlineSecrets.length > 0) {
    score -= 8;
    findings.push({
      id: "mcp-inline-secrets",
      severity: "medium",
      category: "mcp",
      title: `${mcp.inlineSecrets.length} MCP server config(s) contain inline plaintext secret env vars`,
      detail: "Hardcoded tokens in JSON configs risk accidental commits or broad exposure (values are never read or printed).",
      pointsLost: 8,
      items: mcp.inlineSecrets,
      fix: "Replace literal values with ${ENV_VAR} references loaded from your shell/secret manager.",
    });
  }

  if (mcp.total > 0 && mcp.cleartextHttp.length === 0 && mcp.unpinnedNpx.length === 0 && mcp.inlineSecrets.length === 0) {
    findings.push({
      id: "mcp-ok",
      severity: "pass",
      category: "mcp",
      title: `${mcp.total} local MCP server(s) passed baseline checks`,
      detail: "No cleartext remote URLs, unpinned npx servers, or plaintext inline secret keys flagged.",
      pointsLost: 0,
    });
  }

  if (unwrappedCronCount > 0) {
    const pts = Math.min(14, unwrappedCronCount * 4);
    score -= pts;
    findings.push({
      id: "unwrapped-crons",
      severity: "medium",
      category: "cron",
      title: `${unwrappedCronCount} crontab job(s) have no missed-run or stall monitoring`,
      detail: "Standard cron only emails after a process exits. Hung or skipped jobs fail silently.",
      pointsLost: pts,
      items: unwrappedCrons.slice(0, 6).map((j) => ({
        server: j.suggestedName,
        file: `crontab (${j.schedule})`,
        detail: j.preview,
        suggestion: `agenttracking wrap --name ${j.suggestedName}${j.suggestedEvery ? ` --every ${j.suggestedEvery}` : ""} -- <cmd>`,
      })),
      fix: "Run `agenttracking doctor` to copy ready-made `agenttracking wrap` lines.",
    });
  } else if (doc.cronJobs.length > 0) {
    findings.push({
      id: "crons-ok",
      severity: "pass",
      category: "cron",
      title: `All ${doc.cronJobs.length} crontab job(s) are wrapped`,
      detail: "Missed runs, stalls, and non-zero exit codes are monitored.",
      pointsLost: 0,
    });
  }

  const unhookedDetected = harnesses.filter((h) => h.detected && !h.connected);
  if (harnessesConnected === 0) {
    score -= 10;
    findings.push({
      id: "no-hooks",
      severity: "low",
      category: "hooks",
      title: "No coding-agent hooks connected yet",
      detail: "Local guardrails and stall/waiting alerts require hooks in Claude Code, Cursor, Codex, Gemini, or Antigravity.",
      pointsLost: 10,
      fix: "agenttracking connect all",
    });
  } else {
    const names = harnesses.filter((h) => h.connected).map((h) => h.name).join(", ");
    findings.push({
      id: "hooks-ok",
      severity: "pass",
      category: "hooks",
      title: `${harnessesConnected} coding-agent harness(es) hooked (${names})`,
      detail: unhookedDetected.length > 0
        ? `Also detected on this machine (not hooked yet): ${unhookedDetected.map((h) => h.name).join(", ")}.`
        : doc.connected
          ? `Connected to ${doc.connected.origin} as "${doc.connected.host}".`
          : "Hooks installed locally (offline mode).",
      pointsLost: 0,
      ...(unhookedDetected.length > 0 ? { fix: `agenttracking connect all` } : {}),
    });
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    grade: gradeFor(score),
    harnessesConnected,
    harnesses,
    mcpServersTotal: mcp.total,
    unpinnedNpxMcps: mcp.unpinnedNpx.length,
    cleartextHttpMcps: mcp.cleartextHttp.length,
    mcpInlineSecretsCount: mcp.inlineSecrets.length,
    broadPermissionCount: permItems.length,
    unwrappedCronCount,
    guardActive,
    findings,
  };
}

function makePalette(useColor: boolean) {
  const wrap = (code: string) => (text: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
  return {
    bold: wrap("1"),
    dim: wrap("2"),
    cyan: wrap("38;5;80"),
    violet: wrap("38;5;141"),
    green: wrap("38;5;114"),
    yellow: wrap("38;5;221"),
    red: wrap("38;5;203"),
    white: wrap("97"),
    bgRed: wrap("1;97;41"),
    bgYellow: wrap("1;30;43"),
    bgCyan: wrap("1;30;46"),
    bgGreen: wrap("1;30;42"),
  };
}

function scoreBar(score: number, c: ReturnType<typeof makePalette>): string {
  const width = 24;
  const filled = Math.round((score / 100) * width);
  const empty = Math.max(0, width - filled);
  const color = score >= 85 ? c.green : score >= 60 ? c.yellow : c.red;
  return `${color("█".repeat(filled))}${c.dim("░".repeat(empty))}`;
}

export function formatAuditReport(r: AuditReport, opts: { color?: boolean; share?: boolean } = {}): string {
  const useColor = opts.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const share = Boolean(opts.share);
  const c = makePalette(useColor);
  const gradeColor = r.score >= 85 ? c.green : r.score >= 60 ? c.yellow : c.red;

  const lines: string[] = [];
  const bar = scoreBar(r.score, c);
  const rule = c.dim("─".repeat(72));

  lines.push("");
  lines.push(c.cyan("╭──────────────────────────────────────────────────────────────────────╮"));
  lines.push(
    c.cyan("│ ") +
    c.bold(c.white("AGENT TRACKING AUDIT")) +
    c.dim("  ·  100% offline · zero network · zero secrets  ") +
    c.cyan("│"),
  );
  lines.push(c.cyan("╰──────────────────────────────────────────────────────────────────────╯"));
  lines.push("");
  lines.push(
    `  ${c.bold("SAFETY SCORE")}   ${bar}   ${c.bold(gradeColor(`${r.score}/100`))}  ${c.bold(gradeColor(`GRADE ${r.grade}`))}`,
  );
  lines.push("");
  lines.push(
    `  ${c.dim("Harnesses hooked:")} ${c.bold(String(r.harnessesConnected))}` +
    `   ${c.dim("·  MCP servers:")} ${c.bold(String(r.mcpServersTotal))}` +
    `   ${c.dim("·  Unpinned npx:")} ${r.unpinnedNpxMcps ? c.yellow(c.bold(String(r.unpinnedNpxMcps))) : c.green("0")}` +
    `   ${c.dim("·  Inline secret keys:")} ${r.mcpInlineSecretsCount ? c.yellow(c.bold(String(r.mcpInlineSecretsCount))) : c.green("0")}`,
  );
  lines.push(`  ${rule}`);

  const badge = (sev: AuditSeverity) => {
    if (sev === "high") return c.bgRed(" HIGH ");
    if (sev === "medium") return c.bgYellow(" MED  ");
    if (sev === "low") return c.bgCyan(" LOW  ");
    return c.bgGreen(" PASS ");
  };

  // Show failures first (HIGH -> MED -> LOW), then PASS.
  const order: Record<AuditSeverity, number> = { high: 0, medium: 1, low: 2, pass: 3 };
  const sorted = [...r.findings].sort((a, b) => order[a.severity] - order[b.severity]);

  lines.push("");
  for (const f of sorted) {
    const pts = f.pointsLost > 0 ? c.dim(` (-${f.pointsLost} pts)`) : "";
    lines.push(`  ${badge(f.severity)}  ${c.bold(f.title)}${pts}`);
    if (f.detail) lines.push(`           ${c.dim(f.detail)}`);
    if (!share && f.items && f.items.length > 0) {
      for (const item of f.items.slice(0, 12)) {
        lines.push(`           ${c.cyan("•")} ${c.white(item.server)} ${c.dim(`(${item.detail})`)} ${c.dim("in")} ${c.violet(item.file)}`);
      }
      if (f.items.length > 12) {
        lines.push(`           ${c.dim(`… and ${f.items.length - 12} more (run with --json for full list)`)}`);
      }
    }
    if (f.fix && f.severity !== "pass") {
      lines.push(`           ${c.green("→ Fix:")} ${c.cyan(f.fix)}`);
    }
    lines.push("");
  }

  // Concrete step-by-step action plan
  const steps: { gain: string; title: string; cmd: string }[] = [];
  const missingLoop = r.findings.some((f) => f.id === "no-loop-guard");
  const missingDestructive = r.findings.some((f) => f.id === "no-destructive-fuse");
  if (missingLoop || missingDestructive) {
    const gain = (missingLoop ? 22 : 0) + (missingDestructive ? 18 : 0);
    steps.push({
      gain: `+${gain} pts`,
      title: "Turn on local loop & destructive shell fuse (takes 1 sec, 100% offline)",
      cmd: "agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on",
    });
  }

  const unhooked = r.harnesses.filter((h) => h.detected && !h.connected);
  if (r.harnessesConnected === 0 || unhooked.length > 0) {
    steps.push({
      gain: r.harnessesConnected === 0 ? "+10 pts" : "coverage",
      title: unhooked.length > 0
        ? `Hook detected agent(s): ${unhooked.map((h) => h.name).join(", ")}`
        : "Hook your coding agents (with automatic backup)",
      cmd: "agenttracking connect all",
    });
  }

  if (r.unpinnedNpxMcps > 0 || r.mcpInlineSecretsCount > 0 || r.cleartextHttpMcps > 0) {
    const mcpFilesToFix = Array.from(
      new Set(
        r.findings
          .filter((f) => f.category === "mcp")
          .flatMap((f) => (f.items ?? []).map((i) => i.file)),
      ),
    );
    const gain = (r.cleartextHttpMcps ? 18 : 0) + (r.unpinnedNpxMcps ? 12 : 0) + (r.mcpInlineSecretsCount ? 8 : 0);
    steps.push({
      gain: `+${gain} pts`,
      title: `Harden MCP config(s)${!share && mcpFilesToFix.length ? ` (${mcpFilesToFix.join(", ")})` : ""}`,
      cmd: r.unpinnedNpxMcps > 0
        ? `Pin @version on each npx MCP server & replace inline secret literals with \${ENV_VAR} (re-run: agenttracking audit)`
        : `Replace inline secret literals with \${ENV_VAR} & use https:// for remote MCPs`,
    });
  }

  if (r.unwrappedCronCount > 0) {
    steps.push({
      gain: `+${Math.min(14, r.unwrappedCronCount * 4)} pts`,
      title: `Wrap ${r.unwrappedCronCount} crontab job(s) so missed/hung runs alert`,
      cmd: "agenttracking doctor",
    });
  }

  if (steps.length > 0) {
    lines.push(`  ${rule}`);
    lines.push(`  ${c.bold(c.white("NEXT STEPS TO REACH GRADE A"))}`);
    lines.push("");
    lines.push(`  ${c.green(c.bold("⚡ Auto-fix everything safely (with backups, [Y/n]):"))} ${c.cyan(c.bold("agenttracking fix"))}`);
    lines.push("");
    steps.forEach((s, idx) => {
      lines.push(`  ${c.cyan(`${idx + 1}.`)} ${c.bold(s.title)} ${c.green(`[${s.gain}]`)}`);
      lines.push(`     ${c.cyan(s.cmd)}`);
    });
    lines.push("");
  } else {
    lines.push(`  ${c.green(c.bold("✓ Grade A! Your coding agents and MCP configs pass all baseline local checks."))}`);
    lines.push("");
  }

  lines.push(`  ${rule}`);
  lines.push(`  ${c.dim("Share anonymized scorecard:")} ${c.cyan("agenttracking audit --share")}   ${c.dim("·  CI/JSON:")} ${c.cyan("agenttracking audit --json")}`);
  lines.push(`  ${c.dim("Free Telegram/Slack/Discord alerts & MCP drift:")} ${c.violet("https://agenttracking.co")}`);
  lines.push("");
  return lines.join("\n");
}

export async function runAudit(args: string[]): Promise<number> {
  const report = runLocalAudit();
  if (args.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const share = args.includes("--share");
    const forceNoColor = args.includes("--no-color");
    process.stdout.write(formatAuditReport(report, { share, ...(forceNoColor ? { color: false } : {}) }));
  }
  return 0;
}
