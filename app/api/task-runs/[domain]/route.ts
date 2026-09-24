import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { runInquiryTask, taskRunsFor } from "@/lib/tracking/task-runs";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";
export const maxDuration = 30;
const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });
async function owned(params: Promise<{ domain: string }>) {
  const account = await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  return account && domain && getSite(domain)?.owner === account.email ? { domain, owner: account.email } : null;
}
export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  return Response.json({ ok: true, modelAgentStatus: "not_configured", runs: taskRunsFor(site.domain) });
}
export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  let raw: string;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 4096)); }
  catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid body.", error instanceof BodyLimitError ? 413 : 400); }
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return problem("Invalid JSON.", 400); }
  if (body.mode === "model_agent") return problem("Model agent provider is not configured.", 501);
  if (body.mode !== "deterministic_browser" || typeof body.runId !== "string" || typeof body.targetUrl !== "string") return problem("Invalid task.", 422);
  try {
    const run = await runInquiryTask({ domain: site.domain, owner: site.owner, runId: body.runId, targetUrl: body.targetUrl, releaseId: typeof body.releaseId === "string" ? body.releaseId : null, toolVersion: typeof body.toolVersion === "string" ? body.toolVersion : null, schemaVersion: typeof body.schemaVersion === "string" ? body.schemaVersion : null });
    return Response.json({ ok: true, run });
  } catch (error) {
    const code = error instanceof Error ? error.message : "runner_failure";
    return problem(code, code === "runner_busy" ? 429 : code === "site_forbidden" ? 403 : 422);
  }
}
