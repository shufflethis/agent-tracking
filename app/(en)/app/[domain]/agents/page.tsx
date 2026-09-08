import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { AGENT_LABELS, SOURCES_VERSION } from "@/lib/tracking/classify";
import { dashCopy, dashLang } from "@/lib/tracking/copy";
import { loadDashboard } from "@/lib/tracking/dashboard";
import { planFor } from "@/lib/tracking/plans";

export const metadata: Metadata = { title: "Agents", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const c = dashCopy(dashLang(account.lang)).agents;
  const dash = loadDashboard(site.domain, planFor(account.plan).windowDays);

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
                    <td>{a.label}</td>
                    <td>{a.kind === "fetch" ? c.fetch : c.referral}</td>
                    <td className="num">{a.count}</td>
                    <td className="num">{Math.round(a.share * 100)}%</td>
                    <td className="num" style={{ color: a.trend > 0 ? "var(--good)" : a.trend < 0 ? "var(--crit)" : "var(--muted)" }}>
                      {a.trend === 0 ? c.flat : `${a.trend > 0 ? "+" : ""}${Math.round(a.trend * 100)}%`}
                    </td>
                    <td className="num">{a.bursts ? c.burstCell(a.bursts, a.burstPages) : ""}</td>
                    <td style={{ fontSize: 13, color: a.unverified ? "var(--warn)" : "var(--muted)" }}>
                      {a.kind !== "fetch" ? "" : a.verifiable ? (a.unverified ? c.claimedOutside(a.unverified) : c.againstRanges) : c.noRanges}
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
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14 }}>{c.sourceVersion(SOURCES_VERSION)}</p>
      </section>
    </DashboardShell>
  );
}
