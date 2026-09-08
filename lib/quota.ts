import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A small daily counter per key, on disk, for things that cost us a mail.
 *
 * One JSON file per day under .data/quota; yesterday's file is simply never
 * read again. Sign-in links are the one consumer: an address can ask for a
 * handful a day, which is plenty for a person and nothing for a script that
 * wants to fill someone's inbox with our sender name.
 */

export const LOGIN_LINKS_PER_DAY = 8;

const dir = () => process.env.QUOTA_DIR ?? join(process.cwd(), ".data", "quota");

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

export type QuotaVerdict = { allowed: boolean; used: number; limit: number };

/** Counts the request when it is allowed, so callers must only call it once. */
export async function consume(key: string, limit: number): Promise<QuotaVerdict> {
  const day = today();
  const file = join(dir(), `${day}.json`);
  await mkdir(dir(), { recursive: true });
  let counts: Record<string, number> = {};
  try {
    counts = JSON.parse(await readFile(file, "utf8")) as Record<string, number>;
  } catch {
    counts = {};
  }
  const used = counts[key] ?? 0;
  if (used >= limit) return { allowed: false, used, limit };
  counts[key] = used + 1;
  await writeFile(file, JSON.stringify(counts), "utf8");
  return { allowed: true, used: used + 1, limit };
}

export const loginQuotaKey = (email: string) => `login:${email.trim().toLowerCase()}`;
