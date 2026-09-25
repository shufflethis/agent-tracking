import { deriveInsights } from "./insights";
import { loadDashboard, type Dashboard } from "./dashboard";
import { hasFreshLogSource, ingestHealth, logAttemptSummary, type Site } from "./db";
import { dataState } from "./data-state";
import { outcomeSummary, serverToolSummary, writeTokenConfigured } from "./server-ingest";
import { taskRunsFor } from "./task-runs";
import { findingsFor } from "./findings";

/** Call only after the route/API has authorized site access. No cross-site data or mutations. */
export function loadInsights(site: Site, lang: "en" | "de", days: number, owner: boolean, now = Date.now(), dashboard?: Dashboard) {
  const dash = dashboard ?? loadDashboard(site.domain, days, now);
  const health = ingestHealth(site.domain, days, now);
  const quotaGaps = health.filter(r => r.outcome === "quota_reached").reduce((n,r) => n+r.count, 0) + serverToolSummary(site.domain, days, now).quotaGaps;
  return deriveInsights({ domain: site.domain, lang, days, now, owner,
    state: dataState(site, { acceptedBeacons: health.filter(r => r.outcome === "accepted_batch").reduce((n,r) => n+r.count, 0), quotaGaps, logFresh: hasFreshLogSource(site.domain, now), windowDays: days, now }),
    quotaGaps, tools: dash.tools, attempts: logAttemptSummary(site.domain, days, now),
    outcomes: outcomeSummary(site.domain, days, now), goalAttempts: dash.overview.totals.goalAttempts,
    outcomeConfigured: writeTokenConfigured(site.domain, "outcome"), runs: taskRunsFor(site.domain, 100), findings: findingsFor(site.domain),
  });
}
