import { fleetSummaryFor } from "@/lib/agents/fleet-api";
import { clientIp, take } from "@/lib/ratelimit";
import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";

export const runtime = "nodejs";

/** Read-only JSON summary of the caller's monitored agent fleet, using the account read token (wmt_...). */
export async function GET(request: Request) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) {
    return Response.json({ ok: false, detail: "Too many requests." }, { status: 429, headers: { "retry-after": String(budget.retryAfter) } });
  }
  const account = accountForToken(bearerFrom(request.headers));
  if (!account) {
    return Response.json({ ok: false, detail: "Valid bearer API token required. Create one under Settings." }, { status: 401, headers: { "www-authenticate": 'Bearer realm="agent-tracking"' } });
  }
  return Response.json(fleetSummaryFor(account), { headers: { "cache-control": "no-store" } });
}
