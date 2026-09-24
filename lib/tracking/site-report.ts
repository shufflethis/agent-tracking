import { getSite, hasFreshLogSource, ingestHealth } from "./db";
import { findingsFor } from "./findings";
import { outcomeSummary, serverToolSummary, writeTokenConfigured } from "./server-ingest";
import { taskFixesFor } from "./task-fixes";
import { taskRunsFor } from "./task-runs";
import { loadDashboard } from "./dashboard";

export function siteReport(domain: string, days = 30, now = Date.now()) {
  const site = getSite(domain);
  if (!site) return null;
  const dashboard = loadDashboard(domain, days, now);
  const health = ingestHealth(domain, days, now);
  const findings = findingsFor(domain);
  return {
    domain, generatedAt: new Date(now).toISOString(), days,
    coverage: {
      snippetVerified: Boolean(site.verified_at),
      firstAcceptedBeaconAt: site.first_beacon_at ? new Date(site.first_beacon_at).toISOString() : null,
      logSourceFresh: hasFreshLogSource(domain, now),
      outcomeSourceConfigured: writeTokenConfigured(domain, "outcome"),
      browserGoalAttempts: dashboard.overview.totals.goalAttempts,
      serverOutcomes: outcomeSummary(domain, days, now),
      remoteTools: serverToolSummary(domain, days, now),
      ingestIssues: health.filter((r) => r.outcome !== "accepted_batch"),
    },
    findings,
    fixes: taskFixesFor(domain),
    runs: taskRunsFor(domain, 100),
    openPoints: findings.filter((f) => f.status !== "retest_confirmed"),
    definitions: { browserAttempts: "Observed browser goals; business result unknown unless individually linked to a server receipt.", serverOutcomes: "Authenticated site-server receipts; agent actor is unknown without matching server tool telemetry.", retest: "Deterministic synthetic browser check, not a third-party model agent or production conversion." },
  };
}
