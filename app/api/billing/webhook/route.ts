import { interpretEvent, verifyWebhook } from "@/lib/billing";
import { ensureAccount, setPlan } from "@/lib/tracking/db";

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
  if (outcome) {
    ensureAccount(outcome.email);
    setPlan(outcome.email, outcome.plan, { customer: outcome.customer, subscription: outcome.subscription });
    console.log(`[billing] ${outcome.email} -> ${outcome.plan} (${event.type})`);
  }
  return Response.json({ received: true });
}
