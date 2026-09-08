import { assertPublicHost } from "@/lib/public-host";
import { CONTACT_EMAIL, LEGACY_SNIPPET_HOSTS, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { fetchScore } from "@/lib/tracking/score";
import { clientIp, take } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain, sameSite } from "@/lib/tracking/classify";
import { addSite, getSite, markVerified, removeSite, setPublicShare, setScore, sitesFor } from "@/lib/tracking/db";
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
      const found = await snippetInstalled(domain);
      if (found.ok) {
        markVerified(domain);
        return Response.json({ ok: true, verified: true });
      }
      return Response.json({ ok: true, verified: false, detail: found.detail });
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
      const scored = await fetchScore(domain);
      if (!scored.ok) return problem(scored.detail, 502);
      setScore(domain, scored.score, scored.grade);
      return Response.json({ ok: true, score: scored.score, grade: scored.grade });
    }
    case "remove": {
      if (!removeSite(domain, account.email)) return problem("Not your site.", 403);
      return Response.json({ ok: true });
    }
    default:
      return problem("Unknown action.");
  }
}

/** The tag loads agent.js from this installation or from a host the product used to live on. */
function servedByUs(tag: string): boolean {
  const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
  if (!m) return false;
  let host: string;
  try {
    host = new URL(m[1], SITE_ORIGIN).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === SITE_HOST || LEGACY_SNIPPET_HOSTS.includes(host);
}

/**
 * Is agent.js on the homepage with this domain in data-domain?
 *
 * Ownership by installation: whoever can put a script tag on the site is the
 * site. It is also the one check that matters for the product, since a site
 * without the snippet has no data to show.
 */
async function snippetInstalled(domain: string): Promise<{ ok: true } | { ok: false; detail: string }> {
  try {
    await assertPublicHost(domain);
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Host refused." };
  }
  let html: string;
  try {
    const res = await fetch(`https://${domain}/`, {
      headers: { "user-agent": `Mozilla/5.0 (compatible; ${SITE_HOST} verify; +${SITE_ORIGIN}/docs)` },
      // Never follow: assertPublicHost checked this host, not wherever a
      // redirect points. A site that answers on another host is registered
      // under that host instead.
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const to = res.headers.get("location") ?? "";
      let host = "";
      try {
        host = new URL(to, `https://${domain}/`).hostname;
      } catch {
        /* keep the generic message */
      }
      return { ok: false, detail: host && !sameSite(host, domain) ? `The homepage redirects to ${host}. Add the site under that host.` : "The homepage redirects. Add the site under the host it finally answers on." };
    }
    if (!res.ok) return { ok: false, detail: `The homepage answered ${res.status}.` };
    html = (await res.text()).slice(0, 600_000);
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "The homepage could not be fetched." };
  }
  const tags = html.match(/<script\b[^>]*agent\.js[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const m = tag.match(/data-domain\s*=\s*["']([^"']+)["']/i);
    if (m && sameSite(m[1], domain) && servedByUs(tag)) return { ok: true };
  }
  return { ok: false, detail: tags.length ? "agent.js is on the page but data-domain does not match this site." : "agent.js was not found in the homepage HTML. It has to be in the served markup, not injected later." };
}
