import { db, getSite } from "./db";
import { eventId } from "./measurement";
import { taskRun } from "./task-runs";

export const FINDING_CATEGORIES = ["form_discovery", "tool_schema", "tool_execution", "navigation", "verification", "outcome_linkage", "other"] as const;
export const FINDING_STATUSES = ["open", "in_progress", "fixed", "retest_confirmed"] as const;
export type FindingCategory = typeof FINDING_CATEGORIES[number];
export type FindingStatus = typeof FINDING_STATUSES[number];
export type Finding = { findingId: string; taskRunId: string; fixId: string | null; evidenceRefs: string[]; category: FindingCategory; description: string; assignee: string | null; status: FindingStatus; correction: string | null; retestRunId: string | null; createdAt: number; updatedAt: number };

const text = (raw: unknown, max: number) => typeof raw === "string" && raw.trim().length > 0 && raw.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw) ? raw.trim() : null;
const optionalText = (raw: unknown, max: number) => raw === null || raw === undefined || raw === "" ? null : text(raw, max);

export function findingsFor(domain: string): Finding[] {
  const rows = db().prepare("select * from findings where domain=? order by updated_at desc limit 500").all(domain.toLowerCase()) as Record<string, any>[];
  return rows.map((r) => ({ findingId: r.finding_id, taskRunId: r.task_run_id, fixId: r.fix_id, evidenceRefs: JSON.parse(r.evidence_json), category: r.category, description: r.description, assignee: r.assignee, status: r.status, correction: r.correction, retestRunId: r.retest_run_id, createdAt: r.created_at, updatedAt: r.updated_at }));
}

export function saveFinding(domain: string, owner: string, raw: Record<string, unknown>, now = Date.now()): Finding {
  if (getSite(domain)?.owner !== owner.toLowerCase()) throw new Error("site_forbidden");
  const findingId = eventId(raw.findingId), taskRunId = eventId(raw.taskRunId), retestRunId = raw.retestRunId == null || raw.retestRunId === "" ? null : eventId(raw.retestRunId), fixId = raw.fixId == null || raw.fixId === "" ? null : eventId(raw.fixId);
  if (!findingId || !taskRunId || raw.retestRunId && !retestRunId || raw.fixId && !fixId) throw new Error("invalid_id");
  const category = FINDING_CATEGORIES.find((c) => c === raw.category), status = FINDING_STATUSES.find((s) => s === raw.status);
  const description = text(raw.description, 2000), correction = optionalText(raw.correction, 2000), assignee = optionalText(raw.assignee, 254);
  if (!category || !status || !description || raw.correction && !correction || raw.assignee && (!assignee || !/^[^\s@]+@[^\s@]+$/.test(assignee))) throw new Error("invalid_finding");
  if (!Array.isArray(raw.evidenceRefs) || raw.evidenceRefs.length < 1 || raw.evidenceRefs.length > 10 || raw.evidenceRefs.some((v) => typeof v !== "string" || !/^(run|outcome):[A-Za-z0-9_-]{16,64}$/.test(v))) throw new Error("invalid_evidence");
  if (!taskRun(domain, taskRunId)) throw new Error("task_run_missing");
  const evidenceRefs = [...new Set(raw.evidenceRefs as string[])];
  for (const ref of evidenceRefs) {
    const [kind, id] = ref.split(":");
    const exists = kind === "run" ? taskRun(domain, id) : db().prepare("select 1 from server_outcomes where domain=? and receipt_id=?").get(domain.toLowerCase(), id);
    if (!exists) throw new Error("evidence_missing");
  }
  if (fixId && !db().prepare("select 1 from task_fixes where domain=? and fix_id=?").get(domain.toLowerCase(), fixId)) throw new Error("fix_missing");
  if (retestRunId && !taskRun(domain, retestRunId)) throw new Error("retest_missing");
  if (status === "retest_confirmed") {
    const retest = retestRunId ? taskRun(domain, retestRunId) : null;
    if (!fixId || !correction || retest?.result !== "passed") throw new Error("retest_not_confirmed");
    const linked = db().prepare("select 1 from task_fixes where domain=? and fix_id=? and before_run_id=? and after_run_id=?")
      .get(domain.toLowerCase(), fixId, taskRunId, retestRunId);
    if (!linked) throw new Error("retest_not_linked");
  }
  db().prepare(`insert into findings (domain, finding_id, task_run_id, fix_id, evidence_json, category, description, assignee, status, correction, retest_run_id, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(domain, finding_id) do update set task_run_id=excluded.task_run_id, fix_id=excluded.fix_id,
    evidence_json=excluded.evidence_json, category=excluded.category, description=excluded.description,
    assignee=excluded.assignee, status=excluded.status, correction=excluded.correction,
    retest_run_id=excluded.retest_run_id, updated_at=excluded.updated_at`)
    .run(domain.toLowerCase(), findingId, taskRunId, fixId, JSON.stringify(evidenceRefs), category, description, assignee, status, correction, retestRunId, now, now);
  return findingsFor(domain).find((f) => f.findingId === findingId)!;
}
