import { sameOriginFormPost } from "@/lib/agents/form-route";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { isWritePurpose, mintSiteWriteToken, revokeSiteWriteToken, type WritePurpose, writeTokenConfigured } from "@/lib/tracking/server-ingest";

export const runtime = "nodejs";
const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });

async function context(params: Promise<{ domain: string }>) {
  const account = await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!account || !domain || getSite(domain)?.owner !== account.email) return null;
  return { domain, email: account.email };
}

async function readPurpose(request: Request): Promise<WritePurpose | Response> {
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 1024));
    const body = JSON.parse(raw) as { purpose?: unknown };
    if (!body || !isWritePurpose(body.purpose)) return problem("Invalid purpose.", 422);
    return body.purpose;
  } catch (err) {
    return problem(err instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", err instanceof BodyLimitError ? 413 : 400);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const ctx = await context(params);
  if (!ctx) return problem("Site owner sign-in required.", 403);
  return Response.json({ ok: true, outcome: writeTokenConfigured(ctx.domain, "outcome"), toolTelemetry: writeTokenConfigured(ctx.domain, "tool_telemetry") });
}

export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  if (!sameOriginFormPost(request)) return problem("Forbidden.", 403);
  const ctx = await context(params);
  if (!ctx) return problem("Site owner sign-in required.", 403);
  const purpose = await readPurpose(request);
  if (purpose instanceof Response) return purpose;
  const token = mintSiteWriteToken(ctx.domain, ctx.email, purpose);
  return Response.json({ ok: true, token, purpose }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  if (!sameOriginFormPost(request)) return problem("Forbidden.", 403);
  const ctx = await context(params);
  if (!ctx) return problem("Site owner sign-in required.", 403);
  const purpose = await readPurpose(request);
  if (purpose instanceof Response) return purpose;
  revokeSiteWriteToken(ctx.domain, ctx.email, purpose);
  return Response.json({ ok: true });
}
