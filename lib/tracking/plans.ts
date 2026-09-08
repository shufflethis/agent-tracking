/**
 * Plans. Limits are here; prices are not.
 *
 * Prices live in Stripe and are referenced by the price ids in the
 * environment, so a price change is a dashboard action there and a variable
 * change here, never a deploy. The limits are product decisions and belong in
 * code, where a test can hold them still.
 */

export type PlanId = "free" | "pro" | "agency";

export type Plan = {
  id: PlanId;
  name: string;
  /** Sites per account. Infinity for the agency plan. */
  domains: number;
  /** Agent events per calendar month, across all of an account's sites. Plain page views are not charged. */
  eventsPerMonth: number;
  /** How far back the dashboard looks, in days. Raw retention is separate and flat. */
  windowDays: number;
  manifestAlerts: boolean;
  whiteLabelBadge: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", domains: 1, eventsPerMonth: 10_000, windowDays: 30, manifestAlerts: false, whiteLabelBadge: false },
  pro: { id: "pro", name: "Pro", domains: 5, eventsPerMonth: 500_000, windowDays: 365, manifestAlerts: true, whiteLabelBadge: false },
  agency: { id: "agency", name: "Agency", domains: Infinity, eventsPerMonth: 5_000_000, windowDays: 365, manifestAlerts: true, whiteLabelBadge: true },
};

/** Raw events are kept this long whatever the plan; aggregates are kept forever. */
export const RAW_RETENTION_DAYS = 90;

export function planFor(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}

/** Stripe price ids, from the environment. Absent means the plan cannot be bought yet. */
export function priceIdFor(plan: PlanId): string | null {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO?.trim() || null;
  if (plan === "agency") return process.env.STRIPE_PRICE_AGENCY?.trim() || null;
  return null;
}

export function planForPriceId(priceId: string): PlanId | null {
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  if (priceId && priceId === process.env.STRIPE_PRICE_AGENCY?.trim()) return "agency";
  return null;
}
