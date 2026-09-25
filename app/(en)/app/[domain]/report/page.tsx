import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import FindingEditor from "@/components/FindingEditor";
import { requireSite } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { siteReport } from "@/lib/tracking/site-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Site report", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang);
  const report = siteReport(site.domain)!;
  const owner = site.owner === account.email;
  return <DashboardShell account={account} site={site} view="report"><style>{`@media print { nav, button, form, .report-actions { display: none !important; } .card { break-inside: avoid; } }`}</style><section className="shell section" style={{ display: "grid", gap: 18 }}>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Site-Bericht" : "Site report"}</h2><p>{site.domain} · {report.generatedAt}</p><p className="report-actions"><a href={`/api/report/${encodeURIComponent(site.domain)}`}>{lang === "de" ? "JSON exportieren" : "Export JSON"}</a> · {lang === "de" ? "Über das Browser-Menü drucken" : "Print from your browser menu"}</p></div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Messabdeckung" : "Measurement coverage"}</h2><ul><li>Snippet: {report.coverage.snippetVerified ? "verified" : "not verified"}</li><li>Beacon: {report.coverage.firstAcceptedBeaconAt ?? "none"}</li><li>Logs: {report.coverage.logSourceFresh ? "fresh" : "stale / missing"}</li><li>{lang === "de" ? "Abschlussquelle" : "Outcome source"}: {report.coverage.outcomeSourceConfigured ? "configured" : "not configured"}</li><li>{lang === "de" ? "Browser-Versuche" : "Browser attempts"}: {report.coverage.browserGoalAttempts}</li><li>{lang === "de" ? "Serverabschlüsse" : "Server outcomes"}: {report.coverage.serverOutcomes.confirmed} / {report.coverage.serverOutcomes.reports} {lang === "de" ? "Belege" : "receipts"}</li></ul><p>{report.definitions.retest}</p></div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Befunde → Korrektur → Nachtest" : "Findings → fix → retest"}</h2>
      {report.findings.length ? report.findings.map((finding) => <article id={`finding-${finding.findingId}`} key={finding.findingId} style={{ borderTop: "1px solid var(--rule)", paddingTop: 16, marginTop: 16 }}><h3>{finding.category}: {finding.status}</h3><p>{finding.description}</p><p>{lang === "de" ? "Rezeptvorschlag" : "Recipe suggestion"}: {finding.recipeId ?? "–"} · {finding.status === "retest_confirmed" ? (lang === "de" ? "Kundenfall nachgetestet" : "Site case retested") : (lang === "de" ? "nicht bestätigt" : "not confirmed")}</p><p>{lang === "de" ? "Evidenz" : "Evidence"}: {finding.evidenceRefs.join(", ")}; Run: <code>{finding.taskRunId}</code></p><p>{lang === "de" ? "Verantwortlich" : "Assignee"}: {finding.assignee ?? "–"}</p><p>{lang === "de" ? "Korrektur" : "Correction"}: {finding.correction ?? "–"}; Fix: {finding.fixId ?? "–"}; {lang === "de" ? "Nachtest" : "Retest"}: {finding.retestRunId ?? "–"}</p>{owner && <FindingEditor domain={site.domain} runs={report.runs.map((r) => r.runId)} fixes={report.fixes.map((f) => f.fixId)} initial={finding} lang={lang} />}</article>) : <p>{lang === "de" ? "Noch keine Befunde." : "No findings yet."}</p>}
      {owner && <><h3>{lang === "de" ? "Neuer Befund" : "New finding"}</h3><FindingEditor domain={site.domain} runs={report.runs.map((r) => r.runId)} fixes={report.fixes.map((f) => f.fixId)} lang={lang} /></>}
    </div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Offene Punkte" : "Open points"}</h2>{report.openPoints.length ? <ul>{report.openPoints.map((f) => <li key={f.findingId}>{f.status}: {f.description}</li>)}</ul> : <p>–</p>}<p><Link href={`/app/${encodeURIComponent(site.domain)}/tests`}>{lang === "de" ? "Alle Testläufe" : "All task runs"}</Link></p></div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? `Allgemeine Rezeptvorschläge · Katalog v${report.recipeCatalog.version}` : `General recipe suggestions · catalog v${report.recipeCatalog.version}`}</h2><p>{lang === "de" ? "Die Vorschläge enthalten keine Kundendaten und behaupten keine bestätigten Erfolge." : "Suggestions contain no client data and do not claim confirmed successes."}</p><ul>{report.recipeCatalog.suggestions.map((recipe) => <li key={recipe.id}><strong>{recipe.title}</strong> ({recipe.category}, v{recipe.version})<p>{recipe.suggestedChange}</p><p>{lang === "de" ? "Prüfung" : "Verify"}: {recipe.verify}</p></li>)}</ul></div>
  </section></DashboardShell>;
}
