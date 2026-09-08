import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { dailyRows, getSite } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";

export const runtime = "nodejs";

/**
 * GET /api/export/example.com: the daily counters as CSV, the plan's whole
 * window. Session or API token. This is the "give me my data" door: every
 * number the dashboard can show is derived from these rows.
 */
const csvCell = (v: string | number) => (typeof v === "number" ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const account = accountForToken(bearerFrom(request.headers)) ?? (await currentAccount());
  if (!account) return new Response("Sign in, or send the account's API token as a Bearer token.", { status: 401 });
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!domain) return new Response("Not a hostname.", { status: 400 });
  const site = getSite(domain);
  if (!site || site.owner !== account.email) return new Response("No site with that domain on this account.", { status: 404 });
  const days = planFor(account.plan).windowDays;
  const rows = dailyRows(site.domain, days);
  const lines = ["day,kind,name,count,errors,ms_total", ...rows.map((r) => [r.day, r.kind, r.name, r.count, r.errors, r.ms_total].map(csvCell).join(","))];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="agent-tracking-${site.domain}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
