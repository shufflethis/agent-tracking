import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * The agents nobody has added to the list yet.
 *
 * lib/tracking/log-import.ts line for line:
 *
 *     const agent = matchAgent(line.ua);
 *     if (!agent) continue;
 *
 * Everything not in ai-sources.json is dropped on the floor. That file is meant
 * to be the place a new bot arrives as a data change rather than a code change,
 * which is true and also means somebody has to notice the bot first. Nobody
 * does. A vendor ships a new fetcher, it hits customer sites for weeks, and the
 * dashboard says the web got quieter.
 *
 * This module closes that loop without letting a guess become a number. The
 * quarter-hourly import keeps a tally of user agents it could not place; the
 * nightly run asks a System One model which of them are agents at all and what
 * kind, and writes the answers out as **suggested entries for ai-sources.json**.
 * A suggestion is read by a person and pasted in, or not. Nothing here is ever
 * counted, because lib/tracking/bot-ranges.ts already refuses to count a claim
 * it cannot verify, and a probability is a weaker thing than a claim.
 *
 * What leaves the server, and what does not:
 *
 *  - Only strings that look like a bot at all (`botShaped`), so a browser's
 *    user agent is never sent — not because it would identify anybody on its
 *    own, but because the product promises the visitor's side stays here.
 *  - Deduplicated, so a million fetches are one string.
 *  - Nothing else. No address, no path, no time, no site, no visitor.
 *
 * Absent TYPESAFE_API_KEY the tally still accumulates and nothing is sent, which
 * is the state every self-hosted installation runs in until somebody chooses
 * otherwise.
 */

/**
 * What may be sent, decided by explicit markers rather than by exclusion.
 *
 * An allow-list is the right shape here: a browser string contains none of
 * these, so a mistake in this pattern fails towards sending nothing rather than
 * towards sending a visitor's browser. The `+http` form is the strongest signal
 * of the lot — it is the convention by which a crawler names the page that
 * explains it, and no browser has ever carried one.
 */
const BOT_MARKERS = [
  /\+https?:\/\//i,
  // No word boundary in front on purpose: the common shape is a compound —
  // ExampleBot, SomeCrawler, NewsSpider — where a leading \b would never match.
  // A browser string contains none of these words in any position, so dropping
  // the boundary costs nothing on the side that matters.
  /(bot|crawler|spider|scraper|indexer|archiver)([\/;\s)\-_]|$)/i,
  /\b(python-requests|python-urllib|aiohttp|httpx|libwww-perl|java\/|go-http-client|okhttp|axios|node-fetch|got\/|guzzle|curl\/|wget\/|powershell)/i,
  /\b(headlesschrome|phantomjs|playwright|puppeteer|selenium)\b/i,
];

/** Whether a user agent may be sent for triage at all. */
export function botShaped(ua: string): boolean {
  const s = ua.trim();
  if (!s || s.length > 512) return false;
  return BOT_MARKERS.some((re) => re.test(s));
}

/**
 * The product token inside a user agent, which is what ai-sources.json matches on.
 *
 * Derived here rather than asked of the model: the token is present in the
 * string, so choosing it is code's job. A System One model answers questions; it
 * does not write text, and a token it invented would not match anything anyway.
 */
export function tokenFor(ua: string): string | null {
  const boring = /^(mozilla|applewebkit|khtml|gecko|chrome|safari|version|like|compatible|windows|macintosh|x11|linux|android|iphone|ipad|mobile)$/i;
  for (const [, name] of ua.matchAll(/([A-Za-z][A-Za-z0-9._-]{2,40})\/[0-9]/g)) {
    if (!boring.test(name)) return name.toLowerCase();
  }
  // No Name/Version pair: a bare token such as "SomeBot" or a bracketed claim.
  const bare = /([A-Za-z][A-Za-z0-9._-]{2,40}(?:bot|crawler|spider|agent))/i.exec(ua);
  return bare ? bare[1].toLowerCase() : null;
}

export type UnknownAgent = { ua: string; hits: number; firstSeen: number; lastSeen: number; triagedAt?: number };
export type TriageStore = { agents: UnknownAgent[] };

/** How many distinct strings the tally keeps. Beyond this the rarest are forgotten. */
export const STORE_CAP = 500;

export const emptyStore = (): TriageStore => ({ agents: [] });

/**
 * Fold what one import saw into the tally.
 *
 * Case-folded, because the same fetcher arrives with different capitalisation
 * from different builds and three spellings of one bot would spend three calls
 * to reach the same answer. The original casing of the first sighting is kept
 * for the person who reads the suggestion.
 */
export function mergeUnknown(store: TriageStore, seen: { ua: string; hits: number }[], at: number): TriageStore {
  const byKey = new Map(store.agents.map((a) => [a.ua.toLowerCase(), { ...a }]));
  for (const { ua, hits } of seen) {
    if (!botShaped(ua)) continue;
    const key = ua.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.hits += hits;
      existing.lastSeen = Math.max(existing.lastSeen, at);
    } else {
      byKey.set(key, { ua: ua.trim().slice(0, 512), hits, firstSeen: at, lastSeen: at });
    }
  }
  const agents = [...byKey.values()].sort((a, b) => b.hits - a.hits || b.lastSeen - a.lastSeen).slice(0, STORE_CAP);
  return { agents };
}

/** Never triaged, busiest first. What a nightly run would spend its calls on. */
export function pending(store: TriageStore, limit: number): UnknownAgent[] {
  return store.agents.filter((a) => a.triagedAt === undefined).slice(0, limit);
}

export type Suggestion = {
  /** The string as first seen, for the person who decides. */
  ua: string;
  /** What ai-sources.json would match on, or null when none could be derived. */
  token: string | null;
  /** One of ai-sources.json's kinds, or "none" when the model says it is not an agent. */
  kind: "crawler" | "fetcher" | "agent" | "none";
  /** Probability that this is an AI agent at all. */
  agentProbability: number;
  /** How concentrated the kind distribution was. Not a claim about correctness. */
  kindConfidence: number;
  hits: number;
  firstSeen: number;
  lastSeen: number;
  decidedAt: number;
  model: string;
  /** Whether it clears the thresholds below, and is therefore worth reading first. */
  propose: boolean;
};

/**
 * Provisional, to be moved once there are enough nights to look at.
 *
 * A false yes costs one line a person declines to paste. A false no costs an
 * agent staying invisible for another while, which is the failure this module
 * exists to fix — so the gate leans towards showing rather than hiding, and
 * everything that was asked is written down either way.
 */
export const PROPOSE_AT = 0.7;

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

const QUESTIONS = {
  is_agent: {
    type: "noul",
    instructions:
      "`userAgent` is a User-Agent header a web server received. Was it sent by an AI crawler, an AI assistant fetching a page on someone's behalf, or an autonomous AI agent?",
    criteria: {
      true: "It identifies an AI crawler, an AI assistant's fetcher, or an autonomous agent acting for a user.",
      false:
        "It is anything else: a person's browser, a classic search engine crawler, an uptime or security scanner, a feed reader, a bare HTTP library, or a string that identifies nothing in particular.",
    },
  },
  kind: {
    type: "choice",
    instructions:
      "`userAgent` is a User-Agent header a web server received. Which of these sent it? Judge only what the string itself says and what is known of the software it names.",
    criteria: {
      crawler:
        "A crawler that collects pages in bulk and on its own schedule, typically to build a corpus or a search index for an AI system. Nobody is waiting for the response.",
      fetcher:
        "A fetcher that retrieves one page because a person just asked an AI assistant something. Somebody is waiting for the response.",
      agent:
        "An autonomous agent carrying out a task on a site: browsing, filling something in, calling a tool, rather than only reading.",
      none: "None of these. It is a browser, a classic search crawler, a monitoring or security scanner, or an unidentifiable HTTP client.",
    },
  },
} as const;

export type TriageOptions = { fetchImpl?: typeof fetch; apiKey?: string; timeoutMs?: number };
export type TriageOutcome = { suggestions: Suggestion[]; asked: number; failures: string[] };

async function askOne(
  agent: UnknownAgent,
  apiKey: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  at: number,
): Promise<Suggestion | { error: string }> {
  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, state: { userAgent: agent.ua }, questions: QUESTIONS }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "TypeSafe did not answer." };
  }
  if (!res.ok) return { error: `TypeSafe answered ${res.status}.` };

  const body = (await res.json().catch(() => null)) as
    | { model?: unknown; answers?: { is_agent?: { noul?: unknown }; kind?: { choice?: unknown; confidence?: unknown } } }
    | null;
  const noul = body?.answers?.is_agent?.noul;
  const choice = body?.answers?.kind?.choice;
  const confidence = body?.answers?.kind?.confidence;
  if (typeof noul !== "number" || typeof choice !== "string" || !(choice in QUESTIONS.kind.criteria)) {
    return { error: "TypeSafe answered without a usable judgment." };
  }

  const kind = choice as Suggestion["kind"];
  return {
    ua: agent.ua,
    token: tokenFor(agent.ua),
    kind,
    agentProbability: Math.round(noul * 100) / 100,
    kindConfidence: typeof confidence === "number" ? Math.round(confidence * 100) / 100 : 0,
    hits: agent.hits,
    firstSeen: agent.firstSeen,
    lastSeen: agent.lastSeen,
    decidedAt: at,
    model: typeof body?.model === "string" ? body.model : MODEL,
    propose: noul >= PROPOSE_AT && kind !== "none",
  };
}

/**
 * Ask about each string in turn, and never throw.
 *
 * One request per user agent rather than one request for all of them: the two
 * questions are about one string, and a list would have to be referenced by
 * position, which is the kind of indirection these models are documented to be
 * worst at. A night's worth is dozens of requests, not millions.
 *
 * Sequential on purpose. Nothing is waiting on this, and a nightly job has no
 * business opening thirty connections to anyone.
 */
export async function triage(agents: UnknownAgent[], options: TriageOptions = {}): Promise<TriageOutcome | null> {
  const apiKey = options.apiKey ?? process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;
  if (!agents.length) return { suggestions: [], asked: 0, failures: [] };

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const at = Date.now();
  const suggestions: Suggestion[] = [];
  const failures: string[] = [];

  for (const agent of agents) {
    const outcome = await askOne(agent, apiKey, fetchImpl, timeoutMs, at);
    if ("error" in outcome) failures.push(`${agent.ua.slice(0, 60)}: ${outcome.error}`);
    else suggestions.push(outcome);
  }

  return { suggestions, asked: agents.length, failures };
}

/** Mark what was asked about, so a night never pays for the same string twice. */
export function markTriaged(store: TriageStore, uas: string[], at: number): TriageStore {
  const done = new Set(uas.map((u) => u.toLowerCase()));
  return { agents: store.agents.map((a) => (done.has(a.ua.toLowerCase()) ? { ...a, triagedAt: at } : a)) };
}

/**
 * Where the tally and the suggestions live.
 *
 * Files rather than tables, and deliberately so. Everything in the database is
 * something the dashboard counts; putting a tally of guesses next to it would
 * invite a later query to join the two. lib/tracking/bot-ranges.ts keeps its
 * fetched ranges in .data for the same reason, and resolves the path per call
 * rather than at import so a test cannot write into the real one.
 */
export const storeFile = () => process.env.UNKNOWN_AGENTS_FILE ?? ".data/unknown-agents.json";
export const suggestionsFile = () => process.env.AGENT_SUGGESTIONS_FILE ?? ".data/agent-suggestions.json";

export function loadStore(path = storeFile()): TriageStore {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as TriageStore;
    return parsed && Array.isArray(parsed.agents) ? parsed : emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: TriageStore, path = storeFile()): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2));
}

export function loadSuggestions(path = suggestionsFile()): Suggestion[] {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Suggestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Newest first, and the ones worth reading first at the top of those. */
export function saveSuggestions(suggestions: Suggestion[], path = suggestionsFile()): void {
  mkdirSync(dirname(path), { recursive: true });
  const all = [...suggestions, ...loadSuggestions(path)];
  const seen = new Set<string>();
  const merged = all.filter((s) => {
    const key = s.ua.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  merged.sort((a, b) => Number(b.propose) - Number(a.propose) || b.decidedAt - a.decidedAt || b.hits - a.hits);
  writeFileSync(path, JSON.stringify(merged.slice(0, STORE_CAP), null, 2));
}
