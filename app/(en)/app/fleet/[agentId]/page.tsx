import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { agentCopy } from "@/lib/agents/copy";
import { CLI_COMMAND, duration, every, STATUS_CHIP, when } from "@/lib/agents/format";
import { agentById, agentRuns, checkComparisons } from "@/lib/agents/store";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Agent", robots: { index: false, follow: false } };
export const runtime = "nodejs";

import { runLabel, checkLabel } from "@/lib/agents/run-display";

const PROBLEM = new Set(["failed", "hung", "missed"]);

export default async function Page({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const account = await requireAccount(`/app/fleet/${encodeURIComponent(agentId)}`);
  const agent = agentById(account.email, agentId);
  const runs = agent ? agentRuns(account.email, agentId) : null;
  if (!agent || !runs) redirect("/app/fleet");
  const lang = dashLang(account.lang);
  const c = agentCopy(lang).fleet;
  const comparisons = checkComparisons(account.email, agentId);
  const de = lang === "de";

  return (
    <DashboardShell account={account} area="fleet" title={agent.name}>
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p style={{ marginTop: 0 }}>
          <Link href="/app/fleet">← {c.back}</Link>
          <span style={{ color: "var(--muted)", marginLeft: 12 }}>
            {c.kinds[agent.kind]} · {agent.host}{agent.expectEveryMs ? ` · ${c.expected(every(agent.expectEveryMs))}` : ""}
          </span>
        </p>
        <p style={{ color: "var(--ink-2)" }}>{de ? "Ein beendeter Lauf bestätigt kein Aufgabenergebnis. Prüfungen werden vom verbundenen Rechner anhand des Exit-Codes gemeldet. Klicke auf einen Startzeitpunkt für den Ablauf." : "A completed run does not confirm a task outcome. Checks are reported by the connected machine using the exit code. Select a start time to inspect the timeline."}</p>
        <h2 style={{ fontSize: 22 }}>{c.runs}</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>{c.runCols.started}</th><th>{c.runCols.duration}</th><th>{c.runCols.status}</th><th>{de ? "Aufgabenergebnis" : "Task result"}</th><th>{c.runCols.detail}</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/app/fleet/${agentId}/runs/${r.id}`}>{when(r.startedAt, lang)}</Link></td>
                  <td>{duration(r.durationMs ?? (r.endedAt ? r.endedAt - r.startedAt : null))}</td>
                  <td><span className={STATUS_CHIP[r.status]}>{runLabel(r, lang)}</span></td>
                  <td>{checkLabel(r, lang)}{r.checkName ? <small style={{ display: "block" }}>{r.checkName} · {r.checkVersion}</small> : null}</td>
                  <td>
                    {r.dataLoss ? <p className="chip partial">{de ? "Datenlücke gemeldet" : "Data loss reported"}</p> : null}
                    {agent.kind === "claude" ? c.detail(r.turns, r.toolCalls, r.toolErrors) : c.exit(r.exitCode)}
                    {r.tail && PROBLEM.has(r.status) ? <pre className="code" style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12 }}>{r.tail}</pre> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2 style={{ marginTop: 32 }}>{de ? "Prüfungen nach Version" : "Checks by version"}</h2>
        <p>{de ? "Letzte 90 Tage. Vergleiche dieselbe Aufgabe mit denselben Testdaten und Bedingungen. Ein einzelner Lauf belegt keine Verbesserung." : "Last 90 days. Compare the same task with the same fixtures and conditions. One run does not establish an improvement."}</p>
        {comparisons.length ? <div className="tablewrap"><table>
          <thead><tr>{(de ? ["Prüfung", "Version", "Bestanden / Läufe", "Ø Dauer", "Mit Datenlücken"] : ["Check", "Version", "Passed / runs", "Mean duration", "With data gaps"]).map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{comparisons.map(row => <tr key={`${row.name}:${row.version}`}><td>{row.name}</td><td>{row.version}</td><td>{row.passed} / {row.samples}</td><td>{duration(row.durationMs) || "—"}</td><td>{row.incomplete}</td></tr>)}</tbody>
        </table></div> : <p>{de ? "Noch keine benannten Prüfungen. Ein Prüfskript muss das erwartete Ergebnis kontrollieren und bei Abweichungen mit einem Fehlercode enden." : "No named checks yet. A check script must assert the expected result and exit nonzero on a mismatch."}</p>}
        <pre className="code" style={{ whiteSpace: "pre-wrap" }}>{`${CLI_COMMAND} wrap --name evaluation --check booking --version v1 -- ./check-booking.sh`}</pre>
      </section>
    </DashboardShell>
  );
}
