import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { rmSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { configDir, readConfig, writeConfig } from "./config.js";

/**
 * `agenttracking login`: device flow. The terminal shows a code, the signed-in
 * person confirms it in the browser, the terminal receives a token for this
 * machine. `--token atk_...` skips the browser. The HMAC secret is created on
 * the first login and kept across later logins, so session ids stay stable.
 */

export const DEFAULT_ORIGIN = "https://agenttracking.co";

type LoginOptions = { origin?: string; token?: string; host?: string; home?: string; log?: (line: string) => void; openBrowser?: boolean; pollMs?: number };

const hostLabel = (value: string) => value.replace(/[^\w.-]/g, "-").slice(0, 64) || "machine";
const german = () => /^de/i.test(process.env.LANG ?? "");

function open(url: string): void {
  try {
    const child = spawn(process.platform === "darwin" ? "open" : "xdg-open", [url], { stdio: "ignore", detached: true });
    child.on("error", () => {});
    child.unref();
  } catch { /* no browser here: the printed URL is enough */ }
}

export async function login(opts: LoginOptions = {}): Promise<"ok" | "expired" | "denied"> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const origin = (opts.origin ?? process.env.AGENTTRACKING_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  const host = hostLabel(opts.host ?? hostname());
  const previous = readConfig(opts.home);
  const secret = previous?.secret ?? randomBytes(32).toString("hex");
  const save = (token: string) => {
    writeConfig({ origin, token, secret, host }, opts.home);
    rmSync(join(configDir(opts.home), "auth-error"), { force: true });
  };

  if (opts.token) {
    if (!/^atk_[\w-]{20,}$/.test(opts.token)) { log("That does not look like an agent token (atk_...)."); return "denied"; }
    save(opts.token);
    return "ok";
  }

  const res = await fetch(`${origin}/api/agents/device`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hostLabel: host }) });
  const start = (await res.json().catch(() => ({}))) as { ok?: boolean; deviceCode?: string; userCode?: string; verifyUrl?: string; interval?: number; expiresAt?: number; detail?: string };
  if (!start.ok || !start.deviceCode || !start.verifyUrl) { log(`Login could not start: ${start.detail ?? res.status}`); return "denied"; }
  log(german()
    ? `Öffne ${start.verifyUrl}\nund bestätige den Code ${start.userCode} (gilt 10 Minuten).`
    : `Open ${start.verifyUrl}\nand confirm the code ${start.userCode} (valid for 10 minutes).`);
  if (opts.openBrowser !== false) open(start.verifyUrl);

  const pollMs = opts.pollMs ?? (start.interval ?? 3) * 1000;
  const deadline = (start.expiresAt ?? Date.now() + 600_000) + 5000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const poll = (await fetch(`${origin}/api/agents/device/poll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceCode: start.deviceCode }) })
      .then((r) => r.json()).catch(() => ({ status: "pending" }))) as { status?: string; token?: string };
    if (poll.status === "approved" && poll.token) {
      save(poll.token);
      log(german() ? `Verbunden als "${host}".` : `Connected as "${host}".`);
      return "ok";
    }
    if (poll.status === "expired") { log(german() ? "Der Code ist abgelaufen. Bitte noch einmal starten." : "The code expired. Please run login again."); return "expired"; }
  }
  return "expired";
}
