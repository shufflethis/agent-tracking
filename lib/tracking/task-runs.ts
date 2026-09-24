import { db, getSite } from "./db";
import { eventId } from "./measurement";
import { runInquiryBrowserCheck, runnerTimeoutMs, validateRunnerTarget, type RunnerResult } from "./task-runner";

export type TaskRun = { domain: string; runId: string; taskKind: string; targetUrl: string; mode: string; status: string; startedAt: number; finishedAt: number | null; deadlineAt: number; result: string | null; steps: string[]; errorClass: string | null; releaseId: string | null; toolVersion: string | null; schemaVersion: string | null; modelVersion: string | null; synthetic: true };
type Row = { domain: string; run_id: string; task_kind: string; target_url: string; mode: string; status: string; started_at: number; finished_at: number | null; deadline_at: number; result: string | null; steps_json: string; error_class: string | null; release_id: string | null; tool_version: string | null; schema_version: string | null; model_version: string | null };
const fromRow = (r: Row): TaskRun => ({ domain: r.domain, runId: r.run_id, taskKind: r.task_kind, targetUrl: r.target_url, mode: r.mode, status: r.status, startedAt: r.started_at, finishedAt: r.finished_at, deadlineAt: r.deadline_at, result: r.result, steps: JSON.parse(r.steps_json), errorClass: r.error_class, releaseId: r.release_id, toolVersion: r.tool_version, schemaVersion: r.schema_version, modelVersion: r.model_version, synthetic: true });

export function taskRun(domain: string, runId: string): TaskRun | null {
  const row = db().prepare("select * from task_runs where domain=? and run_id=?").get(domain.toLowerCase(), runId) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function taskRunsFor(domain: string, limit = 20): TaskRun[] {
  return (db().prepare("select * from task_runs where domain=? order by started_at desc limit ?").all(domain.toLowerCase(), Math.min(Math.max(1, limit), 100)) as Row[]).map(fromRow);
}

export async function runInquiryTask(input: { domain: string; owner: string; runId: string; targetUrl: string; releaseId?: string | null; toolVersion?: string | null; schemaVersion?: string | null }, now = Date.now()): Promise<TaskRun> {
  const { domain, owner, runId, targetUrl } = input;
  if (getSite(domain)?.owner !== owner.toLowerCase()) throw new Error("site_forbidden");
  if (!eventId(runId) || [input.releaseId, input.toolVersion, input.schemaVersion].some((v) => v != null && !eventId(v))) throw new Error("invalid_id");
  const target = await validateRunnerTarget(domain, targetUrl);
  if (target.url.search || target.url.hash) throw new Error("query_target_forbidden");
  const d = db();
  d.exec("begin immediate");
  try {
    d.prepare("update task_runs set status='finished', result='timed_out', error_class='runner_interrupted', finished_at=? where status='running' and deadline_at<?").run(now, now);
    const existing = taskRun(domain, runId);
    if (existing) { d.exec("commit"); return existing; }
    const active = d.prepare("select count(*) as n from task_runs where status='running'").get() as { n: number };
    if (active.n >= 1) throw new Error("runner_busy");
    d.prepare(`insert into task_runs (domain, run_id, task_kind, target_url, mode, status, started_at, deadline_at,
      release_id, tool_version, schema_version, synthetic) values (?, ?, 'inquiry_form', ?, 'deterministic_browser', 'running', ?, ?, ?, ?, ?, 1)`)
      .run(domain.toLowerCase(), runId, target.url.href, now, now + runnerTimeoutMs() + 3000, input.releaseId ?? null, input.toolVersion ?? null, input.schemaVersion ?? null);
    const version = d.prepare(`insert into site_versions (domain, kind, version_id, first_seen_at, last_seen_at)
      values (?, ?, ?, ?, ?) on conflict(domain, kind, version_id) do update set last_seen_at=excluded.last_seen_at`);
    for (const [kind, value] of [["release", input.releaseId], ["tool", input.toolVersion], ["schema", input.schemaVersion]] as const) {
      if (value) version.run(domain.toLowerCase(), kind, value, now, now);
    }
    d.exec("commit");
  } catch (error) { d.exec("rollback"); throw error; }
  let result: RunnerResult;
  try { result = await runInquiryBrowserCheck(domain, target.url.href); }
  catch (error) { result = { result: "failed", steps: [], errorClass: error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "runner_failure" }; }
  d.prepare("update task_runs set status='finished', finished_at=?, result=?, steps_json=?, error_class=? where domain=? and run_id=? and status='running'")
    .run(Date.now(), result.result, JSON.stringify(result.steps.slice(0, 10)), result.errorClass, domain.toLowerCase(), runId);
  return taskRun(domain, runId)!;
}
