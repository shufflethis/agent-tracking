import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** ~/.agenttracking/config.json: origin, write token, per-machine HMAC secret, host label. Mode 0600. */
export type Config = { origin: string; token: string; secret: string; host: string };

export const configDir = (home?: string) => home ?? process.env.AGENTTRACKING_HOME ?? join(homedir(), ".agenttracking");

export function readConfig(home?: string): Config | null {
  try {
    const c = JSON.parse(readFileSync(join(configDir(home), "config.json"), "utf8")) as Partial<Config>;
    return c.origin && c.token && c.secret && c.host ? (c as Config) : null;
  } catch {
    return null;
  }
}

export function ensureDir(home?: string): string {
  const dir = configDir(home);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function writeConfig(c: Config, home?: string): void {
  const file = join(ensureDir(home), "config.json");
  writeFileSync(file, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
  chmodSync(file, 0o600);
}
