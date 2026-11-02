import { mcpMetrics, mcpWarnings } from "./mcp-analytics";
import type { Insight } from "./insights";
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
  const remote = serverToolSummary(site.domain, days, now);
  const base = `/app/${encodeURIComponent(site.domain)}/tools?days=${days}&environment=production`;
  const warnings: Insight[] = mcpWarnings(mcpMetrics(site.domain, days, "production", now)).map(warning => {
    const row = warning.metric, de = lang === "de";
    return {
      id: `mcp:${warning.kind}:${row.toolName}:${row.pluginVersion}`, kind: "tool", priority: "investigate",
      title: `${warning.kind === "errors" ? (de ? "MCP-Fehlerquote prüfen" : "Check MCP failure rate") : (de ? "Langsame MCP-Aufrufe prüfen" : "Check slow MCP calls")}: ${row.toolName}`,
      evidence: `${row.pluginVersion ?? "?"} · ${warning.kind === "errors" ? `${row.failed + row.timedOut}/${row.calls} (${(row.failureRate * 100).toFixed(1)}%)` : `p95 ${row.p95Ms} ms / ${row.durationSamples}`} · ${days} ${de ? "Tage" : "days"}`,
      action: de ? "Aufrufe und Versionen untersuchen" : "Inspect calls and versions", href: `${base}#mcp-recent`,
      boundary: de ? "Feste Schwelle mit Mindeststichprobe; kein Nachweis eines Umsatzverlusts oder einer Verschlechterung gegenüber früher." : "Fixed threshold with a minimum sample; not evidence of revenue loss or deterioration versus the past.",
    };
  });
  const existing = deriveInsights({ domain: site.domain, lang, days, now, owner,
    state: dataState(site, { acceptedBeacons: health.filter(r => r.outcome === "accepted_batch").reduce((n,r) => n+r.count, 0), quotaGaps, logFresh: hasFreshLogSource(site.domain, now), windowDays: days, now }),
    quotaGaps, tools: dash.tools, attempts: logAttemptSummary(site.domain, days, now),
    outcomes: outcomeSummary(site.domain, days, now), goalAttempts: dash.overview.totals.goalAttempts,
    outcomeConfigured: writeTokenConfigured(site.domain, "outcome"), runs: taskRunsFor(site.domain, 100), findings: findingsFor(site.domain),
  });
  // A live MCP source can operate without a browser snippet or origin log.
  const filtered = remote.reports ? existing.filter(item => item.id !== "source") : existing;
  return [...filtered.filter(item => item.priority === "check_first"), ...warnings, ...filtered.filter(item => item.priority !== "check_first")];
}
