import Link from "next/link";
import { sourceDetailHref } from "@/lib/tracking/source-detail";
import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { AGENT_LABELS, SOURCES_VERSION } from "@/lib/tracking/classify";
import { dashCopy, dashLang } from "@/lib/tracking/copy";
import { loadDashboard } from "@/lib/tracking/dashboard";
import { planFor } from "@/lib/tracking/plans";
import { verificationAudit } from "@/lib/tracking/db";
import { loadRanges, rangeSourceHealth } from "@/lib/tracking/bot-ranges";

export const metadata: Metadata = { title: "Agents", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const c = dashCopy(dashLang(account.lang)).agents;
  const dash = loadDashboard(site.domain, planFor(account.plan).windowDays);
  const evidence = verificationAudit(site.domain, dash.days).slice(0, 30);
  const ranges = rangeSourceHealth(loadRanges());

  return (
    <DashboardShell account={account} site={site} view="agents">
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p className="dek" style={{ marginBottom: 20, maxWidth: "62ch" }}>
          {c.intro(dash.days)} {site.log_since ? c.logFed(new Date(site.log_since).toISOString().slice(0, 10)) : c.snippetOnly}
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>{c.cols.source}</th>
                <th>{c.cols.kind}</th>
                <th>{c.cols.count}</th>
                <th>{c.cols.share}</th>
                <th>{c.cols.trend}</th>
                <th>{c.cols.bursts}</th>
                <th>{c.cols.verified}</th>
              </tr>
            </thead>
            <tbody>
              {dash.agents.length ? (
                dash.agents.map((a) => (
                  <tr key={`${a.kind}:${a.id}`}>
                    <td><Link href={sourceDetailHref(site.domain, a.kind, a.id, dash.days)}>{a.label} →</Link></td>
                    <td>{a.kind === "fetch" ? c.fetch : c.referral}</td>
                    <td className="num">{a.count}</td>
                    <td className="num">{Math.round(a.share * 100)}%</td>
                    <td className="num" style={{ color: a.trend > 0 ? "var(--good)" : a.trend < 0 ? "var(--crit)" : "var(--muted)" }}>
                      {a.trend === 0 ? c.flat : `${a.trend > 0 ? "+" : ""}${Math.round(a.trend * 100)}%`}
                    </td>
                    <td className="num">{a.bursts ? c.burstCell(a.bursts, a.burstPages) : ""}</td>
                    <td style={{ fontSize: 13, color: a.unverified || a.missing || a.stale ? "var(--warn)" : "var(--muted)" }}>
                      {a.kind !== "fetch" ? "" : c.evidenceSummary(a.verifiedCount, a.legacyCount, a.unverified, a.missing, a.stale, a.unavailable)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted)" }}>
                    {c.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {dash.bursts.length ? (
          <>
            <h2 style={{ fontSize: 20, marginTop: 34, marginBottom: 10 }}>{c.recentBursts}</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>{c.burstCols.when}</th>
                    <th>{c.burstCols.agent}</th>
                    <th>{c.burstCols.pages}</th>
                    <th>{c.burstCols.within}</th>
                    <th>{c.burstCols.paths}</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.bursts.map((b) => (
                    <tr key={`${b.t}:${b.agent}`}>
                      <td>{new Date(b.t).toISOString().replace("T", " ").slice(0, 16)} UTC</td>
                      <td>{AGENT_LABELS[b.agent] ?? b.agent}</td>
                      <td className="num">{b.paths.length}</td>
                      <td className="num">{Math.max(1, Math.round(b.ms / 1000))}s</td>
                      <td style={{ fontSize: 13, color: "var(--ink-2)" }}>{b.paths.slice(0, 6).join(", ")}{b.paths.length > 6 ? ", ..." : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        <h2 style={{ fontSize: 20, marginTop: 34, marginBottom: 10 }}>{c.evidenceAudit}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{c.evidenceAuditNote}</p>
        {evidence.length > 0 && <div className="tablewrap"><table><thead><tr>
          <th>{c.evidenceCols.day}</th><th>{c.evidenceCols.agent}</th><th>{c.evidenceCols.status}</th><th>{c.evidenceCols.source}</th><th>{c.evidenceCols.updated}</th><th>{c.evidenceCols.checked}</th><th>{c.evidenceCols.count}</th>
        </tr></thead><tbody>{evidence.map((row) => <tr key={`${row.day}:${row.transport}:${row.agent}:${row.status}:${row.sourceVersion}`}>
          <td>{row.day}</td><td>{AGENT_LABELS[row.agent] ?? row.agent}</td><td>{row.status}</td><td>{row.sourceKey || row.method}</td>
          <td>{row.sourceVersion || "—"}</td><td>{new Date(row.lastCheckedAt).toISOString().slice(0, 16)} UTC</td><td className="num">{row.count}</td>
        </tr>)}</tbody></table></div>}
        <h2 style={{ fontSize: 20, marginTop: 34, marginBottom: 10 }}>{c.rangeHealth}</h2>
        <div className="tablewrap"><table><thead><tr><th>{c.rangeHealthCols.provider}</th><th>{c.rangeHealthCols.state}</th><th>{c.rangeHealthCols.updated}</th><th>{c.rangeHealthCols.failed}</th></tr></thead>
          <tbody>{ranges.map((source) => <tr key={source.key}><td>{source.key}</td><td>{source.status}</td><td>{source.updatedAt ?? "—"}</td><td>{source.failedAt ?? "—"}</td></tr>)}</tbody></table></div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>{c.sourceVersion(SOURCES_VERSION)}</p>
      </section>
    </DashboardShell>
  );
}
