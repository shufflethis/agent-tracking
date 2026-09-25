import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import TaskRunForm from "@/components/TaskRunForm";
import TaskFixForm from "@/components/TaskFixForm";
import { requireSite } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { taskRunsFor } from "@/lib/tracking/task-runs";
import { siteVersionsFor, taskFixesFor } from "@/lib/tracking/task-fixes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Task tests", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang);
  const runs = taskRunsFor(site.domain);
  const fixes = taskFixesFor(site.domain);
  const versions = siteVersionsFor(site.domain);
  return <DashboardShell account={account} site={site} view="tests"><section className="shell section" style={{ display: "grid", gap: 18 }}>
    <div className="card" style={{ padding: 28 }}>
      <h2>{lang === "de" ? "Kontrollierte Anfrageprüfung" : "Controlled inquiry check"}</h2>
      <p>{lang === "de" ? "Deterministische Chrome-Prüfung auf test. oder staging. der Site. Das Formular muss #agenttracking-test-form mit data-agenttracking-test=true haben und einen Erfolgsmarker data-agenttracking-success=true setzen. Verwende nur isolierte Testdaten und eine Strecke ohne echte Buchung oder Nachricht." : "Deterministic Chrome check on test. or staging. for this site. The form must have #agenttracking-test-form with data-agenttracking-test=true and set data-agenttracking-success=true on success. Use an isolated flow without real bookings or messages."}</p>
      <p>{lang === "de" ? "Modellgesteuerter Agententest: nicht eingerichtet. Ergebnisse hier sind keine fremden Agentenläufe und zählen nicht in Produktivkennzahlen." : "Model-driven agent test: not configured. These results are not third-party agent runs and do not enter production metrics."}</p>
      {site.owner === account.email && <TaskRunForm domain={site.domain} lang={lang} />}
    </div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Laufverlauf" : "Run history"}</h2>
      {runs.length === 0 ? <p>{lang === "de" ? "Noch kein Lauf." : "No runs yet."}</p> : <div className="tablewrap"><table><thead><tr><th>Run ID</th><th>{lang === "de" ? "Ergebnis" : "Result"}</th><th>Release</th><th>{lang === "de" ? "Schritte" : "Steps"}</th></tr></thead><tbody>{runs.map((run) => <tr key={run.runId} id={`run-${run.runId}`}><td><code>{run.runId}</code></td><td>{run.result ?? run.status}{run.errorClass ? ` (${run.errorClass})` : ""}</td><td>{run.releaseId ?? "–"}</td><td>{run.steps.join(" → ") || "–"}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Korrektur und Nachtest" : "Fix and retest"}</h2>
      <p>{lang === "de" ? "Verknüpfe einen Fehlerlauf mit einer dokumentierten Korrektur und einem neuen Lauf derselben Aufgabe. Ein Vergleich zeigt nur die Testbeobachtung, keinen kausalen Umsatzgewinn." : "Link a failed run to a documented fix and a new run of the same task. Comparisons show test observations, not causal revenue gain."}</p>
      {site.owner === account.email && <TaskFixForm domain={site.domain} lang={lang} runIds={runs.filter((r) => r.status === "finished").map((r) => r.runId)} />}
      {fixes.map((fix) => <div id={`fix-${fix.fixId}`} key={fix.fixId} style={{ borderTop: "1px solid var(--rule)", marginTop: 20, paddingTop: 16 }}>
        <strong>{fix.description}</strong>
        <p>{fix.comparison === "controlled_browser_retest" ? (lang === "de" ? "Gleiche Aufgabe, URL, Modus und Modellversion" : "Same task, URL, mode and model version") : (lang === "de" ? "Testbedingungen geändert; kein kontrollierter Vergleich" : "Test conditions changed; not a controlled comparison")}</p>
        <p><code>{fix.before.runId}</code> {fix.before.result} ({fix.before.releaseId ?? "–"}) → <code>{fix.after.runId}</code> {fix.after.result} ({fix.after.releaseId ?? "–"})</p>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{lang === "de" ? "Tool" : "Tool"}: {fix.before.toolVersion ?? "–"} → {fix.after.toolVersion ?? "–"}; Schema: {fix.before.schemaVersion ?? "–"} → {fix.after.schemaVersion ?? "–"}; {lang === "de" ? "Ziel" : "Target"}: {fix.before.targetUrl === fix.after.targetUrl ? fix.before.targetUrl : `${fix.before.targetUrl} → ${fix.after.targetUrl}`}</p>
        <p>{lang === "de" ? "Stichprobe" : "Sample"}: {fix.sample.before} → {fix.sample.after}; {lang === "de" ? "unbekannter Anteil" : "unknown share"}: {fix.sample.beforeUnknown}/1 → {fix.sample.afterUnknown}/1. {fix.outcome === "confirmed_by_browser_retest" ? (lang === "de" ? "Durch Browser-Nachtest bestätigt" : "Confirmed by browser retest") : (lang === "de" ? "Nicht bestätigt" : "Not confirmed")}</p>
      </div>)}
    </div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Beobachtete Versionen" : "Observed versions"}</h2>
      {versions.length ? <ul>{versions.map((version) => <li key={`${version.kind}:${version.versionId}`}>{version.kind}: <code>{version.versionId}</code> ({new Date(version.firstSeenAt).toISOString()} – {new Date(version.lastSeenAt).toISOString()})</li>)}</ul> : <p>–</p>}
    </div>
  </section></DashboardShell>;
}
