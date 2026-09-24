import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { normalizeDomain } from "@/lib/tracking/classify";
import { siteReport } from "@/lib/tracking/site-report";
import { canReadSite } from "@/lib/tracking/site-access";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const account = accountForToken(bearerFrom(request.headers)) ?? await currentAccount();
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!account || !domain || !canReadSite(domain, account.email)) return Response.json({ ok: false, detail: "Site read access required." }, { status: 403 });
  return Response.json(siteReport(domain), { headers: { "cache-control": "private, no-store", "content-disposition": `attachment; filename="agenttracking-report-${domain}.json"` } });
}
