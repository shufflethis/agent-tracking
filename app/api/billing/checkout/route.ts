import { SITE_ORIGIN } from "@/lib/site";
import { createCheckout } from "@/lib/billing";
import { currentAccount } from "@/lib/tracking/auth";
import { sitesFor } from "@/lib/tracking/db";

export const runtime = "nodejs";

/** Starts a Checkout Session for the signed-in account and answers with its URL. */
export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan === "pro" || body.plan === "agency" ? body.plan : null;
  if (!plan) return Response.json({ ok: false, detail: "Unknown plan." }, { status: 422 });
  const first = sitesFor(account.email)[0];
  const returnTo = first ? `${SITE_ORIGIN}/app/${encodeURIComponent(first.domain)}/settings` : `${SITE_ORIGIN}/app`;
  const result = await createCheckout(account.email, plan, returnTo);
  if (!result.ok) return Response.json({ ok: false, detail: result.reason }, { status: 503 });
  return Response.json({ ok: true, url: result.url });
}
