import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell, { Stat } from "@/components/DashboardShell";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { agentById, runTimeline } from "@/lib/agents/store";
import { runLabel, checkLabel, eventLabel } from "@/lib/agents/run-display";
import { duration, when } from "@/lib/agents/format";

export const metadata: Metadata = { title: "Session timeline", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params, searchParams }: { params: Promise<{ agentId: string; runId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { agentId, runId } = await params;
  const account = await requireAccount(`/app/fleet/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`);
  const requested = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100000) : 1;
  const agent = agentById(account.email, agentId);
  const timeline = runTimeline(account.email, agentId, runId, (page - 1) * 200);
  if (!agent || !timeline) notFound();
  const { run, events, total } = timeline;
  const lang = dashLang(account.lang); const de = lang === "de";
  const base = `/app/fleet/${agentId}/runs/${runId}`;
  return <DashboardShell account={account} area="fleet" title={agent.name}>
    <section className="shell section" style={{ paddingTop: 32 }}>
      <Link href={`/app/fleet/${agentId}`}>← {de ? "Alle Läufe" : "All runs"}</Link>
      <p>{agent.host} · {when(run.startedAt, lang)} · {duration(run.durationMs ?? (run.endedAt === null ? null : run.endedAt - run.startedAt))}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, margin: "24px 0" }}>
        <Stat label={de ? "Ausführung" : "Execution"} value={runLabel(run, lang)} />
        <Stat label={de ? "Aufgabenergebnis" : "Task result"} value={checkLabel(run, lang)} note={run.checkName ? `${run.checkName} · ${run.checkVersion}` : undefined} />
        <Stat label={de ? "Toolaufrufe" : "Tool calls"} value={String(run.toolCalls)} />
        <Stat label={de ? "Toolfehler" : "Tool errors"} value={String(run.toolErrors)} />
      </div>
      <p>{de ? "Beobachtete Ereignisse der verbundenen Maschine. Eine bestandene Prüfung ist deren Meldung, keine unabhängige Verifikation. Ohne Prüfung bleibt das Aufgabenergebnis ungeprüft." : "Observed events from the connected machine. A passed check is its report, not independent verification. Without a check, the task result remains unchecked."}</p>
      {run.dataLoss ? <p role="status" className="chip partial" style={{ whiteSpace: "normal", maxWidth: "100%", lineHeight: 1.6 }}>{de ? "Die lokale Warteschlange hat Ereignisse verworfen. Dieser Ablauf kann unvollständig sein." : "The local queue discarded events. This timeline may be incomplete."}</p> : null}
      <h2>{de ? "Session-Ablauf" : "Session timeline"}</h2>
      <p>{de ? "Ereignisse bleiben 30 Tage erhalten. Ältere Clients liefern keine Aufruf-IDs; dort fehlen Zuordnung und Tooldauer. Unteragent-IDs verbinden deren Start und Ende innerhalb dieser Session." : "Events are retained for 30 days. Older clients do not supply call IDs, so correlation and tool duration are unavailable. Subagent IDs link their start and end within this session."}</p>
      {!events.length ? <p>{de ? "Keine Ereignisse auf dieser Seite verfügbar." : "No events available on this page."}</p> : <div className="tablewrap"><table>
        <thead><tr>{(de ? ["Zeit", "Ereignis", "Tool / Unteragent", "Ergebnis", "Dauer"] : ["Time", "Event", "Tool / subagent", "Result", "Duration"]).map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{events.map(e => <tr key={e.id}>
          <td><time dateTime={new Date(e.at).toISOString()}>{new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(e.at)}</time></td>
          <td>{eventLabel(e.type, lang)}</td>
          <td>{e.tool ?? "—"}{e.callId || e.childId ? <small style={{ display: "block" }} title={e.callId ?? e.childId ?? ""}>ID {(e.callId ?? e.childId)?.slice(0, 12)}</small> : null}</td>
          <td>{e.ok === null ? "—" : <span className={e.ok ? "chip pass" : "chip fail"}>{e.ok ? (de ? "Erfolgreich" : "Succeeded") : (de ? "Fehlgeschlagen" : "Failed")}</span>}</td>
          <td>{duration(e.durationMs) || "—"}</td>
        </tr>)}</tbody>
      </table></div>}
      <nav aria-label={de ? "Ablaufseiten" : "Timeline pages"} style={{ display: "flex", gap: 20, marginTop: 20 }}>
        {page > 1 ? <Link href={`${base}?page=${page - 1}`}>{de ? "Zurück" : "Previous"}</Link> : null}
        <span>{de ? "Ereignisse" : "Events"}: {total}</span>
        {page * 200 < total ? <Link href={`${base}?page=${page + 1}`}>{de ? "Weiter" : "Next"}</Link> : null}
      </nav>
    </section>
  </DashboardShell>;
}
