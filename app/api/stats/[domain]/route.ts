import { clientIp, take } from "@/lib/ratelimit";
import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { normalizeDomain } from "@/lib/tracking/classify";
import { clampDays, statsFor } from "@/lib/tracking/stats-api";

export const runtime = "nodejs";

/**
 * GET /api/stats/example.com?days=30 with Authorization: Bearer wmt_...
 *
 * The dashboard as JSON, for the owner's own scripts and agents. Read-only,
 * daily totals only, and the token decides what it can see: a token reads
 * the sites of its own account and nothing else, whatever domain it names.
 */
export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return Response.json({ error: "Too many requests." }, { status: 429, headers: { "retry-after": String(budget.retryAfter) } });
  const account = accountForToken(bearerFrom(request.headers));
  if (!account) return Response.json({ error: "Send the account's API token as a Bearer token. Create one on a site's settings page." }, { status: 401 });
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!domain) return Response.json({ error: "Not a hostname." }, { status: 400 });
  const days = clampDays(new URL(request.url).searchParams.get("days"), account);
  const stats = statsFor(domain, account, days);
  // 404 for both "no such site" and "not yours": a token must not be able to
  // tell whether someone else tracks a domain.
  if (!stats) return Response.json({ error: "No site with that domain on this account." }, { status: 404 });
  return Response.json(stats, { headers: { "cache-control": "private, no-store" } });
}
