import { interpretEvent, verifyWebhook } from "@/lib/billing";
import { ensureAccount, getAccount, setAgentPlan, setPlan } from "@/lib/tracking/db";

export const runtime = "nodejs";

/**
 * Stripe's webhook. The raw body is what is signed, so it is read as text
 * and parsed only after the signature holds. An event that means nothing for
 * a plan is acknowledged and ignored; Stripe retries anything but a 2xx.
 */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (!verifyWebhook(raw, request.headers.get("stripe-signature"))) {
    return new Response("Bad signature.", { status: 400 });
  }
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload.", { status: 400 });
  }
  const outcome = interpretEvent(event);
  // A downgrade for an account that does not exist is the echo of an account deletion
  // (it cancels the subscription first); creating the row again would bring the email back.
  if (outcome && outcome.plan === "free" && !getAccount(outcome.email)) {
    console.log(`[billing] ignored ${event.type} for a deleted account`);
  } else if (outcome) {
    ensureAccount(outcome.email);
    const stripe = { customer: outcome.customer, subscription: outcome.subscription };
    if (outcome.product === "agents") setAgentPlan(outcome.email, outcome.plan, stripe);
    else setPlan(outcome.email, outcome.plan, stripe);
    console.log(`[billing] ${outcome.email} ${outcome.product} -> ${outcome.plan} (${event.type})`);
  }
  return Response.json({ received: true });
}
