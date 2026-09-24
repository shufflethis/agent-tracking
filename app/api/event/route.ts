import { matchAgent, matchReferral, sameSite, sanitizeBatch, sessionHash, type CleanEvent } from "@/lib/tracking/classify";
import { getAccount, getSite, noteIngestOutcome, noteManifest, recordEvents, registerTool, UNATTRIBUTED_INGEST, type StoredEvent } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";
import { dailySalt } from "@/lib/tracking/salt";
import { clientIp, take } from "@/lib/ratelimit";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
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
 *     must match it or its www twin; this is a filter, not authentication:
 *     direct HTTP clients can forge Origin
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

  let raw: string;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, MAX_BODY)); }
  catch (error) { noteIngestOutcome(UNATTRIBUTED_INGEST, "invalid_body"); if (!(error instanceof BodyLimitError)) console.warn("[event] body read failed"); return done(204); }
  if (!raw) { noteIngestOutcome(UNATTRIBUTED_INGEST, "invalid_body"); return done(204); }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    noteIngestOutcome(UNATTRIBUTED_INGEST, "invalid_body");
    return done(204);
  }
  const batch = sanitizeBatch(parsed);
  if (!batch || batch.events.length === 0) { noteIngestOutcome(UNATTRIBUTED_INGEST, "invalid_batch"); return done(204); }

  // The site must exist and the page posting must be on it. A beacon carries
  // Origin on every cross-origin POST; a hand-rolled client without one, or
  // with someone else's, writes nothing.
  const site = getSite(batch.domain);
  if (!site) { noteIngestOutcome(UNATTRIBUTED_INGEST, "unknown_site"); return done(204); }
  const from = originHost(origin);
  if (!from || !sameSite(from, site.domain)) { noteIngestOutcome(UNATTRIBUTED_INGEST, "origin_mismatch"); return done(204); }

  const ip = clientIp(request.headers);
  const budget = take(ip, "ingest");
  if (!budget.ok) { noteIngestOutcome(site.domain, "rate_limited"); return done(204); }

  const account = getAccount(site.owner);
  const plan = planFor(account?.plan);

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
    const referral = matchReferral(e.referrer, e.utm)?.id ?? null;
    stored.push(toStored(e, agent?.id ?? null, referral, session));
  }
  try {
    const result = recordEvents(site.domain, site.owner, stored, now, { fetchesFromLog: Boolean(site.log_since), quota: plan.eventsPerMonth });
    if (result.quotaDropped) noteIngestOutcome(site.domain, "quota_reached", now);
    noteIngestOutcome(site.domain, "accepted_batch", now);
  } catch (err) {
    noteIngestOutcome(site.domain, "write_failed", now);
    console.warn("[event] batch not recorded:", err instanceof Error ? err.message : String(err));
  }
  return done(202);
}

function toStored(e: CleanEvent, agentId: string | null, referral: string | null, session: string): StoredEvent {
  return {
    kind: e.kind,
    name: e.name,
    path: e.path,
    source: e.kind === "view" ? agentId ? `agent:${agentId}` : referral : null,
    session,
    ms: e.ms,
    ok: e.ok,
    err: e.err,
    keys: e.keys,
    declarative: e.declarative,
    simulated: e.simulated,
    eventId: e.id,
    occurredAt: e.occurredAt,
    transport: "browser",
    actorClaim: agentId,
    identityStatus: agentId ? "claimed" : "unknown",
    identityEvidence: agentId ? [{ method: "user_agent", status: "claimed" }] : [],
    referralSource: referral,
    technicalOutcome: e.kind === "tool_call" ? e.state ?? (e.ok === true ? "completed" : e.ok === false ? "failed" : "unknown") : e.kind === "form_attempt" ? e.state ?? "unknown" : e.kind === "goal_attempt" ? "attempted" : "unknown",
    businessOutcome: "unconfirmed",
    taskId: e.taskId,
    invocationId: e.invocationId,
    parentId: e.parentId,
    releaseId: e.releaseId,
    toolVersion: e.toolVersion,
    schemaVersion: e.schemaVersion,
  };
}
