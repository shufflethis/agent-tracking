import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { dailyRows, getSite, ingestHealthDaily, logAttemptExportRows } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";
import { safeCounterName } from "@/lib/tracking/privacy";
import { canReadSite } from "@/lib/tracking/site-access";

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
  if (!site || !canReadSite(site.domain, account.email)) return new Response("No site with that domain on this account.", { status: 404 });
  const days = planFor(account.plan).windowDays;
  const rows = dailyRows(site.domain, days);
  const lines = [
    "day,kind,name,count,errors,ms_total,definition_version,definition",
    ...rows.map((r) => [r.day, r.kind, safeCounterName(r.kind, r.name), r.count, r.errors, r.ms_total, r.kind === "conversion" ? 1 : 2, r.kind === "conversion" ? "unverified_browser_goal_signal" : "observed_counter"].map(csvCell).join(",")),
    ...ingestHealthDaily(site.domain, days).map((r) => [r.day, "ingest_health", r.outcome, r.count, 0, 0, 2, "ingest_outcome_batches_or_log_imports"].map(csvCell).join(",")),
    ...logAttemptExportRows(site.domain, days).map((r) => [r.day, "log_attempt", `${r.agent}|${r.method}|${r.status}|${r.result}|${r.resource}|${r.identityStatus}|${r.path}`, r.count, 0, 0, 2, "http_access_attempt_resource_path_guess"].map(csvCell).join(",")),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="agent-tracking-${site.domain}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
