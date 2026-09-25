import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { AddSiteForm, SiteListSnippetStatus } from "@/components/SiteActions";
import { requireAccount } from "@/lib/tracking/auth";
import { actionStrings, dashCopy, dashLang } from "@/lib/tracking/copy";
import { lastSiteCheck, scanJob, sitesFor } from "@/lib/tracking/db";
import { scanStatusText } from "@/lib/tracking/scan-display";
import { planFor } from "@/lib/tracking/plans";
import { readableSites } from "@/lib/tracking/site-access";

export const metadata: Metadata = { title: "Your sites", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const { add } = await searchParams;
  const account = await requireAccount("/app");
  const lang = dashLang(account.lang);
  const c = dashCopy(lang).list;
  const actions = actionStrings(lang);
  const ownedSites = sitesFor(account.email);
  const sites = readableSites(account.email);
  const plan = planFor(account.plan);
  const canAdd = ownedSites.length < plan.domains;

  return (
    <DashboardShell account={account}>
      <section className="shell section" style={{ paddingTop: 32 }}>
        {sites.length ? (
          <div className="tablewrap" style={{ marginBottom: 28 }}>
            <table>
              <thead>
                <tr>
                  <th>{c.cols.site}</th>
                  <th>{c.cols.snippet}</th>
                  <th>{c.cols.score}</th>
                  <th>{c.cols.stats}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.domain}>
                    <td>
                      <Link href={`/app/${encodeURIComponent(s.domain)}`}>{s.domain}</Link>
                    </td>
                    <td>
                      {s.owner === account.email
                        ? <SiteListSnippetStatus domain={s.domain} verified={Boolean(s.verified_at)} lastFailed={lastSiteCheck(s.domain, "snippet")?.success === false} labels={{ verified: c.verified, notVerified: c.notVerified, recentCheckFailed: c.recentCheckFailed }} actions={actions} />
                        : <span className={s.verified_at ? "chip pass" : "chip partial"}>{s.verified_at ? c.verified : c.notVerified}</span>}
                    </td>
                    <td>{s.last_score !== null ? `${s.last_score} / 100 (${s.last_grade}) · ${scanStatusText(scanJob(s.domain), c)}` : scanStatusText(scanJob(s.domain), c)}</td>
                    <td>{s.public_share ? <Link href={`/stats/${encodeURIComponent(s.domain)}`}>{c.public}</Link> : c.private}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="dek" style={{ marginBottom: 24 }}>{c.empty}</p>
        )}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.addTitle}</h2>
          {canAdd ? <AddSiteForm initial={add ?? ""} c={actions} /> : <p style={{ color: "var(--ink-2)", margin: 0 }}>{c.planCovers(plan.name, plan.domains)}</p>}
        </div>
      </section>
    </DashboardShell>
  );
}
