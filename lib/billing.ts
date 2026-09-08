import { createHmac, timingSafeEqual } from "node:crypto";
import { planForPriceId, priceIdFor, type PlanId } from "./tracking/plans";

/**
 * Stripe over plain fetch.
 *
 * No SDK, for the same reason lib/email.ts has none: two calls and one
 * signature check do not justify a dependency that is larger than this
 * codebase. Keys and prices come from the environment; when they are absent
 * every function here says so and nothing throws at import time.
 *
 *   STRIPE_SECRET_KEY      sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET  whsec_… for /api/billing/webhook
 *   STRIPE_PRICE_PRO       price_… (recurring)
 *   STRIPE_PRICE_AGENCY    price_… (recurring)
 */

const API = "https://api.stripe.com/v1";

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

async function stripe(path: string, params: Record<string, string>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; reason: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { ok: false, reason: "Billing is not configured." };
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Network error" };
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const error = data.error as { message?: string } | undefined;
    return { ok: false, reason: error?.message ?? `Stripe ${res.status}` };
  }
  return { ok: true, data };
}

/** A Checkout Session for a plan; the customer's email is prefilled and carried in metadata for the webhook. */
export async function createCheckout(email: string, plan: PlanId, returnTo: string): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const price = priceIdFor(plan);
  if (!price) return { ok: false, reason: `The ${plan} plan has no price configured.` };
  const result = await stripe("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    customer_email: email,
    "metadata[email]": email,
    "metadata[plan]": plan,
    "subscription_data[metadata][email]": email,
    "subscription_data[metadata][plan]": plan,
    success_url: `${returnTo}?billing=done`,
    cancel_url: returnTo,
    allow_promotion_codes: "true",
  });
  if (!result.ok) return result;
  const url = result.data.url;
  return typeof url === "string" ? { ok: true, url } : { ok: false, reason: "Stripe returned no checkout URL." };
}

/**
 * Stripe-Signature: `t=<unix>,v1=<hex>[,v1=<hex>]`. The signed payload is
 * `${t}.${rawBody}`; five minutes of tolerance, as Stripe's own SDK uses.
 */
export function verifyWebhook(rawBody: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET?.trim(), now = Date.now()): boolean {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const at = p.indexOf("=");
      return [p.slice(0, at).trim(), p.slice(at + 1).trim()];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const given = header
    .split(",")
    .filter((p) => p.trim().startsWith("v1="))
    .map((p) => p.trim().slice(3));
  return given.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export type WebhookOutcome = { email: string; plan: PlanId; customer: string | null; subscription: string | null } | null;

/**
 * What an event means for an account, or null when it means nothing.
 *
 * `checkout.session.completed` sets the plan from the session's metadata;
 * `customer.subscription.updated` re-reads it from the price, so a change
 * made in the Stripe dashboard lands here too; `customer.subscription.deleted`
 * drops the account back to free.
 */
export function interpretEvent(event: { type?: string; data?: { object?: Record<string, unknown> } }): WebhookOutcome {
  const obj = event.data?.object ?? {};
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const customer = typeof obj.customer === "string" ? obj.customer : null;
  if (event.type === "checkout.session.completed") {
    const plan = meta.plan === "pro" || meta.plan === "agency" ? meta.plan : null;
    const email = meta.email ?? (obj.customer_details as { email?: string } | undefined)?.email ?? (typeof obj.customer_email === "string" ? obj.customer_email : null);
    if (!plan || !email) return null;
    return { email, plan, customer, subscription: typeof obj.subscription === "string" ? obj.subscription : null };
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const email = meta.email;
    if (!email) return null;
    if (event.type === "customer.subscription.deleted" || obj.status === "canceled" || obj.status === "unpaid") {
      return { email, plan: "free", customer, subscription: null };
    }
    const items = (obj.items as { data?: { price?: { id?: string } }[] } | undefined)?.data ?? [];
    const priceId = items[0]?.price?.id ?? "";
    const plan = planForPriceId(priceId);
    return plan ? { email, plan, customer, subscription: typeof obj.id === "string" ? obj.id : null } : null;
  }
  return null;
}
