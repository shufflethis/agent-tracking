import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CleanEvent } from "./classify";
import { RAW_RETENTION_DAYS, type PlanId } from "./plans";

/**
 * The tracking store.
 *
 * One SQLite file, opened once per process, written by the ingest route and
 * by the nightly script. This is the first real database in the codebase and
 * the reason is arithmetic: a Pro site is allowed half a million events a
 * month, and a dashboard that reads a month of JSONL per view would fall over
 * at a tenth of that. `node:sqlite` ships with the Node this server runs, so
 * it costs no dependency.
 *
 * Aggregation happens on write. Every event bumps a daily counter keyed by
 * domain, day, kind and name; the dashboard reads counters, never raw rows,
 * and raw rows are pruned after RAW_RETENTION_DAYS while counters stay.
 *
 * Resolved per call, not at module load, lib/archive.ts explains the scar.
 */

const TIME_ZONE = "Europe/Berlin";

const file = () => process.env.TRACKING_DB ?? join(process.cwd(), ".data", "tracking.sqlite");

let handle: { path: string; db: DatabaseSync } | null = null;

const SCHEMA = `
create table if not exists accounts (
  email text primary key,
  plan text not null default 'free',
  created_at integer not null,
  stripe_customer text,
  stripe_subscription text
);
create table if not exists used_tokens (
  hash text primary key,
  expires integer not null
);
create table if not exists sites (
  domain text primary key,
  owner text not null references accounts(email),
  created_at integer not null,
  verified_at integer,
  public_share integer not null default 0,
  last_score integer,
  last_grade text,
  last_scanned_at integer,
  manifest_hash text,
  manifest_changed_at integer
);
create index if not exists sites_owner on sites(owner);
create table if not exists events (
  id integer primary key,
  domain text not null,
  t integer not null,
  kind text not null,
  name text,
  path text not null,
  source text,
  session text,
  ms integer,
  ok integer,
  err text,
  keys text,
  declarative integer not null default 0,
  simulated integer not null default 0
);
create index if not exists events_domain_t on events(domain, t);
create table if not exists daily (
  domain text not null,
  day text not null,
  kind text not null,
  name text not null,
  count integer not null default 0,
  errors integer not null default 0,
  ms_total integer not null default 0,
  primary key (domain, day, kind, name)
);
create table if not exists tools (
  domain text not null,
  name text not null,
  description_hash text,
  schema_hash text,
  first_seen integer not null,
  last_seen integer not null,
  declarative integer not null default 0,
  primary key (domain, name)
);
create table if not exists usage (
  owner text not null,
  month text not null,
  count integer not null default 0,
  primary key (owner, month)
);
`;

export function db(): DatabaseSync {
  const path = file();
  if (handle && handle.path === path) return handle.db;
  if (handle) handle.db.close();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const instance = new DatabaseSync(path);
  // WAL so the nightly script and the server can hold the file at once, and a
  // busy timeout so the loser of a write race waits instead of throwing.
  if (path !== ":memory:") instance.exec("pragma journal_mode = wal;");
  instance.exec("pragma busy_timeout = 5000;");
  instance.exec(SCHEMA);
  migrate(instance);
  handle = { path, db: instance };
  return instance;
}

/**
 * Columns added after the first release. SQLite has no "add column if not
 * exists", so each one is checked against the table before it is added.
 */
function migrate(instance: DatabaseSync): void {
  const columns = new Set((instance.prepare("pragma table_info(accounts)").all() as { name: string }[]).map((c) => c.name));
  if (!columns.has("api_token_hash")) instance.exec("alter table accounts add column api_token_hash text");
  if (!columns.has("api_token_created_at")) instance.exec("alter table accounts add column api_token_created_at integer");
  if (!columns.has("digest")) instance.exec("alter table accounts add column digest integer not null default 1");
  if (!columns.has("lang")) instance.exec("alter table accounts add column lang text");
  const siteColumns = new Set((instance.prepare("pragma table_info(sites)").all() as { name: string }[]).map((c) => c.name));
  if (!siteColumns.has("log_since")) instance.exec("alter table sites add column log_since integer");
  if (!siteColumns.has("log_last_t")) instance.exec("alter table sites add column log_last_t integer");
}

/** Test seam: close and forget the handle so the next call opens fresh. */
export function closeDb(): void {
  if (handle) handle.db.close();
  handle = null;
}

export const dayKey = (at: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(at));
export const monthKey = (at: number) => dayKey(at).slice(0, 7);

/* ---------------------------------------------------------------- accounts */

export type Account = {
  email: string;
  plan: PlanId;
  created_at: number;
  stripe_customer: string | null;
  stripe_subscription: string | null;
  /** SHA-256 of the API token; the token itself is shown once and not kept. */
  api_token_hash: string | null;
  api_token_created_at: number | null;
  /** 1 while the account wants the weekly digest. */
  digest: number;
  /** Dashboard language, en or de; null until the first sign-in picks one. */
  lang: string | null;
};

export function ensureAccount(email: string, now = Date.now()): Account {
  const key = email.toLowerCase();
  db().prepare("insert into accounts (email, plan, created_at) values (?, 'free', ?) on conflict(email) do nothing").run(key, now);
  return db().prepare("select * from accounts where email = ?").get(key) as Account;
}

export function getAccount(email: string): Account | null {
  return (db().prepare("select * from accounts where email = ?").get(email.toLowerCase()) as Account | undefined) ?? null;
}

export function setPlan(email: string, plan: PlanId, stripe?: { customer?: string | null; subscription?: string | null }): void {
  db()
    .prepare("update accounts set plan = ?, stripe_customer = coalesce(?, stripe_customer), stripe_subscription = coalesce(?, stripe_subscription) where email = ?")
    .run(plan, stripe?.customer ?? null, stripe?.subscription ?? null, email.toLowerCase());
}

export function setApiToken(email: string, hash: string | null, now = Date.now()): void {
  db().prepare("update accounts set api_token_hash = ?, api_token_created_at = ? where email = ?").run(hash, hash ? now : null, email.toLowerCase());
}

export function setLang(email: string, lang: string): void {
  db().prepare("update accounts set lang = ? where email = ?").run(lang, email.toLowerCase());
}

export function setDigest(email: string, on: boolean): void {
  db().prepare("update accounts set digest = ? where email = ?").run(on ? 1 : 0, email.toLowerCase());
}

export function accountsWithDigest(): Account[] {
  return db().prepare("select * from accounts where digest = 1 order by created_at").all() as Account[];
}

/**
 * A sign-in token is good once. The hash of every token that opened a
 * session is kept until the token would have expired anyway; a second
 * use inside that window is refused. Returns false when already used.
 */
export function markTokenUsed(hash: string, expires: number, now = Date.now()): boolean {
  const d = db();
  d.prepare("delete from used_tokens where expires < ?").run(now);
  try {
    d.prepare("insert into used_tokens (hash, expires) values (?, ?)").run(hash, expires);
    return true;
  } catch {
    return false;
  }
}

export function accountByApiToken(hash: string): Account | null {
  return (db().prepare("select * from accounts where api_token_hash = ?").get(hash) as Account | undefined) ?? null;
}

export function accountByStripeCustomer(customer: string): Account | null {
  return (db().prepare("select * from accounts where stripe_customer = ?").get(customer) as Account | undefined) ?? null;
}

/* ------------------------------------------------------------------- sites */

export type Site = {
  domain: string;
  owner: string;
  created_at: number;
  verified_at: number | null;
  public_share: number;
  last_score: number | null;
  last_grade: string | null;
  last_scanned_at: number | null;
  manifest_hash: string | null;
  manifest_changed_at: number | null;
  /** Set once fetches for this site come from its server log; the snippet's fetch counts are then not added on top. */
  log_since: number | null;
  /** Time of the newest log line imported; older lines in a re-sent file are skipped. */
  log_last_t: number | null;
};

export function getSite(domain: string): Site | null {
  return (db().prepare("select * from sites where domain = ?").get(domain.toLowerCase()) as Site | undefined) ?? null;
}

export function sitesFor(owner: string): Site[] {
  return db().prepare("select * from sites where owner = ? order by created_at").all(owner.toLowerCase()) as Site[];
}

export function allSites(): Site[] {
  return db().prepare("select * from sites order by created_at").all() as Site[];
}

/** Null when the domain is already someone else's. First registrant keeps it. */
export function addSite(domain: string, owner: string, now = Date.now()): Site | null {
  const key = domain.toLowerCase();
  const existing = getSite(key);
  if (existing) return existing.owner === owner.toLowerCase() ? existing : null;
  db().prepare("insert into sites (domain, owner, created_at) values (?, ?, ?)").run(key, owner.toLowerCase(), now);
  return getSite(key);
}

export function removeSite(domain: string, owner: string): boolean {
  const key = domain.toLowerCase();
  const site = getSite(key);
  if (!site || site.owner !== owner.toLowerCase()) return false;
  const d = db();
  d.prepare("delete from events where domain = ?").run(key);
  d.prepare("delete from daily where domain = ?").run(key);
  d.prepare("delete from tools where domain = ?").run(key);
  d.prepare("delete from sites where domain = ?").run(key);
  return true;
}

export function markVerified(domain: string, now = Date.now()): void {
  db().prepare("update sites set verified_at = ? where domain = ?").run(now, domain.toLowerCase());
}

/** Fetches for this site come from the server log from now on. Idempotent. */
export function setLogSource(domain: string, now = Date.now(), lastT: number | null = null): void {
  db().prepare("update sites set log_since = coalesce(log_since, ?), log_last_t = max(coalesce(log_last_t, 0), coalesce(?, 0)) where domain = ?").run(now, lastT, domain.toLowerCase());
}

export function setPublicShare(domain: string, on: boolean): void {
  db().prepare("update sites set public_share = ? where domain = ?").run(on ? 1 : 0, domain.toLowerCase());
}

export function setScore(domain: string, score: number, grade: string, now = Date.now()): void {
  db().prepare("update sites set last_score = ?, last_grade = ?, last_scanned_at = ? where domain = ?").run(score, grade, now, domain.toLowerCase());
}

/** Returns true when the manifest hash differs from the one on file (and the file had one). */
export function noteManifest(domain: string, hash: string, now = Date.now()): boolean {
  const site = getSite(domain);
  if (!site) return false;
  if (site.manifest_hash === hash) return false;
  const changed = site.manifest_hash !== null;
  db().prepare("update sites set manifest_hash = ?, manifest_changed_at = ? where domain = ?").run(hash, changed ? now : site.manifest_changed_at, domain.toLowerCase());
  return changed;
}

/* ------------------------------------------------------------------ usage */

export function usageThisMonth(owner: string, now = Date.now()): number {
  const row = db().prepare("select count from usage where owner = ? and month = ?").get(owner.toLowerCase(), monthKey(now)) as { count: number } | undefined;
  return row?.count ?? 0;
}

function addUsage(owner: string, n: number, now: number): void {
  db()
    .prepare("insert into usage (owner, month, count) values (?, ?, ?) on conflict(owner, month) do update set count = count + excluded.count")
    .run(owner.toLowerCase(), monthKey(now), n);
}

/* ----------------------------------------------------------------- events */

export type StoredEvent = {
  kind: string;
  name: string | null;
  path: string;
  /** Agent id, referral id or null for an unclassified visit. */
  source: string | null;
  session: string;
  ms: number | null;
  ok: boolean | null;
  err: string | null;
  keys: string[];
  declarative: boolean;
  simulated: boolean;
};

let prunedFor = "";

/**
 * Write a batch: raw rows, daily counters, the tool registry and the monthly
 * usage, in one transaction. Plain `view` rows are counted but not kept raw
 * and not charged to the plan: a human page view is not what this product is
 * about and would be most of the table.
 */
export function recordEvents(domain: string, owner: string, events: StoredEvent[], now = Date.now(), options: { fetchesFromLog?: boolean } = {}): void {
  if (events.length === 0) return;
  const d = db();
  const day = dayKey(now);
  if (prunedFor !== day) {
    prunedFor = day;
    pruneRaw(now);
  }

  const insertEvent = d.prepare(
    "insert into events (domain, t, kind, name, path, source, session, ms, ok, err, keys, declarative, simulated) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const bump = d.prepare(
    "insert into daily (domain, day, kind, name, count, errors, ms_total) values (?, ?, ?, ?, 1, ?, ?) on conflict(domain, day, kind, name) do update set count = count + 1, errors = errors + excluded.errors, ms_total = ms_total + excluded.ms_total",
  );
  const tool = d.prepare(
    "insert into tools (domain, name, description_hash, schema_hash, first_seen, last_seen, declarative) values (?, ?, ?, ?, ?, ?, ?) on conflict(domain, name) do update set description_hash = coalesce(excluded.description_hash, description_hash), schema_hash = coalesce(excluded.schema_hash, schema_hash), last_seen = excluded.last_seen, declarative = max(declarative, excluded.declarative)",
  );

  d.exec("begin");
  try {
    for (const e of events) {
      const keep = e.kind !== "view" || e.source !== null;
      if (keep) {
        insertEvent.run(domain, now, e.kind, e.name, e.path, e.source, e.session, e.ms, e.ok === null ? null : e.ok ? 1 : 0, e.err, e.keys.length ? JSON.stringify(e.keys) : null, e.declarative ? 1 : 0, e.simulated ? 1 : 0);
      }
      const errors = e.ok === false ? 1 : 0;
      const msTotal = e.ms ?? 0;
      if (e.kind === "view") {
        bump.run(domain, day, "view", "all", 0, 0);
        if (e.source) {
          const isFetch = e.source.startsWith("agent:");
          // When the server log feeds this site, it already holds every agent
          // fetch, including the ones that ran the snippet; counting those
          // here too would double them. Referrals are people, not in the log's
          // agent lines, and still count.
          if (!(isFetch && options.fetchesFromLog)) {
            bump.run(domain, day, isFetch ? "ai_fetch" : "ai_referral", e.source, 0, 0);
            bump.run(domain, day, "page", e.path, 0, 0);
          }
        }
      } else if (e.kind === "tool_call") {
        bump.run(domain, day, e.simulated ? "tool_call_sim" : "tool_call", e.name ?? "?", errors, msTotal);
        if (!e.simulated) bump.run(domain, day, "tool_page", e.path, 0, 0);
        if (e.err && !e.simulated) bump.run(domain, day, "tool_error", `${e.name ?? "?"} ${e.err}`, 0, 0);
      } else if (e.kind === "tool_registered") {
        bump.run(domain, day, "tool_registered", e.name ?? "?", 0, 0);
      } else if (e.kind === "agent_conversion") {
        bump.run(domain, day, e.simulated ? "conversion_sim" : "conversion", e.name ?? "?", 0, 0);
      }
      if ((e.kind === "tool_registered" || e.kind === "tool_call") && e.name) {
        tool.run(domain, e.name, null, null, now, now, e.declarative ? 1 : 0);
      }
    }
    // Plain human views are free; only the rows that are kept count against the plan.
    addUsage(owner, events.filter((e) => e.kind !== "view" || e.source !== null).length, now);
    d.exec("commit");
  } catch (err) {
    d.exec("rollback");
    throw err;
  }
}

export function registerTool(domain: string, name: string, descriptionHash: string | null, schemaHash: string | null, now = Date.now()): void {
  db()
    .prepare(
      "insert into tools (domain, name, description_hash, schema_hash, first_seen, last_seen, declarative) values (?, ?, ?, ?, ?, ?, 0) on conflict(domain, name) do update set description_hash = coalesce(excluded.description_hash, description_hash), schema_hash = coalesce(excluded.schema_hash, schema_hash), last_seen = excluded.last_seen",
    )
    .run(domain, name, descriptionHash, schemaHash, now, now);
}

export function pruneRaw(now = Date.now()): number {
  const cutoff = now - RAW_RETENTION_DAYS * 86_400_000;
  const result = db().prepare("delete from events where t < ?").run(cutoff);
  return Number(result.changes);
}

/* --------------------------------------------------------------- reading */

/* -------------------------------------------------------------- log import */

/** Daily fetch counters from the server log: the same rows the snippet would write for an agent that ran it. */
export function recordLogFetches(domain: string, fetches: { day: string; agent: string; path: string }[], unverified: { day: string; agent: string }[] = [], owner: string | null = null, now = Date.now()): void {
  if (fetches.length === 0 && unverified.length === 0) return;
  const d = db();
  const bump = d.prepare(
    "insert into daily (domain, day, kind, name, count, errors, ms_total) values (?, ?, ?, ?, 1, 0, 0) on conflict(domain, day, kind, name) do update set count = count + 1",
  );
  d.exec("begin");
  try {
    for (const f of fetches) {
      bump.run(domain.toLowerCase(), f.day, "ai_fetch", `agent:${f.agent}`);
      bump.run(domain.toLowerCase(), f.day, "page", f.path);
    }
    // Claimed an agent with published ranges, came from elsewhere: shown, not counted.
    for (const u of unverified) bump.run(domain.toLowerCase(), u.day, "unverified", `agent:${u.agent}`);
    // A fetch from the log is an agent event like any other for the quota.
    if (owner && fetches.length) addUsage(owner, fetches.length, now);
    d.exec("commit");
  } catch (err) {
    d.exec("rollback");
    throw err;
  }
}

/**
 * Bursts: one daily counter per agent (count = bursts, ms_total = pages) and
 * one raw row each so the dashboard can list the last few. The row reuses
 * the events table: kind fetch_burst, name the agent id, path the first
 * page, ms the duration, keys the pages. No session: there was no browser.
 */
export function recordBursts(domain: string, bursts: { agent: string; start: number; ms: number; paths: string[] }[]): void {
  if (bursts.length === 0) return;
  const d = db();
  const bump = d.prepare(
    "insert into daily (domain, day, kind, name, count, errors, ms_total) values (?, ?, 'burst', ?, 1, 0, ?) on conflict(domain, day, kind, name) do update set count = count + 1, ms_total = ms_total + excluded.ms_total",
  );
  const insert = d.prepare("insert into events (domain, t, kind, name, path, source, session, ms, ok, err, keys, declarative, simulated) values (?, ?, 'fetch_burst', ?, ?, ?, 'log', ?, null, null, ?, 0, 0)");
  d.exec("begin");
  try {
    for (const b of bursts) {
      bump.run(domain.toLowerCase(), dayKey(b.start), `agent:${b.agent}`, b.paths.length);
      insert.run(domain.toLowerCase(), b.start, b.agent, b.paths[0] ?? "/", `agent:${b.agent}`, b.ms, JSON.stringify(b.paths));
    }
    d.exec("commit");
  } catch (err) {
    d.exec("rollback");
    throw err;
  }
}

export type BurstRow = { t: number; agent: string; ms: number; paths: string[] };

export function recentBursts(domain: string, limit = 12): BurstRow[] {
  const rows = db().prepare("select t, name, ms, keys from events where domain = ? and kind = 'fetch_burst' order by t desc limit ?").all(domain.toLowerCase(), limit) as { t: number; name: string; ms: number; keys: string | null }[];
  return rows.map((r) => ({ t: r.t, agent: r.name, ms: r.ms, paths: r.keys ? (JSON.parse(r.keys) as string[]) : [] }));
}

export type DailyRow = { day: string; kind: string; name: string; count: number; errors: number; ms_total: number };

export function dailyRows(domain: string, days: number, now = Date.now()): DailyRow[] {
  const from = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare("select day, kind, name, count, errors, ms_total from daily where domain = ? and day >= ? order by day").all(domain.toLowerCase(), from) as DailyRow[];
}

export type ToolRow = { name: string; description_hash: string | null; schema_hash: string | null; first_seen: number; last_seen: number; declarative: number };

export function toolRows(domain: string): ToolRow[] {
  return db().prepare("select name, description_hash, schema_hash, first_seen, last_seen, declarative from tools where domain = ? order by name").all(domain.toLowerCase()) as ToolRow[];
}

export type RecentRow = { t: number; kind: string; name: string | null; path: string; source: string | null; ms: number | null; ok: number | null; err: string | null; keys: string | null; declarative: number; simulated: number };

export function recentEvents(domain: string, limit = 50): RecentRow[] {
  return db().prepare("select t, kind, name, path, source, ms, ok, err, keys, declarative, simulated from events where domain = ? order by t desc limit ?").all(domain.toLowerCase(), limit) as RecentRow[];
}

/** Distinct sessions that called a tool, per day, for the overview's "agents" line. */
export function sessionsPerDay(domain: string, days: number, now = Date.now()): { day: string; sessions: number }[] {
  const from = now - days * 86_400_000;
  const rows = db()
    .prepare("select t, session from events where domain = ? and t >= ? and kind = 'tool_call' and simulated = 0")
    .all(domain.toLowerCase(), from) as { t: number; session: string }[];
  const perDay = new Map<string, Set<string>>();
  for (const r of rows) {
    const day = dayKey(r.t);
    const set = perDay.get(day) ?? new Set<string>();
    set.add(r.session);
    perDay.set(day, set);
  }
  return [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, set]) => ({ day, sessions: set.size }));
}
