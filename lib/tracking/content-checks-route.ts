import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite } from "@/lib/tracking/db";
import { canReadSite } from "@/lib/tracking/site-access";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { MAX_CAPTURE_BYTES, contentCapturesFor, contentChecksFor, createContentCheck, normalizePagePath, recordContentCapture } from "@/lib/tracking/content-checks";

const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });

async function accessible(params: Promise<{ domain: string }>, email: string | null) {
  let raw: string;
  try { raw = decodeURIComponent((await params).domain); } catch { return null; }
  const domain = normalizeDomain(raw);
  if (!email || !domain || !canReadSite(domain, email)) return null;
  const site = getSite(domain);
  return site ? { email: email!.toLowerCase(), domain, owner: site.owner === email!.toLowerCase() } : null;
}

export async function readContentChecks(request: Request, params: Promise<{ domain: string }>, email: string | null) {
  const site = await accessible(params, email);
  if (!site) return problem("Site read access required.", 403);
  const rawPath = new URL(request.url).searchParams.get("path");
  let pagePath: string | undefined;
  if (rawPath) {
    try { pagePath = normalizePagePath(rawPath, site.domain); }
    catch { return problem("Invalid page path.", 422); }
  }
  return Response.json({ ok: true, canEdit: site.owner, checks: contentChecksFor(site.domain, pagePath), captures: contentCapturesFor(site.domain, pagePath) });
}

export async function writeContentChecks(request: Request, params: Promise<{ domain: string }>, email: string | null) {
  const site = await accessible(params, email);
  if (!site) return problem("Site read access required.", 403);
  if (!site.owner) return problem("Site owner access required to create checks and captures.", 403);

  let body: Record<string, unknown>;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, MAX_CAPTURE_BYTES * 6 + 16_384));
    const decoded: unknown = JSON.parse(text);
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return problem("Invalid JSON object.", 400);
    body = decoded as Record<string, unknown>;
  } catch (error) {
    return problem(error instanceof BodyLimitError ? "Request too large." : "Invalid JSON or UTF-8.", error instanceof BodyLimitError ? 413 : 400);
  }

  try {
    if (body.action === "create") {
      if (typeof body.pagePath !== "string" || typeof body.label !== "string" || typeof body.expectedText !== "string") return problem("Page path, label, and expected text are required.", 422);
      if (body.alternatives !== undefined && (!Array.isArray(body.alternatives) || body.alternatives.some((v) => typeof v !== "string"))) return problem("Alternatives must be a list of text strings.", 422);
      const check = createContentCheck({ domain: site.domain, owner: site.email, pagePath: body.pagePath, label: body.label, expectedText: body.expectedText, alternatives: body.alternatives as string[] | undefined });
      return Response.json({ ok: true, check }, { status: 201 });
    }
    if (body.action === "capture") {
      if (typeof body.runId !== "string" || typeof body.pagePath !== "string" || typeof body.contentVersion !== "string" || typeof body.html !== "string") return problem("Run ID, page path, content version, and HTML are required.", 422);
      const capture = recordContentCapture({ domain: site.domain, owner: site.email, runId: body.runId, pagePath: body.pagePath, contentVersion: body.contentVersion, html: body.html });
      return Response.json({ ok: true, capture }, { status: 201 });
    }
    return problem("Unknown action.", 422);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request.";
    const status = message === "site_forbidden" ? 403 : message === "capture_id_conflict" ? 409 : message === "capture_rate_limit" ? 429 : message === "no_checks_for_page" ? 409 : message === "capture_too_large" || message === "site_check_limit" || message === "page_check_limit" ? 413 : 422;
    return problem(message, status);
  }
}
