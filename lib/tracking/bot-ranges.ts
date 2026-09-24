import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { readFileSync } from "node:fs";

/**
 * Published address ranges of the agents that publish them.
 *
 * Anyone can put "GPTBot" in a user agent; the log import did it itself
 * during testing. OpenAI, Perplexity, Microsoft, Google and Apple publish
 * the ranges their fetchers come from, so a line claiming one of those can
 * be checked. Anthropic, Meta, Amazon and the rest publish nothing usable,
 * and their lines stay "not verifiable" rather than being counted as real.
 *
 * The lists are fetched once a day by the tracking cron into a JSON file;
 * the import reads the file. No fetch happens on a request path.
 */

export type Ranges = {
  fetchedAt: string;
  lists: Record<string, string[]>;
  /** Last successful refresh for each provider. A global fetch timestamp is not evidence of freshness. */
  updatedAt?: Record<string, string>;
  failedAt?: Record<string, string>;
};

export type RangeEvidence = {
  status: "verified" | "mismatch" | "missing" | "stale" | "unavailable";
  method: "ip_range" | "none";
  source: string | null;
  sourceVersion: string | null;
  checkedAt: number;
};

export const RANGE_MAX_AGE_HOURS = Math.max(1, Math.min(720, Number(process.env.BOT_RANGE_MAX_AGE_HOURS) || 72));

export function rangeSourceHealth(ranges: Ranges | null, now = Date.now()): { key: string; status: "fresh" | "stale" | "missing"; updatedAt: string | null; failedAt: string | null }[] {
  return RANGE_SOURCES.map(({ key }) => {
    const updatedAt = ranges?.updatedAt?.[key] ?? null;
    const failedAt = ranges?.failedAt?.[key] ?? null;
    const time = Date.parse(updatedAt ?? "");
    const status = !ranges?.lists[key]?.length || !Number.isFinite(time) ? "missing" : now - time > RANGE_MAX_AGE_HOURS * 3_600_000 || time > now + 300_000 ? "stale" : "fresh";
    return { key, status, updatedAt, failedAt };
  });
}

export const RANGE_SOURCES: { key: string; url: string; agents: string[] }[] = [
  { key: "openai-gptbot", url: "https://openai.com/gptbot.json", agents: ["gptbot"] },
  { key: "openai-chatgpt-user", url: "https://openai.com/chatgpt-user.json", agents: ["chatgpt-user"] },
  { key: "openai-searchbot", url: "https://openai.com/searchbot.json", agents: ["oai-searchbot"] },
  { key: "perplexity-bot", url: "https://www.perplexity.ai/perplexitybot.json", agents: ["perplexitybot"] },
  { key: "perplexity-user", url: "https://www.perplexity.ai/perplexity-user.json", agents: ["perplexity-user"] },
  { key: "google-user-fetchers", url: "https://developers.google.com/static/search/apis/ipranges/user-triggered-fetchers-google.json", agents: ["gemini-deep-research"] },
];

const KEY_FOR_AGENT = new Map(RANGE_SOURCES.flatMap((s) => s.agents.map((a) => [a, s.key] as const)));

/** Whether a list exists for this agent at all. */
export const verifiable = (agent: string) => KEY_FOR_AGENT.has(agent);

export function rangesFile(): string {
  return process.env.BOT_RANGES_FILE ?? ".data/bot-ranges.json";
}

export function loadRanges(path = rangesFile()): Ranges | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Ranges;
    return parsed && typeof parsed === "object" && parsed.lists ? parsed : null;
  } catch {
    return null;
  }
}

/** Fetch every list; a list that fails keeps its previous entries. */
export async function fetchRanges(previous: Ranges | null, fetchImpl: typeof fetch = fetch): Promise<{ ranges: Ranges; failed: string[] }> {
  const lists: Record<string, string[]> = { ...(previous?.lists ?? {}) };
  const updatedAt = { ...(previous?.updatedAt ?? {}) };
  const failedAt = { ...(previous?.failedAt ?? {}) };
  const attemptedAt = new Date().toISOString();
  const failed: string[] = [];
  for (const source of RANGE_SOURCES) {
    try {
      const res = await fetchImpl(source.url, { headers: { "user-agent": `${SITE_HOST} bot-ranges (+${SITE_ORIGIN}/docs)` }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { prefixes?: { ipv4Prefix?: string; ipv6Prefix?: string }[] };
      const prefixes = (data.prefixes ?? []).map((p) => p.ipv4Prefix ?? p.ipv6Prefix).filter((p): p is string => Boolean(p));
      if (prefixes.length === 0) throw new Error("empty list");
      lists[source.key] = prefixes;
      updatedAt[source.key] = attemptedAt;
      delete failedAt[source.key];
    } catch {
      failed.push(source.key);
      failedAt[source.key] = attemptedAt;
    }
  }
  return { ranges: { fetchedAt: attemptedAt, lists, updatedAt, failedAt }, failed };
}

/* ------------------------------------------------------------------ cidr */

function ipv4ToInt(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p) || Number(p) > 255) return null;
    n = (n << 8n) | BigInt(Number(p));
  }
  return n;
}

function ipv6ToInt(ip: string): bigint | null {
  let s = ip.toLowerCase();
  if (s.includes("%")) s = s.split("%")[0];
  // Embedded IPv4 tail, as in ::ffff:1.2.3.4
  const v4 = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = ipv4ToInt(v4[2]);
    if (n === null) return null;
    s = `${v4[1]}${(n >> 16n).toString(16)}:${(n & 0xffffn).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    n = (n << 16n) | BigInt(parseInt(g, 16));
  }
  return n;
}

/** The address as a number and its family's width, or null for junk. */
export function parseIp(ip: string): { n: bigint; bits: 32 | 128 } | null {
  if (ip.includes(":")) {
    const n = ipv6ToInt(ip);
    if (n === null) return null;
    // An IPv4-mapped address is compared as IPv4.
    if (n >> 32n === 0xffffn) return { n: n & 0xffffffffn, bits: 32 };
    return { n, bits: 128 };
  }
  const n = ipv4ToInt(ip);
  return n === null ? null : { n, bits: 32 };
}

export function inCidr(ip: string, cidr: string): boolean {
  const [base, lenRaw] = cidr.split("/");
  const addr = parseIp(ip);
  const net = parseIp(base);
  if (!addr || !net || addr.bits !== net.bits) return false;
  const len = lenRaw === undefined ? net.bits : Number(lenRaw);
  if (!Number.isInteger(len) || len < 0 || len > net.bits) return false;
  const shift = BigInt(net.bits - len);
  return addr.n >> shift === net.n >> shift;
}

/** true: inside the vendor's ranges. false: claims a vendor with a list, from elsewhere. null: nothing to check against. */
export function verifyAgent(agent: string, ip: string, ranges: Ranges | null): boolean | null {
  const evidence = rangeEvidence(agent, ip, ranges);
  return evidence.status === "verified" ? true : evidence.status === "mismatch" ? false : null;
}

export function rangeEvidence(agent: string, ip: string, ranges: Ranges | null, now = Date.now()): RangeEvidence {
  const key = KEY_FOR_AGENT.get(agent);
  const base = { checkedAt: now, source: key ?? null, sourceVersion: key ? ranges?.updatedAt?.[key] ?? null : null };
  if (!key) return { ...base, status: "unavailable", method: "none" };
  const list = ranges?.lists[key];
  const refreshed = Date.parse(ranges?.updatedAt?.[key] ?? "");
  if (!list?.length || !Number.isFinite(refreshed) || !parseIp(ip)) return { ...base, status: "missing", method: "ip_range" };
  if (now - refreshed > RANGE_MAX_AGE_HOURS * 3_600_000 || refreshed > now + 300_000) return { ...base, status: "stale", method: "ip_range" };
  return { ...base, status: list.some((cidr) => inCidr(ip, cidr)) ? "verified" : "mismatch", method: "ip_range" };
}
