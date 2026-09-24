import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { findingsFor, saveFinding } from "@/lib/tracking/findings";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { siteRole } from "@/lib/tracking/site-access";

export const runtime = "nodejs";
const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });
export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const account = accountForToken(bearerFrom(request.headers)) ?? await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!account || !domain || !siteRole(domain, account.email)) return problem("Site read access required.", 403);
  return Response.json({ ok: true, findings: findingsFor(domain) }, { headers: { "cache-control": "private, no-store" } });
}
export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const account = await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!account || !domain || siteRole(domain, account.email) !== "owner") return problem("Site owner sign-in required.", 403);
  let body: Record<string, unknown>;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 8192))); }
  catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", error instanceof BodyLimitError ? 413 : 400); }
  try { return Response.json({ ok: true, finding: saveFinding(domain, account.email, body) }); }
  catch (error) { return problem(error instanceof Error ? error.message : "Invalid finding.", 422); }
}
