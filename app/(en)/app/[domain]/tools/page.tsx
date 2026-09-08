import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { dashCopy, dashLang } from "@/lib/tracking/copy";
import { loadDashboard } from "@/lib/tracking/dashboard";
import { planFor } from "@/lib/tracking/plans";

export const metadata: Metadata = { title: "Tools", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const c = dashCopy(dashLang(account.lang)).tools;
  const dash = loadDashboard(site.domain, planFor(account.plan).windowDays);
  const never = dash.tools.filter((t) => t.neverCalled);

  return (
    <DashboardShell account={account} site={site} view="tools">
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p className="dek" style={{ marginBottom: 20, maxWidth: "62ch" }}>{c.intro}</p>
        {never.length ? (
          <div className="callout hot" style={{ marginBottom: 24 }}>
            <span className="tag">{c.neverCalled}</span>
            <p style={{ marginBottom: 0 }}>
              {never.map((t) => t.name).join(", ")}. {c.neverCalledNote}
            </p>
          </div>
        ) : null}
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>{c.cols.tool}</th>
                <th>{c.cols.calls}</th>
                <th>{c.cols.success}</th>
                <th>{c.cols.avg}</th>
                <th>{c.cols.errors}</th>
                <th>{c.cols.lastSeen}</th>
              </tr>
            </thead>
            <tbody>
              {dash.tools.length ? (
                dash.tools.map((t) => (
                  <tr key={t.name} style={t.calls === 0 ? { color: "var(--muted)" } : undefined}>
                    <td>
                      {t.name}
                      {t.declarative ? <span className="chip" style={{ marginLeft: 8 }}>{c.form}</span> : null}
                      {t.simulated ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)" }}>{c.simulated(t.simulated)}</span> : null}
                    </td>
                    <td className="num">{t.calls || "0"}</td>
                    <td className="num" style={{ color: t.successRate === null ? undefined : t.successRate >= 0.95 ? "var(--good)" : t.successRate >= 0.8 ? "var(--warn)" : "var(--crit)" }}>
                      {t.successRate === null ? c.na : `${Math.round(t.successRate * 100)}%`}
                    </td>
                    <td className="num">{t.avgMs === null ? c.na : `${t.avgMs} ms`}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{t.topErrors.length ? t.topErrors.map((e) => `${e.message} (${e.count})`).join(" · ") : c.none}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{t.lastSeen ? new Date(t.lastSeen).toISOString().slice(0, 10) : c.never}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    {c.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
