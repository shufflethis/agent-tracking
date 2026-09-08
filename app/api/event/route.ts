import { matchAgent, matchReferral, sameSite, sanitizeBatch, sessionHash, type CleanEvent } from "@/lib/tracking/classify";
import { getAccount, getSite, noteManifest, recordEvents, registerTool, usageThisMonth, type StoredEvent } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";
import { dailySalt } from "@/lib/tracking/salt";
import { clientIp, take } from "@/lib/ratelimit";
import { SITE_ORIGIN } from "@/lib/site";
// Ingest has its own budget (INGEST in lib/ratelimit.ts): one address here
// is an office or a crawler, not one person, and a dropped batch is silent.

export const runtime = "nodejs";

/**
 * Ingest for agent.js, on customers' sites.
 *
 * Cross-origin by design: the snippet runs on someone else's page and posts here, so it answers OPTIONS, echoes the
 * caller's Origin, and reads the body as text because the beacon sends it as
 * text/plain to stay a simple request.
 *
 * Built as if it were being abused, which it will be:
 *   - the claimed domain must be a registered site, and the request's Origin
 *     must be that site or its www twin; a batch from anywhere else is dropped
 *   - the body is capped before it is parsed, the batch at 50 events
 *   - the caller's address goes into the session hash and nowhere else
 *   - the account's monthly quota is enforced here, not in the dashboard
 *   - it answers 202 to everything it understood and 204 to everything it did
 *     not: a beacon on somebody's page must never surface an error there
 *
 * Classification is server-side. The spec has the snippet matching user
 * agents itself; doing it here keeps the list in one versioned file and the
 * snippet under five kilobytes, and the header is the same string either way.
 */

const MAX_BODY = 32 * 1024;

function cors(origin: string | null): Record<string, string> {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request.headers.get("origin")) });
}

const originHost = (origin: string | null): string | null => {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = cors(origin);
  const done = (status: 202 | 204) => new Response(null, { status, headers });

  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > MAX_BODY) return done(204);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return done(204);
  }
  const batch = sanitizeBatch(parsed);
  if (!batch || batch.events.length === 0) return done(204);

  // The site must exist and the page posting must be on it. A beacon carries
  // Origin on every cross-origin POST; a hand-rolled client without one, or
  // with someone else's, writes nothing.
  const site = getSite(batch.domain);
  if (!site) return done(204);
  // Our own origin may post for any registered site: the demo page lives
  // here and carries the snippet for a site registered here. In production
  // that origin is this site itself, so it widens nothing.
  const from = originHost(origin);
  const ours = originHost(SITE_ORIGIN);
  if (!from || (!sameSite(from, site.domain) && from !== ours)) return done(204);

  const ip = clientIp(request.headers);
  const budget = take(ip, "ingest");
  if (!budget.ok) return done(204);

  const account = getAccount(site.owner);
  const plan = planFor(account?.plan);
  if (usageThisMonth(site.owner) >= plan.eventsPerMonth) return done(204);

  const ua = request.headers.get("user-agent");
  const agent = matchAgent(ua);
  const salt = await dailySalt();
  const session = sessionHash(salt, site.domain, ua, ip);
  const now = Date.now();

  const stored: StoredEvent[] = [];
  for (const e of batch.events) {
    if (e.kind === "manifest") {
      if (e.hash) noteManifest(site.domain, e.hash, now);
      continue;
    }
    if (e.kind === "tool_registered" && e.name) registerTool(site.domain, e.name, e.descriptionHash, e.schemaHash, now);
    stored.push(toStored(e, agent ? `agent:${agent.id}` : matchReferral(e.referrer, e.utm)?.id ?? null, session));
  }
  try {
    recordEvents(site.domain, site.owner, stored, now, { fetchesFromLog: Boolean(site.log_since) });
  } catch (err) {
    console.warn("[event] batch not recorded:", err instanceof Error ? err.message : String(err));
  }
  return done(202);
}

function toStored(e: CleanEvent, source: string | null, session: string): StoredEvent {
  return {
    kind: e.kind,
    name: e.name,
    path: e.path,
    source: e.kind === "view" ? source : null,
    session,
    ms: e.ms,
    ok: e.ok,
    err: e.err,
    keys: e.keys,
    declarative: e.declarative,
    simulated: e.simulated,
  };
}
