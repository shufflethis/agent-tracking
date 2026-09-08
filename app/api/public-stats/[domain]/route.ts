import { normalizeDomain } from "@/lib/tracking/classify";
import { interactions, loadDashboard } from "@/lib/tracking/dashboard";
import { getSite } from "@/lib/tracking/db";
import { clientIp, take } from "@/lib/ratelimit";
import { SITE_ORIGIN } from "@/lib/site";

export const runtime = "nodejs";

/**
 * The public stats page as JSON: only for sites whose owner switched the page
 * on, only the same totals the page shows, no token. Everything else is 404,
 * so the endpoint cannot be used to find out which sites exist.
 */
export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return Response.json({ error: "Too many requests." }, { status: 429 });
  const { domain } = await params;
  const host = normalizeDomain(decodeURIComponent(domain));
  const site = host ? getSite(host) : null;
  if (!site || !site.public_share) return Response.json({ error: "No public stats page for that site." }, { status: 404 });
  const dash = loadDashboard(site.domain, 30);
  const o = dash.overview;
  return Response.json(
    {
      domain: site.domain,
      days: 30,
      generatedAt: new Date().toISOString(),
      totals: { ...o.totals, interactions: interactions(o) },
      agents: dash.agents.filter((a) => a.count > 0).slice(0, 12).map((a) => ({ id: a.id, label: a.label, kind: a.kind, count: a.count, share: Math.round(a.share * 1000) / 1000, verifiable: a.verifiable, unverified: a.unverified })),
      pages: dash.pages.slice(0, 12),
      page: `${SITE_ORIGIN}/stats/${encodeURIComponent(site.domain)}`,
    },
    { headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" } },
  );
}
