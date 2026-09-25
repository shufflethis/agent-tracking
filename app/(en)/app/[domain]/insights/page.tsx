import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import InsightsPanel from "@/components/InsightsPanel";
import { requireSite } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { planFor } from "@/lib/tracking/plans";
import { loadInsights } from "@/lib/tracking/insights-loader";
import { taskFixesFor } from "@/lib/tracking/task-fixes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Insights", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang), de = lang === "de", days = Math.min(planFor(account.plan).windowDays, 30);
  const items = loadInsights(site, lang, days, site.owner === account.email);
  const fixes = taskFixesFor(site.domain);
  const resultLabel = (value: string | null) => value === "passed" ? (de ? "bestanden" : "passed") : value === "failed" ? (de ? "gescheitert" : "failed") : value === "timed_out" ? (de ? "Zeitlimit erreicht" : "timed out") : (de ? "offen" : "pending");
  const base = `/app/${encodeURIComponent(site.domain)}`;
  return <DashboardShell account={account} site={site} view="insights"><div className="shell section" style={{ display: "grid", gap: 24 }}>
    <InsightsPanel items={items} lang={lang} domain={site.domain} days={days} />
    <section className="card" style={{ padding: 28 }} id="learning">
      <p className="eyebrow">{de ? "Erkenntnisse" : "Findings & fixes"}</p>
      <h2>{de ? "Was hat auf deiner Website geholfen?" : "What helped on your website?"}</h2>
      <p>{de ? "Die letzten dokumentierten Änderungen mit ihren tatsächlichen Vorher-/Nachher-Läufen, unabhängig vom Insights-Zeitraum. Jeder Vergleich enthält einen Lauf je Zustand; er belegt keine allgemeine Erfolgsquote." : "The latest documented changes with their actual before/after runs, independent of the Insights period. Each comparison contains one run per state; it does not establish a general success rate."}</p>
      {fixes.length ? fixes.map(fix => <article key={fix.fixId} style={{ borderTop: "1px solid var(--rule)", marginTop: 18, paddingTop: 18 }}>
        <h3>{fix.description}</h3>
        <p>{fix.outcome === "confirmed_by_browser_retest" ? (de ? "Nachtest bestanden bei vergleichbaren Testbedingungen" : "Retest passed under comparable test conditions") : (de ? "Wirkung der Korrektur nicht bestätigt" : "Effect of the fix not confirmed")}</p>
        <p>{de ? "Vorher / Nachher" : "Before / after"}: <code>{resultLabel(fix.before.result)}</code> → <code>{resultLabel(fix.after.result)}</code></p>
        <p>{fix.comparison === "conditions_changed" ? (de ? "Testbedingungen geändert; Ergebnisse nicht direkt vergleichbar." : "Test conditions changed; results are not directly comparable.") : (de ? "Gleiche Aufgabe, Zieladresse, Testart und Modellversion." : "Same task, target, test mode, and model version.")}</p>
        <p><Link href={`${base}/tests#fix-${fix.fixId}`}>{de ? "Testbelege und Versionen ansehen" : "View test evidence and versions"} →</Link></p>
      </article>) : <p>{de ? "Hier entsteht die Geschichte deiner überprüften Änderungen. Verknüpfe einen Fehlerlauf mit einer Korrektur und einem Nachtest, um den ersten Fall festzuhalten." : "Your record of checked changes starts here. Link a failed run to a correction and a retest to document your first case."}</p>}
      <p><Link href={`${base}/tests`}>{de ? "Korrektur und Nachtest dokumentieren" : "Document a fix and retest"} →</Link></p>
    </section>
  </div></DashboardShell>;
}
