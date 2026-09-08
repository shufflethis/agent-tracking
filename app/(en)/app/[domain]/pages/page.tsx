import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { dashCopy, dashLang } from "@/lib/tracking/copy";
import { loadDashboard } from "@/lib/tracking/dashboard";
import { planFor } from "@/lib/tracking/plans";

export const metadata: Metadata = { title: "Pages", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const c = dashCopy(dashLang(account.lang)).pages;
  const dash = loadDashboard(site.domain, planFor(account.plan).windowDays);

  return (
    <DashboardShell account={account} site={site} view="pages">
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p className="dek" style={{ marginBottom: 20, maxWidth: "62ch" }}>{c.intro}</p>
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
    </DashboardShell>
  );
}
