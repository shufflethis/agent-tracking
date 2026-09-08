import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { dayKey } from "./db";

/**
 * The daily salt behind the session hash.
 *
 * Random, generated on the first request of each day, kept in one small file
 * so the nightly script and the server agree on it, and overwritten the next
 * day. Yesterday's salt is gone, which is what makes yesterday's session ids
 * unjoinable to today's. Not derived from a secret: a derived salt could be
 * recomputed by anyone holding the secret, and a random one cannot.
 */

const file = () => process.env.TRACKING_SALT_FILE ?? join(process.cwd(), ".data", "tracking-salt.json");

let cached: { day: string; salt: string } | null = null;

export async function dailySalt(now = Date.now()): Promise<string> {
  const day = dayKey(now);
  if (cached && cached.day === day) return cached.salt;
  try {
    const stored = JSON.parse(await readFile(file(), "utf8")) as { day?: string; salt?: string };
    if (stored.day === day && typeof stored.salt === "string" && stored.salt.length >= 32) {
      cached = { day, salt: stored.salt };
      return stored.salt;
    }
  } catch {
    // No file yet, or a torn write: make a new one.
  }
  const salt = randomBytes(32).toString("base64url");
  cached = { day, salt };
  try {
    await mkdir(dirname(file()), { recursive: true });
    await writeFile(file(), JSON.stringify({ day, salt }), "utf8");
  } catch {
    // Kept in memory for this process; another process will mint its own,
    // which only means two session ids for one visitor today.
  }
  return salt;
}
