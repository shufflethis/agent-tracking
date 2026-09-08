import { verifyAgent, type Ranges } from "./bot-ranges";
import { matchAgent } from "./classify";
import { dayKey } from "./db";

/**
 * The server-log side of Agent Tracking.
 *
 * The snippet sees agents that run JavaScript. Most crawlers do not: GPTBot,
 * ClaudeBot, PerplexityBot and their kind fetch raw HTML and never execute
 * agent.js. They do leave a line in the web server's access log, and that
 * line is all this module reads: the time, the path, the status and the user
 * agent. The address is used for one thing, grouping a burst of fetches by
 * one agent into one row, and is dropped before anything is stored.
 *
 * A burst is what a query fan-out looks like from the receiving end: the
 * same agent from the same address fetching several pages within seconds.
 * Nobody outside the vendor sees the queries; the fetches are visible here.
 */

export type LogLine = { ip: string; t: number; method: string; path: string; status: number; ua: string };

export type LogFetch = { day: string; agent: string; path: string };

export type Burst = { agent: string; start: number; ms: number; paths: string[] };

const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// nginx "combined": ip - user [time] "method path proto" status bytes "referer" "ua"
const LINE = /^(\S+) \S+ \S+ \[(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})\] "(\S+) (\S+)[^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"/;

export function parseLine(line: string): LogLine | null {
  const m = LINE.exec(line);
  if (!m) return null;
  const month = MONTHS[m[3]];
  if (month === undefined) return null;
  const offsetMin = (Number(m[8].slice(1, 3)) * 60 + Number(m[8].slice(3, 5))) * (m[8][0] === "-" ? -1 : 1);
  const t = Date.UTC(Number(m[4]), month, Number(m[2]), Number(m[5]), Number(m[6]), Number(m[7])) - offsetMin * 60_000;
  return { ip: m[1], t, method: m[9], path: m[10], status: Number(m[11]), ua: m[12] };
}

/** A page, as opposed to an asset, an API call or a Next.js internal. */
export function isPagePath(path: string): boolean {
  // A request with _rsc is a Next.js client fetching a route payload for a
  // prefetch or a client-side navigation: a browser that already loaded the
  // page, not an agent reading HTML. Real crawlers never send it. Counting
  // it would turn one visit into a dozen fetches.
  if (/[?&]_rsc=/.test(path)) return false;
  const clean = path.split("?")[0].split("#")[0];
  if (clean.startsWith("/_next/") || clean.startsWith("/api/") || clean.startsWith("/.well-known/")) return false;
  if (/\.(js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|txt|xml|json|pdf)$/i.test(clean)) return false;
  return true;
}

export const cleanPath = (path: string) => path.split("?")[0].split("#")[0].slice(0, 200) || "/";

/** Gaps longer than this end a burst; fewer pages than this is not one. */
export const BURST_GAP_MS = 30_000;
export const BURST_MIN_PAGES = 3;

/**
 * Lines in, fetches and bursts out. Only successful GETs of pages by a known
 * agent count; everything else is noise for this purpose. The address never
 * leaves this function.
 */
export type ImportOptions = {
  /** Published vendor ranges; a claimed agent from outside them is counted as unverified, not as a fetch. */
  ranges?: Ranges | null;
  /** Lines at or before this time were imported already (a customer re-sending a whole file). */
  since?: number | null;
};

export type ImportResult = { fetches: LogFetch[]; unverified: LogFetch[]; bursts: Burst[]; scanned: number; skipped: number; lastT: number | null };

export function importLines(lines: Iterable<string>, options: ImportOptions = {}): ImportResult {
  const fetches: LogFetch[] = [];
  const unverified: LogFetch[] = [];
  const perKey = new Map<string, { agent: string; hits: { t: number; path: string }[] }>();
  let scanned = 0;
  let skipped = 0;
  let lastT: number | null = null;
  for (const raw of lines) {
    scanned++;
    const line = parseLine(raw);
    if (!line) continue;
    if (options.since != null && line.t <= options.since) {
      skipped++;
      continue;
    }
    if (lastT === null || line.t > lastT) lastT = line.t;
    if (line.method !== "GET" || line.status >= 400 || !isPagePath(line.path)) continue;
    const agent = matchAgent(line.ua);
    if (!agent) continue;
    const path = cleanPath(line.path);
    if (verifyAgent(agent.id, line.ip, options.ranges ?? null) === false) {
      unverified.push({ day: dayKey(line.t), agent: agent.id, path });
      continue;
    }
    fetches.push({ day: dayKey(line.t), agent: agent.id, path });
    const key = `${agent.id}|${line.ip}`;
    const entry = perKey.get(key) ?? { agent: agent.id, hits: [] };
    entry.hits.push({ t: line.t, path });
    perKey.set(key, entry);
  }
  const bursts: Burst[] = [];
  for (const { agent, hits } of perKey.values()) {
    hits.sort((a, b) => a.t - b.t);
    let run: { t: number; path: string }[] = [];
    const flush = () => {
      if (run.length >= BURST_MIN_PAGES) {
        const paths = [...new Set(run.map((h) => h.path))].slice(0, 24);
        bursts.push({ agent, start: run[0].t, ms: run[run.length - 1].t - run[0].t, paths });
      }
      run = [];
    };
    for (const h of hits) {
      if (run.length && h.t - run[run.length - 1].t > BURST_GAP_MS) flush();
      run.push(h);
    }
    flush();
  }
  return { fetches, unverified, bursts, scanned, skipped, lastT };
}
