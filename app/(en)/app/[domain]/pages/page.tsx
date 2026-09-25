import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { dashCopy, dashLang } from "@/lib/tracking/copy";
import { loadDashboard } from "@/lib/tracking/dashboard";
import { logAttemptPaths } from "@/lib/tracking/db";
import { clampDays } from "@/lib/tracking/stats-api";

export const metadata: Metadata = { title: "Pages", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params, searchParams }: { params: Promise<{ domain: string }>; searchParams: Promise<{ days?: string }> }) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const days = clampDays((await searchParams).days, account);
  const c = dashCopy(dashLang(account.lang)).pages;
  const dash = loadDashboard(site.domain, days);
  const attempts = logAttemptPaths(site.domain, days);

  return (
    <DashboardShell account={account} site={site} view="pages">
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p className="dek" style={{ marginBottom: 20, maxWidth: "62ch" }}>{c.intro} · {days} {account.lang === "de" ? "Tage" : "days"}</p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>{c.cols.path}</th>
                <th>{c.cols.fetches}</th>
                <th>{c.cols.calls}</th>
              </tr>
            </thead>
            <tbody>
              {dash.pages.length ? (
                dash.pages.map((p) => (
                  <tr key={p.path}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 13, wordBreak: "break-all" }}>{p.path}</td>
                    <td className="num">{p.fetches}</td>
                    <td className="num">{p.calls}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ color: "var(--muted)" }}>
                    {c.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 0 }}>
        <h2 id="access-attempts">{c.attemptsTitle}</h2>
        <p className="dek" style={{ maxWidth: "78ch" }}>{c.attemptsNote}</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>{c.attemptsCols.path}</th><th>{c.attemptsCols.result}</th><th>{c.attemptsCols.resource}</th><th>{c.attemptsCols.method}</th><th>{c.attemptsCols.status}</th><th>{c.attemptsCols.identity}</th><th>{c.attemptsCols.count}</th></tr></thead>
            <tbody>
              {attempts.length ? attempts.map((a, i) => <tr key={`${a.path}:${a.result}:${a.resource}:${a.method}:${a.status}:${a.identityStatus}:${i}`}>
                <td style={{ fontFamily: "var(--mono)", wordBreak: "break-all" }}>{a.path}</td><td>{a.result}</td><td>{a.resource}</td><td>{a.method}</td><td>{a.status}</td><td>{a.identityStatus}</td><td className="num">{a.count}</td>
              </tr>) : <tr><td colSpan={7} style={{ color: "var(--muted)" }}>{c.attemptsEmpty}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
