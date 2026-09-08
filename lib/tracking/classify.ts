import { createHash } from "node:crypto";
import sources from "./ai-sources.json";

/**
 * What the snippet sends, sanitised, and who sent it, classified.
 *
 * Pure: no filesystem, no clock beyond what is passed in. Everything that
 * arrives at /api/event comes from a page on somebody else's site, which is
 * to say from anyone, so fields are allow-listed and capped rather than
 * filtered, and the request headers, not the body, decide whether a visit
 * was an AI agent. The list of agents lives in ai-sources.json so a new bot
 * is a data change, not a code change.
 */

export const SOURCES_VERSION: string = sources.version;

export const EVENT_KINDS = ["view", "tool_registered", "tool_call", "agent_conversion", "manifest"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** One event as the snippet sends it. Everything optional but `k`. */
export type RawEvent = {
  k?: unknown;
  /** Page path, no query string. */
  p?: unknown;
  /** Referrer host. */
  r?: unknown;
  /** utm_source, if any. */
  u?: unknown;
  /** Tool or goal name. */
  n?: unknown;
  /** Description hash and schema hash for a registration. */
  dh?: unknown;
  sh?: unknown;
  /** Duration in ms. */
  ms?: unknown;
  ok?: unknown;
  /** Error class or first characters of the message. */
  e?: unknown;
  /** Input key names, never values. */
  keys?: unknown;
  /** Declarative (form) tool rather than a registered one. */
  d?: unknown;
  /** Set by the demo's simulate button. Never read as an agent. */
  sim?: unknown;
  /** Manifest hash. */
  h?: unknown;
};

export type CleanEvent = {
  kind: EventKind;
  path: string;
  name: string | null;
  referrer: string | null;
  utm: string | null;
  ms: number | null;
  ok: boolean | null;
  err: string | null;
  keys: string[];
  declarative: boolean;
  simulated: boolean;
  hash: string | null;
  descriptionHash: string | null;
  schemaHash: string | null;
};

const CAP = { path: 200, name: 128, err: 80, keys: 24, key: 64, referrer: 120, utm: 64, hash: 32 };
const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function sanitizeEvent(raw: unknown): CleanEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawEvent;
  const kind = typeof r.k === "string" && (EVENT_KINDS as readonly string[]).includes(r.k) ? (r.k as EventKind) : null;
  if (!kind) return null;

  // A path is a path: leading slash, no query, no fragment. Query strings are
  // where tokens and search terms live, and neither is ours to keep.
  let path = str(r.p, CAP.path) ?? "/";
  path = path.split(/[?#]/)[0] || "/";
  if (!path.startsWith("/")) path = `/${path}`;

  const name = str(r.n, CAP.name);
  if ((kind === "tool_registered" || kind === "tool_call" || kind === "agent_conversion") && !name) return null;

  const keys = Array.isArray(r.keys)
    ? r.keys.filter((k): k is string => typeof k === "string" && k.length > 0).slice(0, CAP.keys).map((k) => k.slice(0, CAP.key))
    : [];

  const ms = typeof r.ms === "number" && Number.isFinite(r.ms) ? Math.min(Math.max(Math.round(r.ms), 0), 600_000) : null;

  return {
    kind,
    path,
    name,
    referrer: str(r.r, CAP.referrer)?.toLowerCase() ?? null,
    utm: str(r.u, CAP.utm)?.toLowerCase() ?? null,
    ms,
    ok: typeof r.ok === "boolean" ? r.ok : null,
    err: str(r.e, CAP.err),
    keys,
    declarative: r.d === true || r.d === 1,
    simulated: r.sim === true || r.sim === 1,
    hash: str(r.h, CAP.hash),
    descriptionHash: str(r.dh, CAP.hash),
    schemaHash: str(r.sh, CAP.hash),
  };
}

export const MAX_BATCH = 50;

/** A batch as posted: `{ d: domain, e: [events] }`. Returns the clean events and the claimed domain. */
export function sanitizeBatch(body: unknown): { domain: string; events: CleanEvent[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { d?: unknown; e?: unknown };
  const domain = normalizeDomain(typeof b.d === "string" ? b.d : "");
  if (!domain) return null;
  const list = Array.isArray(b.e) ? b.e.slice(0, MAX_BATCH) : [];
  const events = list.map(sanitizeEvent).filter((e): e is CleanEvent => e !== null);
  return { domain, events };
}

const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Lower-case, no scheme, no path, no port. Null when it is not a hostname. */
export function normalizeDomain(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").split(/[/?#:]/)[0];
  // A hostname, with a top-level label that is a word: an address made of
  // digits is an IP, and the crawler's refusal of bare IPs applies here too.
  if (!DOMAIN_RE.test(value)) return null;
  return /[a-z]/.test(value.split(".").pop() ?? "") ? value : null;
}

/** `example.com` and `www.example.com` are the same site for every purpose here. */
export function sameSite(a: string, b: string): boolean {
  const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return strip(a) === strip(b);
}

export type ReferralMatch = { id: string; label: string; via: "referrer" | "utm" };

export function matchReferral(referrer: string | null, utm: string | null): ReferralMatch | null {
  if (referrer) {
    const host = referrer.replace(/^https?:\/\//, "").split("/")[0];
    for (const entry of sources.referrers) {
      for (const h of entry.hosts) {
        const [hostPart, pathPart] = h.split("/", 2);
        if (host === hostPart || host.endsWith(`.${hostPart}`)) {
          if (!pathPart || referrer.includes(`/${pathPart}`)) return { id: entry.id, label: entry.label, via: "referrer" };
        }
      }
    }
  }
  if (utm) {
    for (const entry of sources.utm) {
      if (utm.includes(entry.pattern)) {
        const label = sources.referrers.find((r) => r.id === entry.id)?.label ?? entry.id;
        return { id: entry.id, label, via: "utm" };
      }
    }
  }
  return null;
}

export type AgentMatch = { id: string; label: string; vendor: string; kind: string };

/** The AI agent behind a user agent string, or null for a browser or an unknown bot. */
export function matchAgent(userAgent: string | null): AgentMatch | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  for (const a of sources.agents) {
    if (ua.includes(a.token)) return { id: a.id, label: a.label, vendor: a.vendor, kind: a.kind };
  }
  return null;
}

/**
 * A coarse browser class, for the session hash and nothing else.
 *
 * Coarse on purpose: the class goes into a hash together with the address
 * and a daily salt, and the whole point is that two people on the same
 * network with the same browser are one session for a day and nobody for
 * longer. A full user agent string would make the hash a fingerprint.
 */
export function uaClass(userAgent: string | null): string {
  const ua = (userAgent ?? "").toLowerCase();
  const agent = matchAgent(ua);
  if (agent) return `agent:${agent.id}`;
  const mobile = /mobile|android|iphone|ipad/.test(ua) ? "m" : "d";
  const family = /edg\//.test(ua)
    ? "edge"
    : /opr\//.test(ua)
      ? "opera"
      : /chrome\//.test(ua)
        ? "chrome"
        : /safari\//.test(ua)
          ? "safari"
          : /firefox\//.test(ua)
            ? "firefox"
            : "other";
  return `${family}:${mobile}`;
}

/**
 * The session id: daily salt, domain, browser class and address, hashed.
 *
 * Nothing in it is stored except the result, and the result cannot be
 * reversed: the salt is random and gone with the day, so the same visitor
 * tomorrow is a different session and there is no way to join the two. The
 * address never lands on disk in any form.
 */
export function sessionHash(salt: string, domain: string, ua: string | null, ip: string): string {
  return createHash("sha256").update(`${salt}\0${domain}\0${uaClass(ua)}\0${ip}`).digest("base64url").slice(0, 16);
}

/** Registered tool names, from the same source, for the dashboard's legend. */
export const AGENT_LABELS: Record<string, string> = Object.fromEntries(sources.agents.map((a) => [a.id, a.label]));
export const REFERRER_LABELS: Record<string, string> = Object.fromEntries(sources.referrers.map((r) => [r.id, r.label]));
