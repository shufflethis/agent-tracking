import { assertPublicHost } from "@/lib/public-host";
import { randomUUID } from "node:crypto";
import { CONTACT_EMAIL } from "@/lib/site";
import { snippetInstalled } from "@/lib/verify-snippet";
import { fetchScore } from "@/lib/tracking/score";
import { clientIp, take } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { addSite, getSite, markVerified, recordSiteCheck, removeSite, setPublicShare, setScore, sitesFor } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Site management for the signed-in account: add, verify, share, remove.
 *
 * One route, an `action` field, because the four are one resource. Every
 * action checks ownership again rather than trusting the page that posted.
 */

const problem = (detail: string, status = 422) => Response.json({ ok: false, detail }, { status });

export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return problem("Sign in first.", 401);

  const body = (await request.json().catch(() => ({}))) as { action?: string; domain?: string; on?: boolean };
  const domain = normalizeDomain(String(body.domain ?? ""));
  if (!domain) return problem("That is not a public hostname. Use the bare domain, for example example.com.");

  switch (body.action) {
    case "add": {
      const plan = planFor(account.plan);
      const mine = sitesFor(account.email);
      if (mine.some((s) => s.domain === domain)) return Response.json({ ok: true, site: mine.find((s) => s.domain === domain) });
      if (mine.length >= plan.domains) return problem(`The ${plan.name} plan covers ${plan.domains} site${plan.domains === 1 ? "" : "s"}. Upgrade to add more.`, 402);
      // The crawler's own rule: never a private host, never a bare address.
      try {
        await assertPublicHost(domain);
      } catch (err) {
        return problem(err instanceof Error ? err.message : "That host cannot be tracked.");
      }
      const site = addSite(domain, account.email);
      if (!site) return problem(`That domain is already registered by another account. If it is yours, write to ${CONTACT_EMAIL}.`, 409);
      return Response.json({ ok: true, site });
    }
    case "verify": {
      const site = getSite(domain);
      if (!site || site.owner !== account.email) return problem("Not your site.", 403);
      // An outbound fetch of someone's homepage, so it spends the crawl budget.
      const budget = take(clientIp(request.headers), "crawls");
      if (!budget.ok) return problem("Too many checks. Try again in a while.", 429);
      const testId = randomUUID();
      const at = Date.now();
      const found = await snippetInstalled(domain);
      const detailCode = found.ok ? "installed" : found.detail.includes("data-domain") ? "domain_mismatch" : found.detail.includes("not found") ? "snippet_missing" : found.detail.includes("answered") ? "homepage_http_error" : found.detail.includes("redirect") ? "redirect_issue" : "fetch_failed";
      recordSiteCheck(domain, { testId, kind: "snippet", attemptedAt: at, success: found.ok, detailCode });
      if (found.ok) {
        markVerified(domain);
        return Response.json({ ok: true, verified: true, testId });
      }
      return Response.json({ ok: true, verified: false, detail: found.detail, testId });
    }
    case "share": {
      const site = getSite(domain);
      if (!site || site.owner !== account.email) return problem("Not your site.", 403);
      setPublicShare(domain, body.on === true);
      return Response.json({ ok: true, share: body.on === true });
    }
    case "score": {
      // The readiness check, fetched from the sister product. Costs them a
      // crawl, so it spends our crawl budget too.
      const site = getSite(domain);
      if (!site || site.owner !== account.email) return problem("Not your site.", 403);
      const budget = take(clientIp(request.headers), "crawls");
      if (!budget.ok) return problem("Too many checks. Try again in a while.", 429);
      const testId = randomUUID();
      const at = Date.now();
      const scored = await fetchScore(domain);
      recordSiteCheck(domain, { testId, kind: "score", attemptedAt: at, success: scored.ok, detailCode: scored.ok ? "scored" : "check_failed" });
      if (!scored.ok) return problem(scored.detail, 502);
      setScore(domain, scored.score, scored.grade);
      return Response.json({ ok: true, score: scored.score, grade: scored.grade, testId });
    }
    case "remove": {
      if (!removeSite(domain, account.email)) return problem("Not your site.", 403);
      return Response.json({ ok: true });
    }
    default:
      return problem("Unknown action.");
  }
}
