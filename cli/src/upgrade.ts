import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { formatBrandBanner } from "./brand.js";
import { connectClaude, defaultCommand, hasClaudeHooks, installRuntime } from "./connect-claude.js";
import {
  agyPathFor, codexPathFor, connectAgy, connectCodex, connectCursor, connectGemini,
  cursorPathFor, geminiPathFor, hasAgyHooks, hasCodexHooks, hasCursorHooks, hasGeminiHooks,
} from "./connect-harnesses.js";

const DEFAULT_INSTALL_URL = "https://agenttracking.co/install.sh";

export type RefreshResult = { updated: string[]; already: string[] };

/**
 * Re-installs the hook runtime for this CLI version and updates hook paths ONLY
 * for harnesses that already have Agent Tracking connected. Never connects new
 * harnesses or modifies foreign hooks.
 */
export function refreshConnectedHooks(opts: {
  userHome?: string;
  home?: string;
  claudeSettingsPath?: string;
  cliPath?: string;
} = {}): RefreshResult {
  const userHome = opts.userHome ?? homedir();
  const claudePath = opts.claudeSettingsPath ?? process.env.AGENTTRACKING_CLAUDE_SETTINGS ?? join(userHome, ".claude", "settings.json");
  const agyPath = agyPathFor("user", userHome);
  const cursorPath = cursorPathFor("user", userHome);
  const geminiPath = geminiPathFor("user", userHome);
  const codexPath = codexPathFor(userHome);

  const targets: { name: string; refresh: (cliPath: string) => string }[] = [];
  if (hasClaudeHooks(claudePath)) targets.push({ name: "Claude Code", refresh: (c) => connectClaude({ settingsPath: claudePath, command: defaultCommand(c) }) });
  if (hasAgyHooks(agyPath)) targets.push({ name: "Antigravity (agy)", refresh: (c) => connectAgy({ settingsPath: agyPath, command: defaultCommand(c) }) });
  if (hasCursorHooks(cursorPath)) targets.push({ name: "Cursor", refresh: (c) => connectCursor({ settingsPath: cursorPath, command: defaultCommand(c) }) });
  if (hasGeminiHooks(geminiPath)) targets.push({ name: "Gemini CLI", refresh: (c) => connectGemini({ settingsPath: geminiPath, command: defaultCommand(c) }) });
  if (hasCodexHooks(codexPath)) targets.push({ name: "Codex CLI", refresh: (c) => connectCodex({ configPath: codexPath, cliPath: c }) });

  if (targets.length === 0) return { updated: [], already: [] };

  const cliPath = opts.cliPath ?? installRuntime(opts.home);
  const updated: string[] = [];
  const already: string[] = [];
  for (const t of targets) {
    const res = t.refresh(cliPath);
    if (res === "connected") updated.push(t.name);
    else if (res === "already") already.push(t.name);
  }
  return { updated, already };
}

function logRefreshResult(res: RefreshResult, version: string): void {
  if (res.updated.length > 0) {
    console.log(`Updated hook runtime (v${version}) for: ${res.updated.join(", ")}.`);
  }
}

function triggerPostUpgradeHookRefresh(): void {
  const r = spawnSync("agenttracking", ["upgrade", "--refresh-hooks"], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) {
    console.log("Tip: run 'agenttracking upgrade --refresh-hooks' (or 'agenttracking connect all') to update installed hook runtimes.");
  }
}

export function currentCliVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return parsed.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map((n) => Number(n) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0) ? 1 : -1;
  }
  return 0;
}

export function parseVersionFromInstaller(script: string): string | null {
  const m = /^VERSION="([^"]+)"/m.exec(script);
  return m ? m[1].trim() : null;
}

export function isConfirmedDefaultYes(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  return trimmed === "" || trimmed === "y" || trimmed === "yes" || trimmed === "j" || trimmed === "ja";
}

export function isHomebrewInstall(scriptPath = fileURLToPath(import.meta.url)): boolean {
  return /\/(?:opt\/homebrew|usr\/local\/Cellar|home\/linuxbrew)\//i.test(scriptPath);
}

export function buildBrewEnv(baseEnv: Record<string, string | undefined> = process.env): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = { ...baseEnv, HOMEBREW_NO_ENV_HINTS: "1" };
  delete env.HOMEBREW_ASK;
  return env as NodeJS.ProcessEnv;
}

export async function runUpgrade(args: string[]): Promise<number> {
  const current = currentCliVersion();
  if (args.includes("--refresh-hooks")) {
    const res = refreshConnectedHooks();
    logRefreshResult(res, current);
    return 0;
  }

  console.log("");
  console.log(formatBrandBanner({ version: current }));
  console.log("");

  const autoYes = args.includes("--yes") || args.includes("-y");
  const origin = (process.env.AGENTTRACKING_ORIGIN ?? "https://agenttracking.co").replace(/\/+$/, "");
  const installUrl = `${origin}/install.sh`;

  let latest: string | null = null;
  try {
    const res = await fetch(installUrl, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) latest = parseVersionFromInstaller(await res.text());
  } catch {
    latest = null;
  }

  if (latest && compareSemver(current, latest) >= 0) {
    console.log(`agenttracking v${current} is already up to date.`);
    logRefreshResult(refreshConnectedHooks(), current);
    return 0;
  }

  const targetLabel = latest ? `v${current} -> v${latest}` : `v${current} -> latest`;
  const viaBrew = isHomebrewInstall();
  console.log(`Upgrade available: agenttracking ${targetLabel} (${viaBrew ? "Homebrew" : "SHA-256 installer"})`);

  if (!autoYes) {
    if (!process.stdin.isTTY) {
      console.log("Non-interactive terminal detected. Re-run with --yes to upgrade automatically.");
      return 1;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await rl.question("Proceed with the upgrade? [Y/n] ");
      if (!isConfirmedDefaultYes(answer)) {
        console.log("Upgrade cancelled.");
        return 0;
      }
    } finally {
      rl.close();
    }
  }

  if (viaBrew) {
    console.log("Updating via Homebrew (shufflethis/tap/agenttracking)...");
    const r = spawnSync("sh", ["-c", "brew update && brew upgrade agenttracking"], {
      stdio: "inherit",
      env: buildBrewEnv(),
    });
    if ((r.status ?? 1) === 0) triggerPostUpgradeHookRefresh();
    return r.status ?? 1;
  }

  console.log(`Installing via SHA-256 verified installer (${installUrl})...`);
  const r = spawnSync("sh", ["-c", `curl -fsSL "${installUrl || DEFAULT_INSTALL_URL}" | sh`], {
    stdio: "inherit",
  });
  if ((r.status ?? 1) === 0) triggerPostUpgradeHookRefresh();
  return r.status ?? 1;
}
