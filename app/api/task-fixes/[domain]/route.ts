import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { recordTaskFix, siteVersionsFor, taskFixesFor } from "@/lib/tracking/task-fixes";

export const runtime = "nodejs";
const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });
async function owned(params: Promise<{ domain: string }>) {
  const account = await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  return account && domain && getSite(domain)?.owner === account.email ? { domain, owner: account.email } : null;
}
export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  return Response.json({ ok: true, fixes: taskFixesFor(site.domain), versions: siteVersionsFor(site.domain) });
}
export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  let body: Record<string, unknown>;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 4096))); }
  catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", error instanceof BodyLimitError ? 413 : 400); }
  if (typeof body.fixId !== "string" || typeof body.beforeRunId !== "string" || typeof body.afterRunId !== "string" || typeof body.description !== "string") return problem("Invalid fix.", 422);
  try { return Response.json({ ok: true, fix: recordTaskFix({ ...site, fixId: body.fixId, beforeRunId: body.beforeRunId, afterRunId: body.afterRunId, description: body.description }) }); }
  catch (error) { return problem(error instanceof Error ? error.message : "Invalid fix.", 422); }
}
