import { SOURCES_VERSION } from "./classify";
import { getSite, type Account } from "./db";
import { interactions, loadDashboard } from "./dashboard";
import { planFor } from "./plans";

/**
 * The stats payload: exactly what the dashboard shows, as JSON, for the
 * owner's own tools and agents. Daily totals only. Raw events never leave
 * the server through this door, so there is nothing personal to leak here.
 */

export type StatsPayload = ReturnType<typeof statsFor>;

export function clampDays(raw: unknown, account: Account): number {
  const max = planFor(account.plan).windowDays;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return Math.min(30, max);
  return Math.min(Math.floor(n), max);
}

export function statsFor(domain: string, account: Account, days: number, now = Date.now()) {
  const site = getSite(domain);
  if (!site || site.owner !== account.email) return null;
  const dash = loadDashboard(site.domain, days, now);
  return {
    domain: site.domain,
    days,
    generatedAt: new Date(now).toISOString(),
    sourcesVersion: SOURCES_VERSION,
    verified: Boolean(site.verified_at),
    check: site.last_score === null ? null : { score: site.last_score, grade: site.last_grade, scannedAt: site.last_scanned_at ? new Date(site.last_scanned_at).toISOString() : null },
    totals: { ...dash.overview.totals, interactions: interactions(dash.overview) },
    previous: dash.overview.previous,
    days_series: dash.overview.days,
    agents: dash.agents,
    tools: dash.tools.map((t) => ({ ...t, lastSeen: t.lastSeen ? new Date(t.lastSeen).toISOString() : null })),
    pages: dash.pages,
    fetchesFromLogSince: site.log_since ? new Date(site.log_since).toISOString() : null,
    bursts: dash.bursts.map((b) => ({ ...b, at: new Date(b.t).toISOString() })),
  };
}
