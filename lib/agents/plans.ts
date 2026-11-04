/**
 * Plans for agent monitoring, separate from the website plans in
 * lib/tracking/plans.ts. Limits live here; prices live in Stripe and are
 * referenced by price ids from the environment.
 *
 * Paid plans only take effect from AGENT_PRICING_STARTS. Until then, and
 * while it is null, every account gets the Pro limits, which is the beta
 * everyone signed up for. Existing users get 30 days' notice by email before
 * the date is set; see the home page and the changelog.
 *
 * Over the free limit after the start: existing agents keep reporting, only
 * new agents are refused (lib/agents/ingest.ts counts on insert only).
 */

export type AgentPlanId = "free" | "pro";
export type AgentInterval = "month" | "year";

export type AgentPlan = {
  id: AgentPlanId;
  /** Agents per account. */
  agents: number;
  /** Telegram, Slack, Discord and generic webhooks. Email alerts and the briefing are on every plan. */
  webhooks: boolean;
  /** The OTLP/HTTP trace receiver. */
  otlp: boolean;
  /** Named task checks reported by `wrap --check`. */
  checks: boolean;
};

export const AGENT_PLANS: Record<AgentPlanId, AgentPlan> = {
  free: { id: "free", agents: 5, webhooks: false, otlp: false, checks: false },
  pro: { id: "pro", agents: 50, webhooks: true, otlp: true, checks: true },
};

/** Prices shown on the site, in US dollars. Stripe holds the real amounts; keep these in step. */
export const AGENT_PRO_PRICE = { month: 9, year: 90 } as const;

/**
 * When paid plans start, as a Unix time in milliseconds, or null while the
 * beta runs. Started on November 4, 2026 without a notice period: the only
 * other account had no agents, so the free limit did not touch it.
 */
export const AGENT_PRICING_STARTS: number | null = Date.UTC(2026, 10, 4, 0, 0); // November 4, 2026

export function pricingActive(now = Date.now(), starts: number | null = AGENT_PRICING_STARTS): boolean {
  return starts !== null && now >= starts;
}

export function agentPlanId(value: string | null | undefined): AgentPlanId {
  return value === "pro" ? "pro" : "free";
}

/** The limits that apply right now: Pro for everyone during the beta, the stored plan after it. */
export function effectiveAgentPlan(stored: string | null | undefined, now = Date.now(), starts: number | null = AGENT_PRICING_STARTS): AgentPlan {
  return pricingActive(now, starts) ? AGENT_PLANS[agentPlanId(stored)] : AGENT_PLANS.pro;
}

export function agentPriceId(interval: AgentInterval): string | null {
  const v = interval === "month" ? process.env.STRIPE_PRICE_AGENTS_PRO_MONTH : process.env.STRIPE_PRICE_AGENTS_PRO_YEAR;
  return v?.trim() || null;
}

/**
 * True when an upgrade can be bought: both prices configured (so the button
 * never leads to an error) and paid plans have started (so nobody pays during
 * the beta for limits everyone already has).
 */
export function agentCheckoutReady(now = Date.now()): boolean {
  return pricingActive(now) && Boolean(process.env.STRIPE_SECRET_KEY?.trim() && agentPriceId("month") && agentPriceId("year"));
}

export function isAgentPriceId(priceId: string): boolean {
  return Boolean(priceId) && (priceId === agentPriceId("month") || priceId === agentPriceId("year"));
}
