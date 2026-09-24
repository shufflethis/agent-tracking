import { mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CleanEvent } from "./classify";
import { MEASUREMENT_VERSION, type BusinessOutcome, type IdentityEvidence, type IdentityStatus, type TechnicalOutcome, type Transport } from "./measurement";
import { redactPath, safeErrorClass, safeEventName } from "./privacy";
import { RAW_RETENTION_DAYS, type PlanId } from "./plans";
import { planFor } from "./plans";
import { browserUsage, logUsage } from "./usage-rules";
import { importLines, type ImportResult, type LogAttempt } from "./log-import";
import type { Ranges } from "./bot-ranges";

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
create table if not exists schema_migrations (
  version integer primary key,
  applied_at integer not null
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
  instance.exec("begin");
  try {
  const columns = new Set((instance.prepare("pragma table_info(accounts)").all() as { name: string }[]).map((c) => c.name));
  if (!columns.has("api_token_hash")) instance.exec("alter table accounts add column api_token_hash text");
  if (!columns.has("api_token_created_at")) instance.exec("alter table accounts add column api_token_created_at integer");
  if (!columns.has("digest")) instance.exec("alter table accounts add column digest integer not null default 1");
  if (!columns.has("lang")) instance.exec("alter table accounts add column lang text");
  const siteColumns = new Set((instance.prepare("pragma table_info(sites)").all() as { name: string }[]).map((c) => c.name));
  if (!siteColumns.has("log_since")) instance.exec("alter table sites add column log_since integer");
  if (!siteColumns.has("log_last_t")) instance.exec("alter table sites add column log_last_t integer");
  const current = instance.prepare("select max(version) as version from schema_migrations").get() as { version: number | null };
  if ((current.version ?? 0) < 2) {
    const eventColumns = [
      "event_id text", "measurement_version integer not null default 1", "transport text",
      "occurred_at integer", "received_at integer", "actor_claim text", "identity_status text",
      "identity_evidence text", "referral_source text", "technical_outcome text",
      "business_outcome text", "task_id text", "invocation_id text", "parent_id text",
      "release_id text", "tool_version text", "schema_version text",
    ];
    for (const column of eventColumns) instance.exec(`alter table events add column ${column}`);
    instance.exec(`create table event_receipts (
      domain text not null,
      transport text not null,
      event_id text not null,
      received_at integer not null,
      primary key (domain, transport, event_id)
    )`);
    instance.exec("create index event_receipts_age on event_receipts(received_at)");
    instance.prepare("insert into schema_migrations (version, applied_at) values (2, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 3) {
    instance.exec(`create table ingest_health (
      domain text not null,
      day text not null,
      outcome text not null,
      count integer not null default 0,
      last_at integer not null,
      primary key (domain, day, outcome)
    )`);
    instance.prepare("insert into schema_migrations (version, applied_at) values (3, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 4) {
    instance.exec("alter table tools add column active integer not null default 1");
    instance.exec("alter table tools add column capture_mode text not null default 'legacy_unknown'");
    instance.prepare("insert into schema_migrations (version, applied_at) values (4, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 5) {
    instance.exec(`create table verification_audit (
      domain text not null,
      day text not null,
      transport text not null,
      agent text not null,
      status text not null,
      method text not null,
      source_key text not null,
      source_version text not null,
      count integer not null default 0,
      last_checked_at integer not null,
      primary key (domain, day, transport, agent, status, method, source_key, source_version)
    )`);
    instance.prepare("insert into schema_migrations (version, applied_at) values (5, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 6) {
    instance.exec(`create table log_attempts (
      domain text not null, day text not null, agent text not null, path text not null,
      identity_status text not null, method text not null, status integer not null,
      result text not null, resource text not null, resource_basis text not null,
      content_type text, duration_ms integer, count integer not null default 0,
      primary key (domain, day, agent, path, identity_status, method, status, result, resource, resource_basis)
    )`);
    instance.exec("create index log_attempts_domain_day on log_attempts(domain, day)");
    instance.prepare("insert into schema_migrations (version, applied_at) values (6, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 7) {
    instance.exec(`create table log_records (
      domain text not null, source_id text not null, generation text not null,
      record_id text not null, content_hash text not null, imported_at integer not null,
      primary key (domain, source_id, generation, record_id)
    )`);
    instance.exec(`create table log_sources (
      domain text not null, source_id text not null, generation text not null,
      records integer not null default 0, last_import_at integer,
      last_log_at integer, next_offset integer, status text not null default 'active',
      primary key (domain, source_id, generation)
    )`);
    instance.prepare("insert into schema_migrations (version, applied_at) values (7, ?)").run(Date.now());
  }
  if ((current.version ?? 0) < 8) {
    instance.exec(`create table tool_session_receipts (
      domain text not null, day text not null, session text not null,
      primary key (domain, day, session)
    )`);
    const receipt = instance.prepare("insert or ignore into tool_session_receipts (domain, day, session) values (?, ?, ?)");
    const bump = instance.prepare(`insert into daily (domain, day, kind, name, count)
      values (?, ?, 'tool_session_estimate', 'all', 1)
      on conflict(domain, day, kind, name) do update set count = count + 1`);
    const batch = instance.prepare("select id, domain, t, session from events where kind = 'tool_call' and simulated = 0 and session is not null and id > ? order by id limit 1000");
    let lastId = 0;
    for (;;) {
      const rows = batch.all(lastId) as { id: number; domain: string; t: number; session: string }[];
      if (!rows.length) break;
      for (const row of rows) {
        const day = dayKey(row.t);
        if (Number(receipt.run(row.domain, day, row.session).changes)) bump.run(row.domain, day);
      }
      lastId = rows[rows.length - 1].id;
    }
    instance.prepare("insert into schema_migrations (version, applied_at) values (8, ?)").run(Date.now());
  }
  instance.exec("commit");
  } catch (err) {
    instance.exec("rollback");
    throw err;
  }
}

/** Test seam: close and forget the handle so the next call opens fresh. */
export function closeDb(): void {
  if (handle) handle.db.close();
  handle = null;
}

export const dayKey = (at: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(at));
export const monthKey = (at: number) => dayKey(at).slice(0, 7);

export type IngestOutcome = "accepted_batch" | "rate_limited" | "quota_reached" | "write_failed" | "invalid_body" | "invalid_batch" | "unknown_site" | "origin_mismatch";
export const UNATTRIBUTED_INGEST = "__unattributed__";

export function noteIngestOutcome(domain: string, outcome: IngestOutcome, now = Date.now()): void {
  db().prepare(`insert into ingest_health (domain, day, outcome, count, last_at) values (?, ?, ?, 1, ?)
    on conflict(domain, day, outcome) do update set count = count + 1, last_at = excluded.last_at`)
    .run(domain.toLowerCase(), dayKey(now), outcome, now);
}

export function ingestHealth(domain: string, days = 30, now = Date.now()): { outcome: IngestOutcome; count: number; lastAt: number }[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare("select outcome, sum(count) as count, max(last_at) as lastAt from ingest_health where domain = ? and day >= ? group by outcome")
    .all(domain.toLowerCase(), cutoff) as { outcome: IngestOutcome; count: number; lastAt: number }[];
}

export function ingestHealthDaily(domain: string, days = 30, now = Date.now()): { day: string; outcome: IngestOutcome; count: number }[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare("select day, outcome, count from ingest_health where domain = ? and day >= ? order by day, outcome")
    .all(domain.toLowerCase(), cutoff) as { day: string; outcome: IngestOutcome; count: number }[];
}

type VerificationRecord = { status: string; method?: string; sourceKey?: string | null; sourceVersion?: string | null; checkedAt?: number | null };

function bumpVerification(d: DatabaseSync, domain: string, day: string, transport: Transport, agent: string, evidence: VerificationRecord, now: number): void {
  d.prepare(`insert into verification_audit (domain, day, transport, agent, status, method, source_key, source_version, count, last_checked_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    on conflict(domain, day, transport, agent, status, method, source_key, source_version)
    do update set count = count + 1, last_checked_at = max(last_checked_at, excluded.last_checked_at)`)
    .run(domain.toLowerCase(), day, transport, agent, evidence.status, evidence.method ?? "none", evidence.sourceKey ?? "", evidence.sourceVersion ?? "", evidence.checkedAt ?? now);
}

export type VerificationAuditRow = { day: string; transport: string; agent: string; status: string; method: string; sourceKey: string; sourceVersion: string; count: number; lastCheckedAt: number };

export function verificationAudit(domain: string, days = 30, now = Date.now()): VerificationAuditRow[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare(`select day, transport, agent, status, method, source_key as sourceKey, source_version as sourceVersion,
    count, last_checked_at as lastCheckedAt from verification_audit where domain = ? and day >= ? order by day desc, agent, status`)
    .all(domain.toLowerCase(), cutoff) as VerificationAuditRow[];
}

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
  d.prepare("delete from event_receipts where domain = ?").run(key);
  d.prepare("delete from daily where domain = ?").run(key);
  d.prepare("delete from ingest_health where domain = ?").run(key);
  d.prepare("delete from verification_audit where domain = ?").run(key);
  d.prepare("delete from tool_session_receipts where domain = ?").run(key);
  d.prepare("delete from log_attempts where domain = ?").run(key);
  d.prepare("delete from log_records where domain = ?").run(key);
  d.prepare("delete from log_sources where domain = ?").run(key);
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
  /** Legacy senders omit these fields; only the server may assign evidence. */
  eventId?: string | null;
  occurredAt?: number | null;
  transport?: Transport;
  actorClaim?: string | null;
  identityStatus?: IdentityStatus;
  identityEvidence?: IdentityEvidence[];
  referralSource?: string | null;
  technicalOutcome?: TechnicalOutcome;
  businessOutcome?: BusinessOutcome;
  taskId?: string | null;
  invocationId?: string | null;
  parentId?: string | null;
  releaseId?: string | null;
  toolVersion?: string | null;
  schemaVersion?: string | null;
  descriptionHash?: string | null;
  schemaHash?: string | null;
};

let prunedFor = "";

/**
 * Write a batch: raw rows, daily counters, the tool registry and the monthly
 * usage, in one transaction. Plain `view` rows are counted but not kept raw
 * and not charged to the plan: a human page view is not what this product is
 * about and would be most of the table.
 */
export function recordEvents(domain: string, owner: string, events: StoredEvent[], now = Date.now(), options: { fetchesFromLog?: boolean; quota?: number } = {}): { accepted: number; duplicates: number; quotaDropped: number } {
  if (events.length === 0) return { accepted: 0, duplicates: 0, quotaDropped: 0 };
  const d = db();
  const day = dayKey(now);
  if (prunedFor !== day) {
    prunedFor = day;
    pruneRaw(now);
  }

  const eventColumns = [
    "domain", "t", "kind", "name", "path", "source", "session", "ms", "ok", "err", "keys", "declarative", "simulated",
    "event_id", "measurement_version", "transport", "occurred_at", "received_at", "actor_claim", "identity_status",
    "identity_evidence", "referral_source", "technical_outcome", "business_outcome", "task_id", "invocation_id",
    "parent_id", "release_id", "tool_version", "schema_version",
  ];
  const insertEvent = d.prepare(`insert into events (${eventColumns.join(", ")}) values (${eventColumns.map(() => "?").join(", ")})`);
  const insertReceipt = d.prepare("insert or ignore into event_receipts (domain, transport, event_id, received_at) values (?, ?, ?, ?)");
  const existingReceipt = d.prepare("select 1 from event_receipts where domain = ? and transport = ? and event_id = ?");
  const bump = d.prepare(
    "insert into daily (domain, day, kind, name, count, errors, ms_total) values (?, ?, ?, ?, 1, ?, ?) on conflict(domain, day, kind, name) do update set count = count + 1, errors = errors + excluded.errors, ms_total = ms_total + excluded.ms_total",
  );
  const tool = d.prepare(
    "insert into tools (domain, name, description_hash, schema_hash, first_seen, last_seen, declarative, active, capture_mode) values (?, ?, ?, ?, ?, ?, ?, 1, 'wrapped') on conflict(domain, name) do update set description_hash = coalesce(excluded.description_hash, description_hash), schema_hash = coalesce(excluded.schema_hash, schema_hash), last_seen = excluded.last_seen, declarative = max(declarative, excluded.declarative), active = 1, capture_mode = 'wrapped'",
  );
  const discoveredTool = d.prepare("insert into tools (domain, name, schema_hash, first_seen, last_seen, active, capture_mode) values (?, ?, ?, ?, ?, 1, 'discovered') on conflict(domain, name) do update set schema_hash = coalesce(excluded.schema_hash, schema_hash), last_seen = excluded.last_seen, active = 1, capture_mode = case when tools.capture_mode = 'wrapped' then 'wrapped' else 'discovered' end");
  const removedTool = d.prepare("update tools set active = 0, last_seen = ? where domain = ? and name = ?");
  const sessionReceipt = d.prepare("insert or ignore into tool_session_receipts (domain, day, session) values (?, ?, ?)");

  d.exec("begin");
  try {
    let acceptedUsage = 0;
    let accepted = 0;
    let duplicates = 0;
    let quotaDropped = 0;
    // The read and usage update share the write transaction, so concurrent
    // batches cannot both spend the same remaining slots.
    const used = usageThisMonth(owner, now);
    for (const e of events) {
      const path = redactPath(e.path);
      const name = safeEventName(e.name);
      const errorClass = safeErrorClass(e.err);
      const transport = e.transport ?? "browser";
      if (e.eventId && existingReceipt.get(domain, transport, e.eventId)) { duplicates++; continue; }
      const chargeable = browserUsage(e.kind, e.simulated, e.source, e.identityStatus, Boolean(options.fetchesFromLog));
      const overQuota = chargeable && options.quota !== undefined && used + acceptedUsage >= options.quota;
      if (overQuota) {
        quotaDropped++;
        // Keep the free view and its verification audit, even when its
        // confirmed fetch counter is outside the paid event allowance.
        if (e.kind !== "view") continue;
      }
      if (e.eventId && Number(insertReceipt.run(domain, transport, e.eventId, now).changes) === 0) { duplicates++; continue; }
      accepted++;
      const keep = e.kind !== "view" || e.source !== null || e.actorClaim != null;
      const recordedSource = overQuota && e.kind === "view" ? null : e.source;
      if (keep) {
        const occurredAt = e.occurredAt && Math.abs(e.occurredAt - now) <= 86_400_000 ? e.occurredAt : now;
        insertEvent.run(
          domain, now, e.kind, name, path, recordedSource, e.session, e.ms, e.ok === null ? null : e.ok ? 1 : 0,
          errorClass, null, e.declarative ? 1 : 0, e.simulated ? 1 : 0,
          e.eventId ?? null, MEASUREMENT_VERSION, transport, occurredAt, now, e.actorClaim ?? null,
          e.identityStatus ?? "unknown", JSON.stringify(e.identityEvidence ?? []), e.referralSource ?? null,
          e.technicalOutcome ?? (e.ok === true ? "completed" : e.ok === false ? "failed" : "unknown"),
          e.businessOutcome ?? "unconfirmed", e.taskId ?? null, e.invocationId ?? null, e.parentId ?? null,
          e.releaseId ?? null, e.toolVersion ?? null, e.schemaVersion ?? null,
        );
      }
      const errors = e.ok === false ? 1 : 0;
      const msTotal = e.ms ?? 0;
      if (e.kind === "view") {
        bump.run(domain, day, "view", "all", 0, 0);
        const claim = e.actorClaim ?? (e.source?.startsWith("agent:") ? e.source.slice(6) : null);
        if (claim) {
          const range = e.identityEvidence?.find((item) => item.method === "ip_range");
          bumpVerification(d, domain, day, transport, claim, {
            status: e.identityStatus ?? "unknown", method: range?.method ?? "none", sourceKey: range?.sourceKey,
            sourceVersion: range?.sourceVersion, checkedAt: range?.checkedAt,
          }, now);
        }
        if (claim && e.identityStatus !== "verified") {
          const status = e.identityStatus === "mismatch" ? "unverified" : `claim_${e.identityStatus ?? "unknown"}`;
          bump.run(domain, day, status, `agent:${claim}`, 0, 0);
        }
        if (e.source) {
          const isFetch = e.source.startsWith("agent:");
          // When the server log feeds this site, it already holds every agent
          // fetch, including the ones that ran the snippet; counting those
          // here too would double them. Referrals are people, not in the log's
          // agent lines, and still count.
          if (!(isFetch && (options.fetchesFromLog || e.identityStatus !== "verified" || overQuota))) {
            bump.run(domain, day, isFetch ? "ai_fetch_verified" : "ai_referral", e.source, 0, 0);
            bump.run(domain, day, "page", path, 0, 0);
          }
        }
      } else if (e.kind === "tool_call") {
        bump.run(domain, day, e.simulated ? "tool_call_sim" : "tool_call", name ?? "?", errors, msTotal);
        if (!e.simulated && e.session && Number(sessionReceipt.run(domain, day, e.session).changes)) bump.run(domain, day, "tool_session_estimate", "all", 0, 0);
        if (!e.simulated) {
          const state = e.technicalOutcome ?? (e.ok === true ? "completed" : e.ok === false ? "failed" : "unknown");
          bump.run(domain, day, `tool_${state}`, name ?? "?", 0, 0);
        }
        if (!e.simulated) bump.run(domain, day, "tool_page", path, 0, 0);
        if (errorClass && !e.simulated) bump.run(domain, day, "tool_error", `${name ?? "?"} ${errorClass}`, 0, 0);
      } else if (e.kind === "tool_registered") {
        bump.run(domain, day, "tool_registered", name ?? "?", 0, 0);
      } else if (e.kind === "tool_discovered") {
        bump.run(domain, day, "tool_discovered", name ?? "?", 0, 0);
        discoveredTool.run(domain, name ?? "?", e.schemaHash ?? null, now, now);
      } else if (e.kind === "tool_removed") {
        bump.run(domain, day, "tool_removed", name ?? "?", 0, 0);
        removedTool.run(now, domain, name ?? "?");
      } else if (e.kind === "tool_activation_signal" || e.kind === "tool_cancel_signal") {
        bump.run(domain, day, e.kind, name ?? "?", 0, 0);
      } else if (e.kind === "agent_conversion") {
        bump.run(domain, day, e.simulated ? "conversion_sim" : "conversion", name ?? "?", 0, 0);
      } else if (e.kind === "goal_attempt") {
        bump.run(domain, day, e.simulated ? "goal_attempt_sim" : "goal_attempt", name ?? "?", 0, 0);
      } else if (e.kind === "form_attempt") {
        bump.run(domain, day, "form_attempt", name ?? "?", 0, 0);
      }
      if (e.kind === "tool_registered" && name) {
        tool.run(domain, name, e.descriptionHash ?? null, e.schemaHash ?? null, now, now, e.declarative ? 1 : 0);
      }
      if (chargeable && !overQuota) acceptedUsage++;
    }
    // Plain human views are free; only the rows that are kept count against the plan.
    addUsage(owner, acceptedUsage, now);
    d.exec("commit");
    return { accepted, duplicates, quotaDropped };
  } catch (err) {
    d.exec("rollback");
    throw err;
  }
}

export function registerTool(domain: string, name: string, descriptionHash: string | null, schemaHash: string | null, now = Date.now()): void {
  db()
    .prepare(
      "insert into tools (domain, name, description_hash, schema_hash, first_seen, last_seen, declarative, active, capture_mode) values (?, ?, ?, ?, ?, ?, 0, 1, 'wrapped') on conflict(domain, name) do update set description_hash = coalesce(excluded.description_hash, description_hash), schema_hash = coalesce(excluded.schema_hash, schema_hash), last_seen = excluded.last_seen, active = 1, capture_mode = 'wrapped'",
    )
    .run(domain, name, descriptionHash, schemaHash, now, now);
}

export function pruneRaw(now = Date.now()): number {
  const cutoff = now - RAW_RETENTION_DAYS * 86_400_000;
  const d = db();
  d.prepare("delete from event_receipts where received_at < ?").run(cutoff);
  d.prepare("delete from tool_session_receipts where day < ?").run(dayKey(cutoff));
  const result = d.prepare("delete from events where t < ?").run(cutoff);
  return Number(result.changes);
}

/* --------------------------------------------------------------- reading */

/* -------------------------------------------------------------- log import */

/** Daily fetch counters from the server log: the same rows the snippet would write for an agent that ran it. */
export function recordLogFetches(domain: string, fetches: { day: string; agent: string; path: string; evidence?: { status: string; method: string; source: string | null; sourceVersion: string | null; checkedAt: number } }[], unverified: { day: string; agent: string; evidence?: { status: string; method: string; source: string | null; sourceVersion: string | null; checkedAt: number } }[] = [], owner: string | null = null, now = Date.now(), attempts: LogAttempt[] = [], quota?: number): { quotaDropped: number } {
  if (fetches.length === 0 && unverified.length === 0 && attempts.length === 0) return { quotaDropped: 0 };
  const d = db();
  const bump = d.prepare(
    "insert into daily (domain, day, kind, name, count, errors, ms_total) values (?, ?, ?, ?, 1, 0, 0) on conflict(domain, day, kind, name) do update set count = count + 1",
  );
  const logAttempt = d.prepare(`insert into log_attempts
    (domain, day, agent, path, identity_status, method, status, result, resource, resource_basis, content_type, duration_ms, count)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    on conflict(domain, day, agent, path, identity_status, method, status, result, resource, resource_basis)
    do update set count = count + 1`);
  d.exec("savepoint log_fetches_write");
  try {
    for (const a of attempts) {
      logAttempt.run(domain.toLowerCase(), a.day, a.agent, redactPath(a.path), a.evidence.status, a.method, a.status, a.result, a.resource, a.resourceBasis, a.contentType, a.durationMs);
    }
    let acceptedFetches = 0;
    let quotaDropped = 0;
    const used = owner ? usageThisMonth(owner, now) : 0;
    for (const f of fetches) {
      const evidence = f.evidence;
      if (!evidence || !logUsage(evidence.status)) {
        bump.run(domain.toLowerCase(), f.day, `claim_${evidence?.status ?? "missing"}`, `agent:${f.agent}`);
        continue;
      }
      if (owner && quota !== undefined && used + acceptedFetches >= quota) {
        quotaDropped++;
        bumpVerification(d, domain, f.day, "log", f.agent, { status: "verified", method: evidence.method, sourceKey: evidence.source, sourceVersion: evidence.sourceVersion, checkedAt: evidence.checkedAt }, now);
        continue;
      }
      bump.run(domain.toLowerCase(), f.day, "ai_fetch_verified", `agent:${f.agent}`);
      bump.run(domain.toLowerCase(), f.day, "page", redactPath(f.path));
      acceptedFetches++;
      bumpVerification(d, domain, f.day, "log", f.agent, { status: "verified", method: evidence.method, sourceKey: evidence.source, sourceVersion: evidence.sourceVersion, checkedAt: evidence.checkedAt }, now);
    }
    // Preserve the old mismatch counter's meaning; other non-evidence states
    // have their own dimensions and never enter confirmed fetch counts.
    for (const u of unverified) {
      const status = u.evidence?.status ?? "mismatch";
      bump.run(domain.toLowerCase(), u.day, status === "mismatch" ? "unverified" : `claim_${status}`, `agent:${u.agent}`);
      bumpVerification(d, domain, u.day, "log", u.agent, { status, method: u.evidence?.method, sourceKey: u.evidence?.source, sourceVersion: u.evidence?.sourceVersion, checkedAt: u.evidence?.checkedAt }, now);
    }
    // A fetch from the log is an agent event like any other for the quota.
    if (owner && acceptedFetches) addUsage(owner, acceptedFetches, now);
    if (quotaDropped) noteIngestOutcome(domain, "quota_reached", now);
    d.exec("release log_fetches_write");
    return { quotaDropped };
  } catch (err) {
    d.exec("rollback to log_fetches_write");
    d.exec("release log_fetches_write");
    throw err;
  }
}

export type SourceRecord = { id: string; line: string };
export type LogSourceState = { sourceId: string; generation: string; records: number; lastImportAt: number | null; lastLogAt: number | null; nextOffset: number | null; status: string };

export function logSourceStates(domain: string): LogSourceState[] {
  return db().prepare(`select source_id as sourceId, generation, records, last_import_at as lastImportAt,
    last_log_at as lastLogAt, next_offset as nextOffset, status from log_sources where domain = ? order by last_import_at desc`)
    .all(domain.toLowerCase()) as LogSourceState[];
}

export function hasFreshLogSource(domain: string, now = Date.now()): boolean {
  const row = db().prepare("select max(last_import_at) as lastImportAt from log_sources where domain = ? and records > 0 and status = 'active'")
    .get(domain.toLowerCase()) as { lastImportAt: number | null };
  return row.lastImportAt !== null && row.lastImportAt <= now + 300_000 && now - row.lastImportAt <= 36 * 3_600_000;
}

/** Accept identities and measurements in one write transaction. Time never determines duplicate status. */
export function ingestLogSourceBatch(domain: string, owner: string, sourceId: string, generation: string, records: SourceRecord[], ranges: Ranges | null, now = Date.now(), nextOffset: number | null = null): { result: ImportResult; duplicates: number } {
  if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(sourceId) || !/^[a-zA-Z0-9._:-]{1,128}$/.test(generation)) throw new Error("Invalid log source identity");
  if (records.some((r) => !/^[a-zA-Z0-9._:-]{1,128}$/.test(r.id))) throw new Error("Invalid log record identity");
  const d = db();
  const lookup = d.prepare("select content_hash as contentHash from log_records where domain = ? and source_id = ? and generation = ? and record_id = ?");
  const insert = d.prepare("insert into log_records (domain, source_id, generation, record_id, content_hash, imported_at) values (?, ?, ?, ?, ?, ?)");
  d.exec("begin immediate");
  try {
    // One-time cutover for an append-only legacy upload: record positional
    // receipts for the whole snapshot, but do not recount pre-migration lines.
    // Subsequent uploads use record identity only, including late old times.
    const cutover = sourceId === "legacy-upload" && generation === "append-only" &&
      !d.prepare("select 1 from log_sources where domain = ? and source_id = ? and generation = ?")
        .get(domain.toLowerCase(), sourceId, generation)
      ? (d.prepare("select log_last_t as lastT from sites where domain = ?").get(domain.toLowerCase()) as { lastT: number | null } | undefined)?.lastT ?? null
      : null;
    const accepted: string[] = [];
    let duplicates = 0;
    for (const r of records) {
      const digest = createHash("sha256").update(r.line).digest("hex");
      const existing = lookup.get(domain.toLowerCase(), sourceId, generation, r.id) as { contentHash: string } | undefined;
      if (existing) {
        if (existing.contentHash !== digest) throw new Error("Log record identity reused with different content; use a new generation for rotated or replaced files");
        duplicates++;
        continue;
      }
      insert.run(domain.toLowerCase(), sourceId, generation, r.id, digest, now);
      accepted.push(r.line);
    }
    const result = importLines(accepted, { ranges, since: cutover });
    const account = getAccount(owner);
    recordLogFetches(domain, result.fetches, result.unverified, owner, now, result.attempts, planFor(account?.plan).eventsPerMonth);
    recordBursts(domain, result.bursts);
    d.prepare(`insert into log_sources (domain, source_id, generation, records, last_import_at, last_log_at, next_offset, status)
      values (?, ?, ?, ?, ?, ?, ?, 'active') on conflict(domain, source_id, generation)
      do update set records = records + excluded.records,
      last_import_at = case when excluded.records > 0 then excluded.last_import_at else log_sources.last_import_at end,
      last_log_at = max(coalesce(last_log_at, 0), coalesce(excluded.last_log_at, 0)),
      next_offset = coalesce(excluded.next_offset, next_offset), status = 'active'`)
      .run(domain.toLowerCase(), sourceId, generation, accepted.length, now, result.lastT, nextOffset);
    if (result.fetches.length) setLogSource(domain, now, result.lastT);
    d.exec("commit");
    return { result, duplicates };
  } catch (err) {
    d.exec("rollback");
    throw err;
  }
}

export type LogAttemptSummary = { result: string; resource: string; method: string; identityStatus: string; status: number; count: number };
export type LogAttemptPath = LogAttemptSummary & { path: string };

export function logAttemptSummary(domain: string, days = 30, now = Date.now()): LogAttemptSummary[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare(`select result, resource, method, identity_status as identityStatus, status, sum(count) as count
    from log_attempts where domain = ? and day >= ? group by result, resource, method, identity_status, status
    order by count desc`).all(domain.toLowerCase(), cutoff) as LogAttemptSummary[];
}

export function logAttemptPaths(domain: string, days = 30, now = Date.now(), limit = 100): LogAttemptPath[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare(`select path, result, resource, method, identity_status as identityStatus, status, sum(count) as count
    from log_attempts where domain = ? and day >= ? group by path, result, resource, method, identity_status, status
    order by count desc limit ?`).all(domain.toLowerCase(), cutoff, limit) as LogAttemptPath[];
}

export type LogAttemptExportRow = LogAttemptPath & { day: string; agent: string };
export function logAttemptExportRows(domain: string, days = 30, now = Date.now()): LogAttemptExportRow[] {
  const cutoff = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare(`select day, agent, path, result, resource, method, identity_status as identityStatus, status, count
    from log_attempts where domain = ? and day >= ? order by day, agent, path`)
    .all(domain.toLowerCase(), cutoff) as LogAttemptExportRow[];
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
  d.exec("savepoint log_bursts_write");
  try {
    for (const b of bursts) {
      const paths = b.paths.map((path) => redactPath(path));
      bump.run(domain.toLowerCase(), dayKey(b.start), `agent:${b.agent}`, paths.length);
      insert.run(domain.toLowerCase(), b.start, b.agent, paths[0] ?? "/", `agent:${b.agent}`, b.ms, JSON.stringify(paths));
    }
    d.exec("release log_bursts_write");
  } catch (err) {
    d.exec("rollback to log_bursts_write");
    d.exec("release log_bursts_write");
    throw err;
  }
}

export type BurstRow = { t: number; agent: string; ms: number; paths: string[] };

export function recentBursts(domain: string, limit = 12): BurstRow[] {
  const rows = db().prepare("select t, name, ms, keys from events where domain = ? and kind = 'fetch_burst' order by t desc limit ?").all(domain.toLowerCase(), limit) as { t: number; name: string; ms: number; keys: string | null }[];
  return rows.map((r) => ({ t: r.t, agent: r.name, ms: r.ms, paths: r.keys ? (JSON.parse(r.keys) as string[]).map((path) => redactPath(path)) : [] }));
}

export type DailyRow = { day: string; kind: string; name: string; count: number; errors: number; ms_total: number };

export function dailyRows(domain: string, days: number, now = Date.now()): DailyRow[] {
  const from = dayKey(now - (days - 1) * 86_400_000);
  return db().prepare("select day, kind, name, count, errors, ms_total from daily where domain = ? and day >= ? order by day").all(domain.toLowerCase(), from) as DailyRow[];
}

export type ToolRow = { name: string; description_hash: string | null; schema_hash: string | null; first_seen: number; last_seen: number; declarative: number; active: number; capture_mode: string };

export function toolRows(domain: string): ToolRow[] {
  return db().prepare("select name, description_hash, schema_hash, first_seen, last_seen, declarative, active, capture_mode from tools where domain = ? order by name").all(domain.toLowerCase()) as ToolRow[];
}

export type RecentRow = { t: number; kind: string; name: string | null; path: string; source: string | null; ms: number | null; ok: number | null; err: string | null; keys: string | null; declarative: number; simulated: number };

export function recentEvents(domain: string, limit = 50): RecentRow[] {
  return db().prepare("select t, kind, name, path, source, ms, ok, err, keys, declarative, simulated from events where domain = ? order by t desc limit ?").all(domain.toLowerCase(), limit) as RecentRow[];
}

/** Daily estimates persist after raw event and temporary receipt expiry. */
export function sessionsPerDay(domain: string, days: number, now = Date.now()): { day: string; sessions: number }[] {
  const from = dayKey(now - (days - 1) * 86_400_000);
  const rows = db().prepare("select day, count as sessions from daily where domain = ? and day >= ? and kind = 'tool_session_estimate' and name = 'all' order by day")
    .all(domain.toLowerCase(), from) as { day: string; sessions: number }[];
  return rows.map((row) => ({ day: row.day, sessions: row.sessions }));
}
