import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { formatAuditReport, runLocalAudit, type AuditReport } from "./audit.js";
import { configDir } from "./config.js";
import { readGuard, writeGuard } from "./guard.js";
import { isConfirmedDefaultYes } from "./upgrade.js";

/**
 * 1-command local auto-hardening (`agenttracking fix`).
 *
 * Designed so anyone can jump from a low audit score to Grade A in seconds
 * without manually editing JSON files:
 *   1. Arms the local runaway-loop & destructive-shell circuit breaker (`guard`).
 *   2. Resolves exact latest versions from registry.npmjs.org for unpinned `npx`
 *      MCP packages and pins them in place (writing a `.bak` backup first).
 *   3. Moves literal secret values in MCP `env` blocks into `~/.agenttracking/secrets.env`
 *      (chmod 0600) and replaces JSON entries with `${ENV_VAR}` references.
 *      Secret values are NEVER printed to stdout, stderr, or logs.
 */

const SECRET_KEY_RE = /(key|token|secret|password|passwd|auth|bearer|pat|credential)/i;

export type VersionResolver = (pkgName: string) => Promise<string | null>;

export async function resolveNpmLatestVersion(pkgName: string): Promise<string | null> {
  const clean = pkgName.replace(/@(?:latest|next|beta|canary)$/i, "");
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(clean)}/latest`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string" && /^\d+\.\d+\.\d+/.test(data.version) ? data.version : null;
  } catch {
    return null;
  }
}

export type FixResult = {
  before: AuditReport;
  after: AuditReport;
  guardUpdated: boolean;
  pinnedPackages: { server: string; file: string; from: string; to: string }[];
  pinFailures: { server: string; pkg: string; file: string }[];
  movedSecrets: { server: string; file: string; keys: string[] }[];
  backups: string[];
  secretsFile: string | null;
};

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
  };
}

function scoreBar(score: number, c: ReturnType<typeof makePalette>): string {
  const width = 24;
  const filled = Math.round((score / 100) * width);
  const empty = Math.max(0, width - filled);
  const color = score >= 85 ? c.green : score >= 60 ? c.yellow : c.red;
  return `${color("█".repeat(filled))}${c.dim("░".repeat(empty))}`;
}

function escapeShellDoubleQuotes(value: string): string {
  return value.replace(/([\\"`$])/g, "\\$1");
}

function shortPath(file: string, userHome: string, cwd: string): string {
  if (cwd !== userHome && file.startsWith(cwd + "/")) return "./" + file.slice(cwd.length + 1);
  if (file.startsWith(userHome + "/")) return "~/" + file.slice(userHome.length + 1);
  return file;
}

export async function applyLocalFixes(opts: {
  home?: string;
  userHome?: string;
  cwd?: string;
  crontabText?: string;
  dryRun?: boolean;
  skipSecrets?: boolean;
  resolveVersion?: VersionResolver;
} = {}): Promise<FixResult> {
  const home = configDir(opts.home);
  const userHome = opts.userHome ?? homedir();
  const cwd = opts.cwd ?? process.cwd();
  const dryRun = Boolean(opts.dryRun);
  const skipSecrets = Boolean(opts.skipSecrets);
  const resolveVersion = opts.resolveVersion ?? resolveNpmLatestVersion;

  const before = runLocalAudit({ home, userHome, cwd, crontabText: opts.crontabText });

  const pinnedPackages: FixResult["pinnedPackages"] = [];
  const pinFailures: FixResult["pinFailures"] = [];
  const movedSecrets: FixResult["movedSecrets"] = [];
  const backups: string[] = [];
  let guardUpdated = false;
  let secretsFile: string | null = null;

  // 1. Arm local guardrails (preserves any existing stricter settings)
  const existingGuard = readGuard(home) ?? {};
  const needsGuard =
    !existingGuard.maxConsecutiveFailures ||
    !existingGuard.maxCallsPerTurn ||
    !existingGuard.maxTurnMinutes ||
    !existingGuard.blockDestructive;

  if (needsGuard) {
    guardUpdated = true;
    if (!dryRun) {
      writeGuard(
        {
          ...existingGuard,
          maxConsecutiveFailures: existingGuard.maxConsecutiveFailures ?? 5,
          maxCallsPerTurn: existingGuard.maxCallsPerTurn ?? 80,
          maxTurnMinutes: existingGuard.maxTurnMinutes ?? 45,
          blockDestructive: true,
        },
        home,
      );
    }
  }

  // 2. Inspect & harden MCP config JSON files
  const candidateFiles = Array.from(
    new Set([
      join(userHome, ".claude", "settings.json"),
      join(userHome, ".claude.json"),
      join(cwd, ".mcp.json"),
      join(userHome, ".cursor", "mcp.json"),
      join(userHome, ".gemini", "settings.json"),
      join(userHome, ".gemini", "antigravity", "mcp_config.json"),
    ]),
  );

  const secretsToPersist = new Map<string, string>();
  const versionCache = new Map<string, string | null>();

  for (const file of candidateFiles) {
    if (!existsSync(file)) continue;
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      parsed = raw as Record<string, unknown>;
    } catch {
      continue;
    }

    const servers = parsed.mcpServers;
    if (!servers || typeof servers !== "object" || Array.isArray(servers)) continue;

    let fileDirty = false;
    const disp = shortPath(file, userHome, cwd);

    for (const [serverName, cfg] of Object.entries(servers as Record<string, unknown>)) {
      if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) continue;
      const entry = cfg as Record<string, unknown>;

      // 2a. Pin unpinned `npx` MCP packages
      const command = typeof entry.command === "string" ? entry.command.trim() : "";
      if (/(?:^|\/)npx$/.test(command) && Array.isArray(entry.args)) {
        const args = entry.args as unknown[];
        const pkgIdx = args.findIndex((a) => typeof a === "string" && !a.startsWith("-"));
        if (pkgIdx >= 0) {
          const pkg = String(args[pkgIdx]);
          if (!/^@?[^@]+@\d/.test(pkg) && !pkg.startsWith(".") && !pkg.startsWith("/")) {
            const basePkg = pkg.replace(/@(?:latest|next|beta|canary)$/i, "");
            if (!versionCache.has(basePkg)) {
              versionCache.set(basePkg, await resolveVersion(basePkg));
            }
            const ver = versionCache.get(basePkg);
            if (ver) {
              const pinned = `${basePkg}@${ver}`;
              args[pkgIdx] = pinned;
              fileDirty = true;
              pinnedPackages.push({ server: serverName, file: disp, from: pkg, to: pinned });
            } else {
              pinFailures.push({ server: serverName, pkg, file: disp });
            }
          }
        }
      }

      // 2b. Externalize inline plaintext secret env vars to ~/.agenttracking/secrets.env (0600)
      if (!skipSecrets && entry.env && typeof entry.env === "object" && !Array.isArray(entry.env)) {
        const envObj = entry.env as Record<string, unknown>;
        const movedKeys: string[] = [];
        for (const [k, v] of Object.entries(envObj)) {
          if (SECRET_KEY_RE.test(k) && typeof v === "string" && v.trim().length > 0 && !v.trim().startsWith("${")) {
            secretsToPersist.set(k, v);
            envObj[k] = `\${${k}}`;
            movedKeys.push(k);
            fileDirty = true;
          }
        }
        if (movedKeys.length > 0) {
          movedSecrets.push({ server: serverName, file: disp, keys: movedKeys });
        }
      }
    }

    if (fileDirty && !dryRun) {
      const bak = `${file}.bak-agenttracking-${Date.now()}`;
      copyFileSync(file, bak);
      backups.push(shortPath(bak, userHome, cwd));
      writeFileSync(file, JSON.stringify(parsed, null, 2) + "\n", "utf8");
    }
  }

  // Persist moved secrets to ~/.agenttracking/secrets.env with 0600 permissions (NEVER printed)
  if (secretsToPersist.size > 0) {
    const target = join(home, "secrets.env");
    secretsFile = shortPath(target, userHome, cwd);
    if (!dryRun) {
      mkdirSync(home, { recursive: true });
      const existingText = existsSync(target) ? readFileSync(target, "utf8") : "";
      const existingKeys = new Set(
        existingText
          .split(/\r?\n/)
          .map((l) => /^export\s+([A-Za-z_][A-Za-z0-9_]*)=/.exec(l.trim())?.[1])
          .filter((k): k is string => Boolean(k)),
      );
      const additions: string[] = [];
      for (const [k, v] of secretsToPersist.entries()) {
        if (!existingKeys.has(k)) {
          additions.push(`export ${k}="${escapeShellDoubleQuotes(v)}"`);
        }
      }
      if (additions.length > 0 || !existsSync(target)) {
        const header = existingText.trim().length === 0
          ? "# Managed locally by agenttracking fix (chmod 600). Never commit or share.\n"
          : "";
        const sep = existingText.length > 0 && !existingText.endsWith("\n") ? "\n" : "";
        writeFileSync(target, `${header}${existingText}${sep}${additions.join("\n")}\n`, { mode: 0o600 });
        try { chmodSync(target, 0o600); } catch {}
      }
    }
  }

  const after = dryRun ? before : runLocalAudit({ home, userHome, cwd, crontabText: opts.crontabText });
  return { before, after, guardUpdated, pinnedPackages, pinFailures, movedSecrets, backups, secretsFile };
}

export async function runFix(args: string[]): Promise<number> {
  const autoYes = args.includes("--yes") || args.includes("-y");
  const dryRun = args.includes("--dry-run");
  const skipSecrets = args.includes("--no-secrets");
  const useColor = !args.includes("--no-color") && Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const c = makePalette(useColor);

  const pre = runLocalAudit();
  const pendingGuard = pre.findings.some((f) => f.id === "no-loop-guard" || f.id === "no-destructive-fuse");
  const pendingPins = pre.unpinnedNpxMcps;
  const pendingSecrets = skipSecrets ? 0 : pre.mcpInlineSecretsCount;

  console.log("");
  console.log(c.cyan("╭──────────────────────────────────────────────────────────────────────╮"));
  console.log(
    c.cyan("│ ") +
    c.bold(c.white("AGENT TRACKING FIX")) +
    c.dim("   ·  1-command local hardening with backups       ") +
    c.cyan("│"),
  );
  console.log(c.cyan("╰──────────────────────────────────────────────────────────────────────╯"));
  console.log("");

  if (!pendingGuard && pendingPins === 0 && pendingSecrets === 0) {
    console.log(`  ${c.green(c.bold(`✓ Already hardened! Score: ${pre.score}/100 (Grade ${pre.grade}).`))}`);
    console.log("");
    return 0;
  }

  console.log(`  ${c.bold("Planned fixes")} ${c.dim(`(current score: ${pre.score}/100 · Grade ${pre.grade}):`)}`);
  console.log("");
  if (pendingGuard) {
    console.log(`  ${c.cyan("•")} Arm local circuit breaker & destructive shell fuse ${c.green("[+40 pts]")}`);
    console.log(`    ${c.dim("max 5 consecutive failures · max 80 calls/turn · max 45 min/turn · block rm -rf / force-push")}`);
  }
  if (pendingPins > 0) {
    console.log(`  ${c.cyan("•")} Pin ${c.bold(String(pendingPins))} unpinned npx MCP package(s) to exact npm versions ${c.green("[+12 pts]")}`);
    console.log(`    ${c.dim("Creates timestamped .bak backup before editing any JSON file.")}`);
  }
  if (pendingSecrets > 0) {
    console.log(`  ${c.cyan("•")} Move ${c.bold(String(pendingSecrets))} inline MCP secret(s) to ${c.violet("~/.agenttracking/secrets.env")} (chmod 600) ${c.green("[+8 pts]")}`);
    console.log(`    ${c.dim("Replaces literals with ${ENV_VAR}. Secret values are NEVER printed or uploaded.")}`);
  }
  console.log("");

  if (!autoYes && !dryRun) {
    if (!process.stdin.isTTY) {
      console.log("  Non-interactive terminal detected. Re-run with --yes to apply automatically.");
      return 1;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await rl.question("  Apply these fixes with automatic backups? [Y/n] ");
      if (!isConfirmedDefaultYes(answer)) {
        console.log("  Cancelled. Nothing was changed.");
        return 0;
      }
    } finally {
      rl.close();
    }
    console.log("");
  }

  if (dryRun) {
    console.log(`  ${c.yellow("Dry run:")} no files were modified. Re-run without --dry-run to apply.`);
    console.log("");
    return 0;
  }

  console.log(`  ${c.dim("Applying fixes...")}`);
  const res = await applyLocalFixes({ dryRun: false, skipSecrets });
  console.log("");

  if (res.guardUpdated) {
    console.log(`  ${c.green("✓")} Local loop & destructive shell circuit breaker armed`);
  }
  for (const p of res.pinnedPackages) {
    console.log(`  ${c.green("✓")} Pinned ${c.white(p.server)}: ${c.dim(p.from)} → ${c.cyan(p.to)} ${c.dim(`(${p.file})`)}`);
  }
  for (const f of res.pinFailures) {
    console.log(`  ${c.yellow("!")} Could not resolve version for ${c.white(f.server)} (${f.pkg}) — left unchanged`);
  }
  for (const s of res.movedSecrets) {
    console.log(`  ${c.green("✓")} Externalized ${c.white(s.server)} key(s): ${c.cyan(s.keys.join(", "))} → ${c.violet(res.secretsFile ?? "~/.agenttracking/secrets.env")} ${c.dim("(0600)")}`);
  }
  if (res.backups.length > 0) {
    console.log(`  ${c.dim(`Backups saved: ${res.backups.join(", ")}`)}`);
  }

  const delta = res.after.score - res.before.score;
  const beforeColor = res.before.score >= 85 ? c.green : res.before.score >= 60 ? c.yellow : c.red;
  const afterColor = res.after.score >= 85 ? c.green : res.after.score >= 60 ? c.yellow : c.red;

  console.log("");
  console.log(c.cyan("╭──────────────────────────────────────────────────────────────────────╮"));
  console.log(
    `  ${c.bold("BEFORE")}   ${scoreBar(res.before.score, c)}   ${c.bold(beforeColor(`${String(res.before.score).padStart(3)}/100`))}  ${c.bold(beforeColor(`GRADE ${res.before.grade}`))}`,
  );
  console.log(
    `  ${c.bold("AFTER ")}   ${scoreBar(res.after.score, c)}   ${c.bold(afterColor(`${String(res.after.score).padStart(3)}/100`))}  ${c.bold(afterColor(`GRADE ${res.after.grade}`))}   ${delta > 0 ? c.green(c.bold(`(+${delta} pts!)`)) : ""}`,
  );
  console.log(c.cyan("╰──────────────────────────────────────────────────────────────────────╯"));

  if (res.secretsFile) {
    console.log("");
    console.log(`  ${c.yellow("One-time shell load")} ${c.dim("(so MCP servers read the moved env vars):")}`);
    console.log(`    ${c.cyan(`echo 'source ~/.agenttracking/secrets.env' >> ~/.zshrc && source ~/.agenttracking/secrets.env`)}`);
  }
  console.log("");
  console.log(`  ${c.dim("Share your clean scorecard:")} ${c.cyan("agenttracking audit --share")}`);
  console.log("");
  if (args.includes("--verbose")) process.stdout.write(formatAuditReport(res.after, { color: useColor }));
  return 0;
}
