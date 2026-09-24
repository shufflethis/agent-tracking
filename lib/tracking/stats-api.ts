import { SOURCES_VERSION } from "./classify";
import { getSite, hasFreshLogSource, ingestHealth, lastSiteCheck, logAttemptSummary, logSourceStates, recentScanAttempts, scanJob, verificationAudit, type Account } from "./db";
import { activitySignals, interactions, loadDashboard } from "./dashboard";
import { planFor } from "./plans";
import { REPORTING_DEFINITIONS, reportingTotals } from "./reporting";
import { dataState } from "./data-state";
import { outcomeSummary, serverToolSummary, writeTokenConfigured } from "./server-ingest";

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
  const health = ingestHealth(site.domain, days, now);
  const logFresh = hasFreshLogSource(site.domain, now);
  return {
    domain: site.domain,
    days,
    generatedAt: new Date(now).toISOString(),
    sourcesVersion: SOURCES_VERSION,
    verified: Boolean(site.verified_at),
    measurementStatus: {
      snippetLastSuccessAt: site.verified_at ? new Date(site.verified_at).toISOString() : null,
      snippetLastCheck: lastSiteCheck(site.domain, "snippet"),
      firstAcceptedBeaconAt: site.first_beacon_at ? new Date(site.first_beacon_at).toISOString() : null,
      lastAcceptedBeaconAt: site.last_beacon_at ? new Date(site.last_beacon_at).toISOString() : null,
      logSourceFresh: hasFreshLogSource(site.domain, now),
      dataState: dataState(site, { acceptedBeacons: health.find((r) => r.outcome === "accepted_batch")?.count ?? 0, quotaGaps: health.find((r) => r.outcome === "quota_reached")?.count ?? 0, logFresh, windowDays: days, now }),
      lastRealToolCallAt: site.last_tool_call_at ? new Date(site.last_tool_call_at).toISOString() : null,
      confirmedOutcomeSourceConfigured: writeTokenConfigured(site.domain, "outcome"),
    },
    reportingDefinitions: REPORTING_DEFINITIONS,
    ingestHealth: health.map((r) => ({ ...r, lastAt: new Date(r.lastAt).toISOString() })),
    logSources: logSourceStates(site.domain).map((s) => ({ ...s, lastImportAt: s.lastImportAt ? new Date(s.lastImportAt).toISOString() : null, lastLogAt: s.lastLogAt ? new Date(s.lastLogAt).toISOString() : null })),
    logSourceFresh: logFresh,
    logAttempts: logAttemptSummary(site.domain, days, now),
    serverOutcomes: outcomeSummary(site.domain, days, now),
    serverToolCalls: serverToolSummary(site.domain, days, now),
    verificationAudit: verificationAudit(site.domain, days, now).map((r) => ({ ...r, lastCheckedAt: new Date(r.lastCheckedAt).toISOString() })),
    check: site.last_score === null ? null : { score: site.last_score, grade: site.last_grade, scannedAt: site.last_scanned_at ? new Date(site.last_scanned_at).toISOString() : null },
    scanJob: scanJob(site.domain, now),
    recentScanAttempts: recentScanAttempts(site.domain),
    totals: { ...dash.overview.totals, ...reportingTotals(dash.overview.totals), interactions: interactions(dash.overview), activitySignals: activitySignals(dash.overview) },
    previous: dash.overview.previous,
    days_series: dash.overview.days,
    agents: dash.agents,
    tools: dash.tools.map((t) => ({ ...t, lastSeen: t.lastSeen ? new Date(t.lastSeen).toISOString() : null })),
    pages: dash.pages,
    fetchesFromLogSince: site.log_since ? new Date(site.log_since).toISOString() : null,
    bursts: dash.bursts.map((b) => ({ ...b, at: new Date(b.t).toISOString() })),
  };
}
