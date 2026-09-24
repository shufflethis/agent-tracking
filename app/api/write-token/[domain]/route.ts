import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { isWritePurpose, mintSiteWriteToken, revokeSiteWriteToken, writeTokenConfigured } from "@/lib/tracking/server-ingest";

export const runtime = "nodejs";
const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });

async function context(params: Promise<{ domain: string }>) {
  const account = await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!account || !domain || getSite(domain)?.owner !== account.email) return null;
  return domain;
}

export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const domain = await context(params);
  if (!domain) return problem("Site owner sign-in required.", 403);
  return Response.json({ ok: true, outcome: writeTokenConfigured(domain, "outcome"), toolTelemetry: writeTokenConfigured(domain, "tool_telemetry") });
}

export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const domain = await context(params);
  if (!domain) return problem("Site owner sign-in required.", 403);
  const body = await request.json().catch(() => null);
  if (!body || !isWritePurpose(body.purpose)) return problem("Invalid purpose.", 422);
  const token = mintSiteWriteToken(domain, (await currentAccount())!.email, body.purpose);
  return Response.json({ ok: true, token, purpose: body.purpose }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const domain = await context(params);
  if (!domain) return problem("Site owner sign-in required.", 403);
  const body = await request.json().catch(() => null);
  if (!body || !isWritePurpose(body.purpose)) return problem("Invalid purpose.", 422);
  revokeSiteWriteToken(domain, (await currentAccount())!.email, body.purpose);
  return Response.json({ ok: true });
}
