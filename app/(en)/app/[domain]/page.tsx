import { checkUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import BarChart from "@/components/BarChart";
import DashboardShell, { Stat, trendNote } from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { dashCopy, dashLang, numberLocale } from "@/lib/tracking/copy";
import { activitySignals, loadDashboard } from "@/lib/tracking/dashboard";
import { hasFreshLogSource, ingestHealth, scanJob } from "@/lib/tracking/db";
import { dataState } from "@/lib/tracking/data-state";
import { scanStatusText } from "@/lib/tracking/scan-display";
import { planFor } from "@/lib/tracking/plans";
import { outcomeSummary, serverToolSummary } from "@/lib/tracking/server-ingest";

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
function TopList({ title, all, href, empty, rows }: { title: string; all: string; href: string; empty: string; rows: { label: string; value: string; share: number }[] }) {
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
              <span style={{ position: "relative", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
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
  const o = dash.overview;
  const health = ingestHealth(site.domain, dash.days);
  const ingestIssues = health.filter((row) => row.outcome !== "accepted_batch").reduce((n, row) => n + row.count, 0);
  const state = dataState(site, { acceptedBeacons: health.find((row) => row.outcome === "accepted_batch")?.count ?? 0, quotaGaps: health.find((row) => row.outcome === "quota_reached")?.count ?? 0, logFresh: hasFreshLogSource(site.domain), windowDays: dash.days, now: Date.now() });
  const measured = (n: number, note: string) => n === 0 && state !== "active" ? { value: "–", note: c.zeroState[state] } : { value: String(n), note };
  const scan = scanJob(site.domain);
  const outcomes = outcomeSummary(site.domain, dash.days);
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
      <section className="shell section" style={{ paddingTop: 32 }}>
        <div className="card" style={{ padding: 28, display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          <Stat label={c.referrals} {...measured(o.totals.referrals, trendNote(o.totals.referrals, o.previous.referrals, lang))} />
          <Stat label={c.fetches} {...measured(o.totals.fetches, trendNote(o.totals.fetches, o.previous.fetches, lang))} />
          <Stat label={c.verifiedFetches} {...measured(o.totals.verifiedFetches, trendNote(o.totals.verifiedFetches, o.previous.verifiedFetches, lang))} />
          <Stat label={c.calls} {...measured(o.totals.calls, trendNote(o.totals.calls, o.previous.calls, lang))} />
          <Stat label={lang === "de" ? "Remote-MCP-Aufrufe" : "Remote MCP calls"} value={String(remoteTools.counted)} note={`${remoteTools.counted} / ${remoteTools.reports} ${lang === "de" ? "Servermeldungen im Zeitraum; separat von Browser-Calls" : "server reports in period; separate from browser calls"}`} />
          <Stat label={c.conversions} {...measured(o.totals.conversions, trendNote(o.totals.conversions, o.previous.conversions, lang))} />
          <Stat label={c.goalAttempts} {...measured(o.totals.goalAttempts, trendNote(o.totals.goalAttempts, o.previous.goalAttempts, lang))} />
          <Stat label={lang === "de" ? "Serverbestätigte Abschlüsse" : "Server confirmed outcomes"} value={String(outcomes.confirmed)} note={`${outcomes.confirmed} / ${outcomes.reports} ${lang === "de" ? "Serverbelege im Zeitraum" : "server receipts in period"}`} />
          <Stat label={lang === "de" ? "Ausgang ungeklärt" : "Outcome unlinked"} value={String(Math.max(0, o.totals.goalAttempts - outcomes.linkedGoalAttempts))} note={`${Math.max(0, o.totals.goalAttempts - outcomes.linkedGoalAttempts)} / ${o.totals.goalAttempts} ${lang === "de" ? "Browser-Zielversuche ohne verknüpften bestätigten Beleg" : "browser goal attempts without a linked confirmed receipt"}`} />
          <p style={{ gridColumn: "1 / -1", color: "var(--muted)", margin: 0, fontSize: 13 }}>{lang === "de" ? `${outcomes.agentReported} Abschlüsse mit serverseitig gemeldetem Agenten; ${outcomes.actorUnknown} bestätigte Abschlüsse mit unbekanntem Akteur. Browser-Versuche und Serverbelege haben unterschiedliche Nenner und werden nicht zu einer Conversion-Rate verrechnet.` : `${outcomes.agentReported} outcomes with site server-reported agent actor; ${outcomes.actorUnknown} confirmed outcomes with unknown actor. Browser attempts and server receipts have different denominators and are not combined into a conversion rate.`}</p>
          <Stat label={c.sessions} {...measured(o.totals.sessions, c.sessionsNote)} />
          <p style={{ gridColumn: "1 / -1", color: "var(--muted)", margin: 0, fontSize: 13 }}>{c.legacyGoalNote}</p>
          {ingestIssues > 0 && <p role="status" style={{ gridColumn: "1 / -1", color: "var(--warn)", margin: 0, fontSize: 13 }}>{c.ingestIssue(ingestIssues)}</p>}
        </div>
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
          <TopList title={c.topAgents} all={c.allAgents} href={`/app/${encodeURIComponent(site.domain)}/agents`} empty={c.noneYet} rows={dash.agents.filter((a) => a.count > 0).slice(0, 6).map((a) => ({ label: a.label, value: a.count.toLocaleString(nl), share: a.share }))} />
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
