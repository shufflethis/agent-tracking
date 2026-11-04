import { backTo, formRequest } from "@/lib/agents/form-route";
import { createAgentCheckout, createPortalSession } from "@/lib/billing";
import { agentCheckoutReady } from "@/lib/agents/plans";
import { SITE_ORIGIN } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Form posts from the fleet settings: action=checkout with interval=month|year
 * starts Stripe Checkout for agent monitoring Pro; action=portal opens the
 * Stripe customer portal. Both answer with a redirect, so the page needs no script.
 */
export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  const returnTo = `${SITE_ORIGIN}/app/fleet/settings`;
  const action = String(r.form.get("action") ?? "");
  if (action === "portal") {
    if (!r.account.stripe_customer) return backTo(request, "/app/fleet/settings?saved=billing_error#plan");
    const portal = await createPortalSession(r.account.stripe_customer, returnTo);
    return portal.ok ? Response.redirect(portal.url, 303) : backTo(request, "/app/fleet/settings?saved=billing_error#plan");
  }
  if (action === "checkout") {
    const interval = r.form.get("interval") === "year" ? "year" : "month";
    if (!agentCheckoutReady()) return backTo(request, "/app/fleet/settings?saved=billing_error#plan");
    const checkout = await createAgentCheckout(r.account.email, r.account.stripe_customer, interval, returnTo);
    if (!checkout.ok) console.error(`[billing] agent checkout failed: ${checkout.reason}`);
    return checkout.ok ? Response.redirect(checkout.url, 303) : backTo(request, "/app/fleet/settings?saved=billing_error#plan");
  }
  return new Response("Unknown action.", { status: 422 });
}
