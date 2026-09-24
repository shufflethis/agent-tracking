import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import TaskRunForm from "@/components/TaskRunForm";
import { requireSite } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { taskRunsFor } from "@/lib/tracking/task-runs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Task tests", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const { site, account } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang);
  const runs = taskRunsFor(site.domain);
  return <DashboardShell account={account} site={site} view="tests"><section className="shell section" style={{ display: "grid", gap: 18 }}>
    <div className="card" style={{ padding: 28 }}>
      <h2>{lang === "de" ? "Kontrollierte Anfrageprüfung" : "Controlled inquiry check"}</h2>
      <p>{lang === "de" ? "Deterministische Chrome-Prüfung auf test. oder staging. der Site. Das Formular muss #agenttracking-test-form mit data-agenttracking-test=true haben und einen Erfolgsmarker data-agenttracking-success=true setzen. Verwende nur isolierte Testdaten und eine Strecke ohne echte Buchung oder Nachricht." : "Deterministic Chrome check on test. or staging. for this site. The form must have #agenttracking-test-form with data-agenttracking-test=true and set data-agenttracking-success=true on success. Use an isolated flow without real bookings or messages."}</p>
      <p>{lang === "de" ? "Modellgesteuerter Agententest: nicht eingerichtet. Ergebnisse hier sind keine fremden Agentenläufe und zählen nicht in Produktivkennzahlen." : "Model-driven agent test: not configured. These results are not third-party agent runs and do not enter production metrics."}</p>
      <TaskRunForm domain={site.domain} lang={lang} />
    </div>
    <div className="card" style={{ padding: 28 }}><h2>{lang === "de" ? "Laufverlauf" : "Run history"}</h2>
      {runs.length === 0 ? <p>{lang === "de" ? "Noch kein Lauf." : "No runs yet."}</p> : <div className="tablewrap"><table><thead><tr><th>Run ID</th><th>{lang === "de" ? "Ergebnis" : "Result"}</th><th>Release</th><th>{lang === "de" ? "Schritte" : "Steps"}</th></tr></thead><tbody>{runs.map((run) => <tr key={run.runId}><td><code>{run.runId}</code></td><td>{run.result ?? run.status}{run.errorClass ? ` (${run.errorClass})` : ""}</td><td>{run.releaseId ?? "–"}</td><td>{run.steps.join(" → ") || "–"}</td></tr>)}</tbody></table></div>}
    </div>
  </section></DashboardShell>;
}
