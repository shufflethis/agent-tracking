import { botShaped } from "./agent-triage";
import { rangeEvidence, type RangeEvidence, type Ranges } from "./bot-ranges";
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

export type LogFetch = { day: string; agent: string; path: string; evidence?: RangeEvidence };

export type LogAttempt = {
  day: string;
  agent: string;
  path: string;
  evidence: RangeEvidence;
  method: "GET" | "HEAD" | "OTHER";
  status: number;
  result: "delivered" | "redirect" | "blocked" | "rate_limited" | "client_error" | "server_error" | "other";
  resource: "html" | "pdf" | "json" | "api" | "discovery" | "asset";
  /** Combined logs do not contain these fields. Never infer them from status or extension. */
  contentType: string | null;
  durationMs: number | null;
  resourceBasis: "path_guess";
};

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

export function resourceFor(path: string): LogAttempt["resource"] {
  const clean = cleanPath(path).toLowerCase();
  if (clean.startsWith("/.well-known/") || /\/(?:robots\.txt|sitemap(?:-[^/]*)?\.xml|llms(?:-full)?\.txt|(?:ai-plugin|webmcp)\.json)$/.test(clean)) return "discovery";
  if (clean.startsWith("/api/")) return "api";
  if (/\.pdf$/.test(clean)) return "pdf";
  if (/\.json$/.test(clean)) return "json";
  if (clean.startsWith("/_next/") || /\.(?:js|css|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|avif|mp4|webm)$/.test(clean)) return "asset";
  return "html";
}

export function resultFor(status: number): LogAttempt["result"] {
  if (status >= 200 && status < 300) return "delivered";
  if (status >= 300 && status < 400) return "redirect";
  if (status === 401 || status === 403) return "blocked";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500 && status < 600) return "server_error";
  return "other";
}

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

/**
 * A user agent this import could not place, and how often it appeared.
 *
 * Deduplicated here rather than stored line by line: the string is the whole
 * content, and one fetcher hammering a site is one unanswered question, not ten
 * thousand. See lib/tracking/agent-triage.ts for what is done with these.
 */
export type UnknownAgent = { ua: string; hits: number };

export type ImportResult = {
  fetches: LogFetch[];
  unverified: LogFetch[];
  attempts: LogAttempt[];
  bursts: Burst[];
  scanned: number;
  skipped: number;
  lastT: number | null;
  /**
   * Bot-shaped strings that matched no entry in ai-sources.json.
   *
   * Collected, never counted: a line from an unknown agent is not a fetch and
   * must not become one, or the totals would move every time this list grew.
   * The dashboard is unaffected by anything in here.
   */
  unknown: UnknownAgent[];
};

export function importLines(lines: Iterable<string>, options: ImportOptions = {}): ImportResult {
  const fetches: LogFetch[] = [];
  const unverified: LogFetch[] = [];
  const attempts: LogAttempt[] = [];
  const perKey = new Map<string, { agent: string; hits: { t: number; path: string }[] }>();
  const unknown = new Map<string, { ua: string; hits: number }>();
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
    const agent = matchAgent(line.ua);
    if (!agent) {
      // Same bar as a counted fetch: a successful GET of a page. Anything that
      // would not have been a fetch is not an unanswered question either.
      if (line.method === "GET" && line.status >= 200 && line.status < 300 && isPagePath(line.path) && botShaped(line.ua)) {
        const key = line.ua.toLowerCase();
        const entry = unknown.get(key) ?? { ua: line.ua.trim().slice(0, 512), hits: 0 };
        entry.hits += 1;
        unknown.set(key, entry);
      }
      continue;
    }
    const path = cleanPath(line.path);
    const evidence = rangeEvidence(agent.id, line.ip, options.ranges ?? null);
    const method = line.method === "GET" || line.method === "HEAD" ? line.method : "OTHER";
    const result = resultFor(line.status);
    const resource = resourceFor(line.path);
    attempts.push({ day: dayKey(line.t), agent: agent.id, path, evidence, method, status: line.status, result, resource, contentType: null, durationMs: null, resourceBasis: "path_guess" });
    // The original fetch metric has a narrow definition: verified 2xx GET
    // of a likely HTML page. Every other outcome remains in attempts.
    if (method !== "GET" || result !== "delivered" || resource !== "html" || !isPagePath(line.path)) continue;
    if (evidence.status !== "verified") {
      unverified.push({ day: dayKey(line.t), agent: agent.id, path, evidence });
      continue;
    }
    fetches.push({ day: dayKey(line.t), agent: agent.id, path, evidence });
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
  return { fetches, unverified, attempts, bursts, scanned, skipped, lastT, unknown: [...unknown.values()].sort((a, b) => b.hits - a.hits) };
}
