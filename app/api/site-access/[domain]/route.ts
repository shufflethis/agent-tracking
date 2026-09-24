import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { createSiteInvite, revokeSiteInvite, revokeSiteReader, siteAccessList } from "@/lib/tracking/site-access";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

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
  return Response.json({ ok: true, ...siteAccessList(site.domain) });
}
export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  let body: { email?: unknown } | null;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 1024))); }
  catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", error instanceof BodyLimitError ? 413 : 400); }
  if (typeof body?.email !== "string") return problem("Invalid email.", 422);
  const invite = createSiteInvite(site.domain, site.owner, body.email);
  return invite ? Response.json({ ok: true, invite }, { headers: { "cache-control": "no-store" } }) : problem("Invalid invitation.", 422);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const site = await owned(params);
  if (!site) return problem("Site owner sign-in required.", 403);
  let body: { inviteId?: unknown; email?: unknown } | null;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 1024))); }
  catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", error instanceof BodyLimitError ? 413 : 400); }
  if (typeof body?.inviteId === "string") return Response.json({ ok: revokeSiteInvite(site.domain, site.owner, body.inviteId) });
  if (typeof body?.email === "string") return Response.json({ ok: revokeSiteReader(site.domain, site.owner, body.email) });
  return problem("Invalid revocation.", 422);
}
