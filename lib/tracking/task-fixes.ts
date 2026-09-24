import { db, getSite } from "./db";
import { eventId } from "./measurement";
import { taskRun, type TaskRun } from "./task-runs";

export type TaskFix = { fixId: string; beforeRunId: string; afterRunId: string; description: string; createdAt: number; comparison: "controlled_browser_retest" | "conditions_changed"; outcome: "confirmed_by_browser_retest" | "not_confirmed"; before: TaskRun; after: TaskRun; sample: { before: 1; after: 1; beforeUnknown: number; afterUnknown: number } };

function compare(fixId: string, beforeRunId: string, afterRunId: string, description: string, createdAt: number, before: TaskRun, after: TaskRun): TaskFix {
  const same = before.taskKind === after.taskKind && before.mode === after.mode && before.targetUrl === after.targetUrl && before.modelVersion === after.modelVersion;
  return { fixId, beforeRunId, afterRunId, description, createdAt, comparison: same ? "controlled_browser_retest" : "conditions_changed", outcome: same && after.result === "passed" && before.result !== "passed" ? "confirmed_by_browser_retest" : "not_confirmed", before, after, sample: { before: 1, after: 1, beforeUnknown: before.result === "timed_out" ? 1 : 0, afterUnknown: after.result === "timed_out" ? 1 : 0 } };
}

export function recordTaskFix(input: { domain: string; owner: string; fixId: string; beforeRunId: string; afterRunId: string; description: string }, now = Date.now()): TaskFix {
  const { domain, owner, fixId, beforeRunId, afterRunId } = input;
  if (getSite(domain)?.owner !== owner.toLowerCase()) throw new Error("site_forbidden");
  if (!eventId(fixId) || !eventId(beforeRunId) || !eventId(afterRunId) || beforeRunId === afterRunId) throw new Error("invalid_id");
  const description = input.description.trim();
  if (!description || description.length > 1000 || /[\r\n\x00-\x1f]/.test(description)) throw new Error("invalid_description");
  const before = taskRun(domain, beforeRunId), after = taskRun(domain, afterRunId);
  if (!before || !after || before.status !== "finished" || after.status !== "finished" || before.startedAt >= after.startedAt) throw new Error("invalid_run_pair");
  if (before.taskKind !== after.taskKind || before.mode !== after.mode) throw new Error("different_task_or_mode");
  const d = db();
  d.exec("begin immediate");
  try {
    const prior = d.prepare("select description, before_run_id as beforeRunId, after_run_id as afterRunId, created_at as createdAt from task_fixes where domain=? and fix_id=?")
      .get(domain.toLowerCase(), fixId) as { description: string; beforeRunId: string; afterRunId: string; createdAt: number } | undefined;
    if (prior) {
      if (prior.beforeRunId !== beforeRunId || prior.afterRunId !== afterRunId || prior.description !== description) throw new Error("fix_id_conflict");
      d.exec("commit"); return compare(fixId, beforeRunId, afterRunId, description, prior.createdAt, before, after);
    }
    d.prepare("insert into task_fixes (domain, fix_id, before_run_id, after_run_id, description, created_at) values (?, ?, ?, ?, ?, ?)")
      .run(domain.toLowerCase(), fixId, beforeRunId, afterRunId, description, now);
    d.exec("commit"); return compare(fixId, beforeRunId, afterRunId, description, now, before, after);
  } catch (error) { d.exec("rollback"); throw error; }
}

export function taskFixesFor(domain: string, limit = 20): TaskFix[] {
  const rows = db().prepare("select fix_id as fixId, before_run_id as beforeRunId, after_run_id as afterRunId, description, created_at as createdAt from task_fixes where domain=? order by created_at desc limit ?")
    .all(domain.toLowerCase(), Math.min(Math.max(limit, 1), 100)) as { fixId: string; beforeRunId: string; afterRunId: string; description: string; createdAt: number }[];
  return rows.flatMap((row) => {
    const before = taskRun(domain, row.beforeRunId), after = taskRun(domain, row.afterRunId);
    return before && after ? [compare(row.fixId, row.beforeRunId, row.afterRunId, row.description, row.createdAt, before, after)] : [];
  });
}

export function siteVersionsFor(domain: string) {
  return db().prepare("select kind, version_id as versionId, first_seen_at as firstSeenAt, last_seen_at as lastSeenAt from site_versions where domain=? order by last_seen_at desc limit 100")
    .all(domain.toLowerCase()) as { kind: string; versionId: string; firstSeenAt: number; lastSeenAt: number }[];
}
