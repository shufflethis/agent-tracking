import { sourceDetailHref, sourceWindowStart } from "@/lib/tracking/source-detail";
import { checkUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import InsightsPanel from "@/components/InsightsPanel";
import { loadInsights } from "@/lib/tracking/insights-loader";
import BarChart from "@/components/BarChart";
import OverviewMetrics from "@/components/OverviewMetrics";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { dashCopy, dashLang, numberLocale } from "@/lib/tracking/copy";
import { activitySignals, loadDashboard } from "@/lib/tracking/dashboard";
import { hasFreshLogSource, ingestHealth, scanJob } from "@/lib/tracking/db";
import { scanStatusText } from "@/lib/tracking/scan-display";
import { planFor } from "@/lib/tracking/plans";
import { outcomeSummary, serverToolSummary, writeTokenConfigured } from "@/lib/tracking/server-ingest";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };
export const runtime = "nodejs";

type Params = { params: Promise<{ domain: string }> };

/**
 * Overview: the four counts per day over the plan's window, capped at 30 for
 * the chart so a year's worth of days does not become a comb.
 */
/** A short ranked list with a bar behind each row, the way an overview should read at a glance. */
function TopList({ title, all, href, empty, rows }: { title: string; all: string; href: string; empty: string; rows: { label: string; value: string; share: number; href?: string }[] }) {
  return (
    <div className="card" style={{ padding: 26 }}>
      <p className="smallcaps" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <span>{title}</span>
        <Link href={href} style={{ textTransform: "none", letterSpacing: 0 }}>
          {all}
        </Link>
      </p>
      {rows.length === 0 ? (
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>{empty}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {rows.map((r) => (
            <li key={r.label} style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 10px", fontSize: 14, borderRadius: 6, overflow: "hidden" }}>
              <span aria-hidden="true" style={{ position: "absolute", inset: 0, width: `${Math.max(2, Math.round(r.share * 100))}%`, background: "var(--cyan-12)", borderRadius: 6 }} />
              <span style={{ position: "relative", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.href ? <Link href={r.href}>{r.label} →</Link> : r.label}</span>
              <span style={{ position: "relative", fontFamily: "var(--mono)", color: "var(--ink-2)" }}>{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function Page({ params }: Params) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang);
  const c = dashCopy(lang).overview;
  const nl = numberLocale(lang);
  const plan = planFor(account.plan);
  const dash = loadDashboard(site.domain, Math.min(plan.windowDays, 30));
  const insights = loadInsights(site, lang, dash.days, site.owner === account.email, Date.now(), dash);
  const o = dash.overview;
  const health = ingestHealth(site.domain, dash.days);
  const ingestIssues = health.filter((row) => row.outcome !== "accepted_batch").reduce((n, row) => n + row.count, 0);
  const browserActive = Boolean(site.last_beacon_at && Date.now() - site.last_beacon_at <= dash.days * 86_400_000) || health.some(row => row.outcome === "accepted_batch" && row.count > 0);
  const logsActive = hasFreshLogSource(site.domain);
  const toolsActive = browserActive && dash.tools.some(tool => tool.registered && tool.captureMode === "wrapped" && tool.lastSeen && Date.now() - tool.lastSeen <= dash.days * 86_400_000);
  const scan = scanJob(site.domain);
  const outcomes = outcomeSummary(site.domain, dash.days, Date.now(), sourceWindowStart(o.days[0].day));
  const remoteTools = serverToolSummary(site.domain, dash.days);
  const days = o.days.map((d) => d.day);
  const legend = [
    { label: c.referrals, color: "var(--cyan)" },
    { label: c.fetches, color: "var(--soft-violet)" },
    { label: c.verifiedFetches, color: "var(--cyan)" },
    { label: c.calls, color: "var(--good)" },
    { label: c.conversions, color: "var(--warn)" },
  ];

  return (
    <DashboardShell account={account} site={site} view="">
      <div className="shell section" style={{ paddingBottom: 0 }}><InsightsPanel items={insights} lang={lang} domain={site.domain} days={dash.days} compact /></div>
      <section className="shell section" style={{ paddingTop: 32 }}>
        <OverviewMetrics lang={lang} days={dash.days} domain={site.domain} overview={o}
          browserActive={browserActive} logsActive={logsActive} toolsActive={toolsActive}
          outcomeConfigured={writeTokenConfigured(site.domain, "outcome")} remoteConfigured={writeTokenConfigured(site.domain, "tool_telemetry")}
          outcomes={outcomes} remoteTools={remoteTools} ingestIssues={ingestIssues} />
      </section>

      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="card" style={{ padding: 28 }}>
          <p className="smallcaps" style={{ marginBottom: 14 }}>{c.perDay(dash.days)}</p>
          <BarChart
            days={days}
            series={[
              { key: "referrals", label: c.referrals, color: "var(--cyan)", values: o.days.map((d) => d.referrals) },
              { key: "fetches", label: c.fetches, color: "var(--soft-violet)", values: o.days.map((d) => d.fetches) },
              { key: "verifiedFetches", label: c.verifiedFetches, color: "var(--cyan)", values: o.days.map((d) => d.verifiedFetches) },
              { key: "calls", label: c.calls, color: "var(--good)", values: o.days.map((d) => d.calls) },
              { key: "conversions", label: c.conversions, color: "var(--warn)", values: o.days.map((d) => d.conversions) },
            ]}
          />
          <p style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "14px 0 0", fontSize: 13, color: "var(--muted)" }}>
            {legend.map((l) => (
              <span key={l.label}>
                <i style={{ display: "inline-block", width: 10, height: 10, background: l.color, borderRadius: 2, marginRight: 6 }} />
                {l.label}
              </span>
            ))}
          </p>
        </div>
      </section>

      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="grid2" style={{ gap: 18 }}>
          <TopList title={c.topAgents} all={c.allAgents} href={`/app/${encodeURIComponent(site.domain)}/agents`} empty={c.noneYet} rows={dash.agents.filter((a) => a.count > 0).slice(0, 6).map((a) => ({ label: a.label, value: a.count.toLocaleString(nl), share: a.share, href: sourceDetailHref(site.domain, a.kind, a.id, dash.days) }))} />
          <TopList title={c.topPages} all={c.allPages} href={`/app/${encodeURIComponent(site.domain)}/pages`} empty={c.noneYet} rows={dash.pages.slice(0, 6).map((p) => ({ label: p.path, value: (p.fetches + p.calls).toLocaleString(nl), share: dash.pages[0] ? (p.fetches + p.calls) / (dash.pages[0].fetches + dash.pages[0].calls) : 0 }))} />
        </div>
      </section>

      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="grid2" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 26 }}>
            <p className="smallcaps" style={{ marginBottom: 8 }}>{c.checkTitle}</p>
            {site.last_score !== null ? (
              <>
                <p style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 34, margin: 0 }}>
                  {site.last_score}
                  <span style={{ fontSize: 16, color: "var(--muted)" }}> / 100 · {c.grade} {site.last_grade}</span>
                </p>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
                  {c.scanned(new Date(site.last_scanned_at ?? 0).toISOString().slice(0, 10))} {scan && scan.status !== "success" ? scanStatusText(scan, c) : ""} {checkUrl(site.domain) ? <a href={checkUrl(site.domain)!} rel="noopener">{c.openCheck}</a> : null}.
                </p>
              </>
            ) : (
              <p style={{ color: "var(--ink-2)", margin: 0 }}>
                {site.verified_at ? scanStatusText(scan, c) : c.scoreAfterVerify}{" "}
                {checkUrl(site.domain) ? <a href={checkUrl(site.domain)!} rel="noopener">{c.openCheck}</a> : null}
              </p>
            )}
          </div>
          <div className="card" style={{ padding: 26 }}>
            <p className="smallcaps" style={{ marginBottom: 8 }}>{c.inNumbers}</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              {c.numbers(activitySignals(o).toLocaleString(nl), dash.days, o.totals.views.toLocaleString(nl))}{" "}
              {site.public_share ? (
                <Link href={`/stats/${encodeURIComponent(site.domain)}`}>{c.statsPageSame}</Link>
              ) : (
                <Link href={`/app/${encodeURIComponent(site.domain)}/settings`}>{c.publishToShare}</Link>
              )}
            </p>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
