import { createHash } from "node:crypto";
import { db, monthKey } from "../tracking/db";
import { AGENT_EVENTS_PER_MONTH } from "./types";

export type Span = {
  id: string; traceId: string; parentId: string | null; service: string; version: string | null;
  operation: string; tool: string | null; model: string | null; startedAt: number; endedAt: number;
  status: number; inputTokens: number | null; outputTokens: number | null;
};
const object = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
const identifier = (v: unknown, length = 128) => typeof v === "string" && v.length <= length && /^[A-Za-z0-9_.:/@-]+$/.test(v) ? v : null;
const count = (v: unknown) => {
  const n = typeof v === "string" && /^\d{1,10}$/.test(v) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1e9 ? n : null;
};
const hash = (...parts: string[]) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
function attributes(input: unknown): Map<string, unknown> {
  const result = new Map<string, unknown>();
  if (!Array.isArray(input)) return result;
  for (const raw of input.slice(0, 256)) {
    const a = object(raw); const v = object(a.value);
    if (typeof a.key === "string") result.set(a.key, v.stringValue ?? v.intValue);
  }
  return result;
}
function millis(value: unknown): number | null {
  // OTLP JSON encodes uint64 nanoseconds as decimal strings; do not lose precision through Number first.
  if (typeof value !== "string" || !/^\d{1,20}$/.test(value)) return null;
  const ms = Number(BigInt(value) / 1_000_000n);
  return Number.isSafeInteger(ms) ? ms : null;
}

/** OTLP/HTTP JSON traces only. No span names, events, links, prompts, URLs or arbitrary attributes are retained. */
export function parseOtlp(body: unknown, owner: string, now = Date.now()): { spans: Span[]; rejected: number } | "invalid" | "too_large" {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "invalid";
  const groups = object(body).resourceSpans;
  if (groups === undefined && Object.keys(object(body)).length === 0) return { spans: [], rejected: 0 };
  if (!Array.isArray(groups) || groups.length > 100) return "invalid";
  const spans: Span[] = []; let total = 0; let rejected = 0;
  for (const group of groups) {
    const resource = attributes(object(object(group).resource).attributes);
    if (!group || typeof group !== "object" || Array.isArray(group)) return "invalid";
    const scopes = object(group).scopeSpans ?? [];
    if (!Array.isArray(scopes) || scopes.length > 100) return "invalid";
    for (const scope of scopes) {
      const scopeSpans = object(scope).spans ?? [];
      if (!Array.isArray(scopeSpans)) return "invalid";
      for (const raw of scopeSpans) {
        if (++total > 100) return "too_large";
        const s = object(raw);
        const traceId = typeof s.traceId === "string" && /^[a-fA-F0-9]{32}$/.test(s.traceId) && !/^0+$/.test(s.traceId) ? s.traceId.toLowerCase() : null;
        const spanId = typeof s.spanId === "string" && /^[a-fA-F0-9]{16}$/.test(s.spanId) && !/^0+$/.test(s.spanId) ? s.spanId.toLowerCase() : null;
        const parent = s.parentSpanId === undefined || s.parentSpanId === "" || s.parentSpanId === "0000000000000000" ? null : typeof s.parentSpanId === "string" && /^[a-fA-F0-9]{16}$/.test(s.parentSpanId) ? s.parentSpanId.toLowerCase() : false;
        const startedAt = millis(s.startTimeUnixNano); const endedAt = millis(s.endTimeUnixNano);
        const status = object(s.status).code ?? 0;
        if (!traceId || !spanId || parent === false || parent === spanId || startedAt === null || endedAt === null || endedAt < startedAt || startedAt < now - 7 * 86400000 || endedAt > now + 300000 || ![0, 1, 2].includes(status)) { rejected++; continue; }
        const a = attributes(s.attributes);
        const operation = ["invoke_agent", "execute_tool", "chat", "text_completion", "embeddings", "retrieval"].includes(String(a.get("gen_ai.operation.name"))) ? String(a.get("gen_ai.operation.name")) : "other";
        spans.push({ id: hash(owner, traceId, spanId), traceId: hash(owner, traceId), parentId: parent ? hash(owner, traceId, parent) : null,
          service: identifier(resource.get("service.name"), 64) ?? "unknown-service", version: identifier(resource.get("service.version"), 64), operation,
          tool: identifier(a.get("gen_ai.tool.name")), model: identifier(a.get("gen_ai.request.model")), startedAt, endedAt, status,
          inputTokens: count(a.get("gen_ai.usage.input_tokens")), outputTokens: count(a.get("gen_ai.usage.output_tokens")) });
      }
    }
  }
  return { spans, rejected };
}

export function recordSpans(owner: string, spans: Span[], now = Date.now()): { accepted: number; quota: boolean } {
  const d = db(); d.exec("begin immediate");
  try {
    const seen = new Set<string>();
    const fresh = spans.filter(s => { if (seen.has(s.id) || d.prepare("select 1 from agent_spans where owner = ? and id = ?").get(owner, s.id)) return false; seen.add(s.id); return true; });
    const month = monthKey(now);
    const used = (d.prepare("select count from agent_usage where owner = ? and month = ?").get(owner, month) as { count: number } | undefined)?.count ?? 0;
    if (used + fresh.length > AGENT_EVENTS_PER_MONTH) { d.exec("rollback"); return { accepted: 0, quota: true }; }
    const insert = d.prepare(`insert into agent_spans (owner,id,trace_id,parent_id,service,version,operation,tool,model,started_at,ended_at,status,input_tokens,output_tokens,received_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const s of fresh) insert.run(owner,s.id,s.traceId,s.parentId,s.service,s.version,s.operation,s.tool,s.model,s.startedAt,s.endedAt,s.status,s.inputTokens,s.outputTokens,now);
    if (fresh.length) d.prepare("insert into agent_usage (owner,month,count) values (?,?,?) on conflict(owner,month) do update set count=count+excluded.count").run(owner,month,fresh.length);
    d.exec("commit"); return { accepted: fresh.length, quota: false };
  } catch (error) { d.exec("rollback"); throw error; }
}

export function traceList(owner: string) {
  return db().prepare(`select trace_id as id, min(started_at) as startedAt, max(ended_at)-min(started_at) as durationMs,
    count(*) as spans, sum(status=2) as errors, count(distinct service) as services
    from agent_spans where owner = ? group by trace_id order by min(started_at) desc limit 100`).all(owner) as {
      id: string; startedAt: number; durationMs: number; spans: number; errors: number; services: number;
    }[];
}
export function traceDetail(owner: string, traceId: string, offset = 0) {
  const total = (db().prepare("select count(*) as n from agent_spans where owner = ? and trace_id = ?").get(owner, traceId) as { n: number }).n;
  if (!total) return null;
  const spans = db().prepare(`select id, trace_id as traceId, parent_id as parentId, service, version, operation, tool, model, started_at as startedAt,
    ended_at as endedAt, status, input_tokens as inputTokens, output_tokens as outputTokens from agent_spans
    where owner = ? and trace_id = ? order by started_at, id limit 200 offset ?`).all(owner, traceId, Math.max(0, Math.floor(offset))) as Span[];
  return { total, spans };
}
