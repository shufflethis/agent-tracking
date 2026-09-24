import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db, getAccount, getSite, monthKey, reconcileOutcomeLinks, usageThisMonth } from "./db";
import { eventId } from "./measurement";
import { planFor } from "./plans";

export type WritePurpose = "outcome" | "tool_telemetry";
const purposes = new Set<WritePurpose>(["outcome", "tool_telemetry"]);
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const string = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value : null;
const optionalId = (value: unknown) => value === undefined || value === null ? null : eventId(value);

export function isWritePurpose(value: unknown): value is WritePurpose { return purposes.has(value as WritePurpose); }

/** A token is only returned on mint. Rotation immediately invalidates its predecessor. */
export function mintSiteWriteToken(domain: string, owner: string, purpose: WritePurpose, now = Date.now()): string | null {
  if (getSite(domain)?.owner !== owner.toLowerCase() || !isWritePurpose(purpose)) return null;
  const token = `atw_${randomBytes(32).toString("base64url")}`;
  db().prepare(`insert into site_write_tokens (domain, purpose, token_hash, created_at, revoked_at)
    values (?, ?, ?, ?, null) on conflict(domain, purpose) do update set
    token_hash=excluded.token_hash, created_at=excluded.created_at, revoked_at=null`)
    .run(domain.toLowerCase(), purpose, tokenHash(token), now);
  return token;
}

export function revokeSiteWriteToken(domain: string, owner: string, purpose: WritePurpose): boolean {
  if (getSite(domain)?.owner !== owner.toLowerCase() || !isWritePurpose(purpose)) return false;
  db().prepare("update site_write_tokens set revoked_at = ? where domain = ? and purpose = ? and revoked_at is null")
    .run(Date.now(), domain.toLowerCase(), purpose);
  return true;
}

export function writeTokenConfigured(domain: string, purpose: WritePurpose): boolean {
  return Boolean(db().prepare("select 1 from site_write_tokens where domain = ? and purpose = ? and revoked_at is null")
    .get(domain.toLowerCase(), purpose));
}

export function validSiteWriteToken(domain: string, purpose: WritePurpose, token: string | null): boolean {
  if (!token?.startsWith("atw_") || token.length > 100) return false;
  const row = db().prepare("select token_hash as hash from site_write_tokens where domain = ? and purpose = ? and revoked_at is null")
    .get(domain.toLowerCase(), purpose) as { hash: string } | undefined;
  return Boolean(row && timingSafeEqual(Buffer.from(row.hash, "hex"), Buffer.from(tokenHash(token), "hex")));
}

export type ServerOutcome = { receiptId: string; kind: "inquiry_created" | "booking_created"; status: "confirmed" | "failed"; occurredAt: number; taskId?: string | null; invocationId?: string | null };
export type ServerToolCall = { invocationId: string; taskId?: string | null; occurredAt: number; toolName: string; technicalOutcome: "attempted" | "completed" | "failed" | "cancelled" | "timed_out" | "unknown"; actorKind: "agent" | "human" | "unknown" };

export function parseServerOutcome(raw: unknown, now = Date.now()): ServerOutcome | null {
  if (!object(raw) || Object.keys(raw).some((key) => !["receiptId", "kind", "status", "occurredAt", "taskId", "invocationId"].includes(key))) return null;
  if (!eventId(raw.receiptId) || !["inquiry_created", "booking_created"].includes(String(raw.kind)) || !["confirmed", "failed"].includes(String(raw.status))) return null;
  if (typeof raw.occurredAt !== "number" || !Number.isInteger(raw.occurredAt) || raw.occurredAt < now - 365 * 86_400_000 || raw.occurredAt > now + 5 * 60_000) return null;
  if ((raw.taskId != null && !eventId(raw.taskId)) || (raw.invocationId != null && !eventId(raw.invocationId))) return null;
  return { receiptId: raw.receiptId as string, kind: raw.kind as ServerOutcome["kind"], status: raw.status as ServerOutcome["status"], occurredAt: raw.occurredAt, taskId: optionalId(raw.taskId), invocationId: optionalId(raw.invocationId) };
}

export function parseServerToolCall(raw: unknown, now = Date.now()): ServerToolCall | null {
  if (!object(raw) || Object.keys(raw).some((key) => !["invocationId", "taskId", "occurredAt", "toolName", "technicalOutcome", "actorKind"].includes(key))) return null;
  if (!eventId(raw.invocationId) || (raw.taskId != null && !eventId(raw.taskId))) return null;
  if (typeof raw.occurredAt !== "number" || !Number.isInteger(raw.occurredAt) || raw.occurredAt < now - 365 * 86_400_000 || raw.occurredAt > now + 5 * 60_000) return null;
  if (!string(raw.toolName, 80) || !/^[a-zA-Z0-9_.:-]{1,80}$/.test(raw.toolName as string)) return null;
  if (!["attempted", "completed", "failed", "cancelled", "timed_out", "unknown"].includes(String(raw.technicalOutcome)) || !["agent", "human", "unknown"].includes(String(raw.actorKind))) return null;
  return { invocationId: raw.invocationId as string, taskId: optionalId(raw.taskId), occurredAt: raw.occurredAt, toolName: raw.toolName as string, technicalOutcome: raw.technicalOutcome as ServerToolCall["technicalOutcome"], actorKind: raw.actorKind as ServerToolCall["actorKind"] };
}

export type IngestResult = "created" | "duplicate" | "conflict";

export function recordServerOutcome(domain: string, input: ServerOutcome, now = Date.now()): IngestResult {
  const d = db(), key = domain.toLowerCase(), digest = hash(input);
  d.exec("begin immediate");
  try {
    const old = d.prepare("select payload_hash as hash from server_outcomes where domain = ? and receipt_id = ?").get(key, input.receiptId) as { hash: string } | undefined;
    if (old) { d.exec("commit"); return old.hash === digest ? "duplicate" : "conflict"; }
    d.prepare(`insert into server_outcomes (domain, receipt_id, received_at, occurred_at, kind, status, task_id, invocation_id, payload_hash)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(key, input.receiptId, now, input.occurredAt, input.kind, input.status, input.taskId ?? null, input.invocationId ?? null, digest);
    reconcileOutcomeLinks(key, input.taskId ?? null, input.invocationId ?? null);
    d.exec("commit");
    return "created";
  } catch (error) { d.exec("rollback"); throw error; }
}

export function recordServerToolCall(domain: string, input: ServerToolCall, now = Date.now()): IngestResult {
  const d = db(), key = domain.toLowerCase(), digest = hash(input);
  d.exec("begin immediate");
  try {
    const old = d.prepare("select payload_hash as hash from server_tool_calls where domain = ? and invocation_id = ?").get(key, input.invocationId) as { hash: string } | undefined;
    if (old) { d.exec("commit"); return old.hash === digest ? "duplicate" : "conflict"; }
    const owner = getSite(key)?.owner;
    const account = owner ? getAccount(owner) : null;
    if (!owner || !account) throw new Error("Site owner is missing");
    const counted = usageThisMonth(owner, now) < planFor(account.plan).eventsPerMonth;
    d.prepare(`insert into server_tool_calls (domain, invocation_id, task_id, received_at, occurred_at, tool_name, technical_outcome, actor_kind, actor_evidence, payload_hash, counted)
      values (?, ?, ?, ?, ?, ?, ?, ?, 'site_server_reported', ?, ?)`)
      .run(key, input.invocationId, input.taskId ?? null, now, input.occurredAt, input.toolName, input.technicalOutcome, input.actorKind, digest, counted ? 1 : 0);
    if (counted) {
      d.prepare("insert into usage (owner, month, count) values (?, ?, 1) on conflict(owner, month) do update set count=count+1").run(owner, monthKey(now));
    }
    reconcileOutcomeLinks(key, input.taskId ?? null, input.invocationId);
    d.exec("commit");
    return "created";
  } catch (error) { d.exec("rollback"); throw error; }
}

export function outcomeSummary(domain: string, days: number, now = Date.now()) {
  const from = now - days * 86_400_000;
  const row = db().prepare(`select count(*) as reports,
    sum(case when status='confirmed' then 1 else 0 end) as confirmed,
    sum(case when status='failed' then 1 else 0 end) as failed,
    sum(case when status='confirmed' and actor_evidence='site_server_reported_agent' then 1 else 0 end) as agentReported,
    sum(case when status='confirmed' and actor_evidence='unknown' then 1 else 0 end) as actorUnknown,
    sum(case when observed_event_id is not null then 1 else 0 end) as browserLinked
    from server_outcomes where domain=? and received_at>=? and received_at<=?`)
    .get(domain.toLowerCase(), from, now) as Record<string, number | null>;
  const linked = db().prepare(`select count(distinct e.id) as n from server_outcomes o join events e on e.id=o.observed_event_id and e.domain=o.domain
    where o.domain=? and o.status='confirmed' and e.kind='goal_attempt' and e.t>=? and e.t<=?`)
    .get(domain.toLowerCase(), from, now) as { n: number };
  return { reports: row.reports ?? 0, confirmed: row.confirmed ?? 0, failed: row.failed ?? 0, agentReported: row.agentReported ?? 0, actorUnknown: row.actorUnknown ?? 0, browserLinked: row.browserLinked ?? 0, linkedGoalAttempts: linked.n ?? 0 };
}

export function serverToolSummary(domain: string, days: number, now = Date.now()) {
  const row = db().prepare(`select count(*) as reports,
    sum(case when counted=1 then 1 else 0 end) as counted,
    sum(case when counted=0 then 1 else 0 end) as quotaGaps,
    sum(case when actor_kind='agent' then 1 else 0 end) as siteReportedAgent
    from server_tool_calls where domain=? and received_at>=? and received_at<=?`)
    .get(domain.toLowerCase(), now - days * 86_400_000, now) as Record<string, number | null>;
  return { reports: row.reports ?? 0, counted: row.counted ?? 0, quotaGaps: row.quotaGaps ?? 0, siteReportedAgent: row.siteReportedAgent ?? 0 };
}
