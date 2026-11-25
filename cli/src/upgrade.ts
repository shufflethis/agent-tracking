import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const DEFAULT_INSTALL_URL = "https://agenttracking.co/install.sh";

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

export async function runUpgrade(args: string[]): Promise<number> {
  const autoYes = args.includes("--yes") || args.includes("-y");
  const current = currentCliVersion();
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
    const r = spawnSync("sh", ["-c", "brew update && yes | brew upgrade agenttracking"], {
      stdio: "inherit",
      env: { ...process.env, HOMEBREW_NO_ENV_HINTS: "1" },
    });
    return r.status ?? 1;
  }

  console.log(`Installing via SHA-256 verified installer (${installUrl})...`);
  const r = spawnSync("sh", ["-c", `curl -fsSL "${installUrl || DEFAULT_INSTALL_URL}" | sh`], {
    stdio: "inherit",
  });
  return r.status ?? 1;
}
