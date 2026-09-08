/**
 * Rate limits for the two public surfaces that can make us crawl someone else.
 *
 * The thing worth limiting is not the request, it is the outbound crawl. A
 * cached report costs a map lookup; a cache miss sends a real fetch to a
 * stranger's server under our IP and our user agent. So there are two budgets,
 * and the expensive one is far smaller than the cheap one.
 *
 * In-memory on purpose. One long-lived node process serves the whole site, the
 * same assumption lib/report-cache.ts already makes. A restart clears the
 * counters, which is the honest trade for having no datastore: this is a brake
 * against scripts and accidents, not a security control against an adversary
 * who can wait.
 */

export type Budget = { limit: number; windowMs: number };

/** Cheap: reading a cached report, listing checks, explaining one. */
export const REQUESTS: Budget = { limit: 60, windowMs: 60_000 };

/**
 * Expensive: a fetch that leaves this machine. Fifteen an hour is far above any
 * human looking at reports and far below anything that reads as a flood at the
 * other end. The burst that prompted this was 78 in one minute.
 */
export const CRAWLS: Budget = { limit: 15, windowMs: 60 * 60_000 };

/**
 * Ingest: batches from agent.js on customers' pages. Many browsers behind one
 * office NAT, and a handful of crawler addresses fetching every tracked site,
 * would exhaust the request budget in a minute and be dropped without a trace.
 * Nothing here leaves this machine, so the budget is generous.
 */
export const INGEST: Budget = { limit: 600, windowMs: 60_000 };

export type Bucket = "requests" | "crawls" | "ingest";

export type Decision =
  | { ok: true }
  | { ok: false; bucket: Bucket; retryAfter: number };

const hits = new Map<string, number[]>();
const MAX_KEYS = 5_000;

/**
 * Addresses that skip both budgets, from RATELIMIT_EXEMPT (comma separated).
 *
 * Our own machines call this API on a schedule — badges, monitoring, whatever
 * comes next. Those are not the traffic these limits exist for, and finding out
 * they were throttled by reading a support mail is the wrong way round.
 */
const exempt = new Set(
  (process.env.RATELIMIT_EXEMPT ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * The caller's address.
 *
 * nginx sets X-Real-IP on every proxied request, overwriting whatever the client
 * sent, and nothing reaches this process except through nginx. That makes the
 * header trustworthy here and nowhere else — behind a different front door this
 * function is wrong.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function prune(now: number) {
  if (hits.size <= MAX_KEYS) return;
  for (const [key, times] of hits) {
    if (times.length === 0 || now - times[times.length - 1] > CRAWLS.windowMs) hits.delete(key);
    if (hits.size <= MAX_KEYS) break;
  }
}

/**
 * Take one token from a bucket, or say how long to wait.
 *
 * Consumption happens here rather than in a separate check, so a caller cannot
 * ask permission and then not spend it. Callers that turn out not to need the
 * token have simply paid for a crawl they did not make — conservative in the
 * direction that protects the stranger being crawled.
 */
export function take(ip: string, bucket: Bucket, now = Date.now()): Decision {
  if (exempt.has(ip)) return { ok: true };

  const budget = bucket === "crawls" ? CRAWLS : bucket === "ingest" ? INGEST : REQUESTS;
  const key = `${bucket}:${ip}`;
  const times = (hits.get(key) ?? []).filter((t) => now - t < budget.windowMs);

  if (times.length >= budget.limit) {
    hits.set(key, times);
    const oldest = times[0];
    return { ok: false, bucket, retryAfter: Math.max(1, Math.ceil((budget.windowMs - (now - oldest)) / 1000)) };
  }

  times.push(now);
  hits.set(key, times);
  prune(now);
  return { ok: true };
}

/** Test seam. Never called by the app. */
export function reset() {
  hits.clear();
}
