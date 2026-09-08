import { SITE_ORIGIN } from "@/lib/site";
import { clientIp, take } from "@/lib/ratelimit";
import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { sitesFor } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";

export const runtime = "nodejs";

/** The sites a token can read, so a client can discover them before asking for one. */
export async function GET(request: Request) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return Response.json({ error: "Too many requests." }, { status: 429, headers: { "retry-after": String(budget.retryAfter) } });
  const account = accountForToken(bearerFrom(request.headers));
  if (!account) return Response.json({ error: "Send the account's API token as a Bearer token. Create one on a site's settings page." }, { status: 401 });
  const plan = planFor(account.plan);
  return Response.json({
    plan: plan.id,
    maxDays: plan.windowDays,
    sites: sitesFor(account.email).map((s) => ({ domain: s.domain, verified: Boolean(s.verified_at), stats: `${SITE_ORIGIN}/api/stats/${encodeURIComponent(s.domain)}` })),
  });
}
