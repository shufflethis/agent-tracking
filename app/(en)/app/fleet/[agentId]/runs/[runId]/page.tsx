import type { Snapshot } from "@/lib/agents/snapshot";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell, { Stat } from "@/components/DashboardShell";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { agentById, runTimeline, previousConfiguration } from "@/lib/agents/store";
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
  const snapshot = run.configJson ? JSON.parse(run.configJson) as Snapshot : null;
  const previousJson = previousConfiguration(account.email, agentId, run.startedAt);
  const previous = previousJson ? JSON.parse(previousJson) as Snapshot : null;
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
      {run.dataLoss ? <p role="status" className="chip partial" style={{ whiteSpace: "normal", maxWidth: "100%", lineHeight: 1.6 }}>{de ? "Diese Beobachtung oder Übertragung war begrenzt. Ereignisse können fehlen." : "This observation or delivery was limited. Events may be missing."}</p> : null}
      <h2>{de ? "Konfiguration" : "Configuration"}</h2>
      {snapshot ? <div className="card" style={{ padding: 20 }}>
        <p><strong>{previous ? (previous.fingerprint === snapshot.fingerprint ? (de ? "Gegenüber dem vorherigen erfassten Lauf unverändert" : "Unchanged from the previous captured run") : (de ? "Seit dem vorherigen erfassten Lauf geändert" : "Changed since the previous captured run")) : (de ? "Erste verfügbare Aufnahme" : "First available snapshot")}</strong></p>
        <p>CLI {snapshot.cliVersion} · Node {snapshot.nodeVersion} · {snapshot.mcpServers} MCP · {snapshot.plugins} Plugins</p>
        <p>{de ? "Konfigurierte Regeln (keine Aussage über wirksame Rechte)" : "Configured rules (not effective permissions)"}: {snapshot.allowRules} allow · {snapshot.askRules} ask · {snapshot.denyRules} deny</p>
        <ul>{snapshot.files.map(file => <li key={file.scope}>{({ user_settings: de ? "Benutzereinstellungen" : "User settings", project_settings: de ? "Projekteinstellungen" : "Project settings", local_settings: de ? "Lokale Einstellungen" : "Local settings", project_mcp: "Projekt-MCP", project_instructions: de ? "Projektanweisungen" : "Project instructions" } as Record<string,string>)[file.scope]}: {({ present: de ? "erfasst" : "captured", missing: de ? "nicht vorhanden" : "missing", unreadable: de ? "nicht lesbar" : "unreadable" } as Record<string,string>)[file.state]}{previous && previous.files.find(f => f.scope === file.scope)?.fingerprint !== file.fingerprint ? (de ? " · geändert" : " · changed") : ""}</li>)}</ul>
        <p>{de ? "Nur feste Quelldateien, Fingerabdrücke und Zähler. Inhalte, Regeln, Befehle und Zugangsdaten werden nicht übertragen. Mehrfach konfigurierte Einträge können mehrfach zählen." : "Fixed source files, fingerprints and counts only. Contents, rules, commands and credentials are not transmitted. Entries configured in several files may be counted more than once."}</p>
      </div> : <p>{de ? "Keine Konfigurationsaufnahme verfügbar. CLI 0.3.0 erfasst sie bei neuen Claude-Code-Sessions und Konfigurationsänderungen." : "No snapshot available. CLI 0.3.0 captures new Claude Code sessions and configuration changes."}</p>}
      <h2>{de ? "Session-Ablauf" : "Session timeline"}</h2>
      <p>{de ? "Ereignisse bleiben 30 Tage erhalten. Ältere Clients liefern keine Aufruf-IDs; dort fehlen Zuordnung und Tooldauer. Unteragent-IDs verbinden deren Start und Ende innerhalb dieser Session." : "Events are retained for 30 days. Older clients do not supply call IDs, so correlation and tool duration are unavailable. Subagent IDs link their start and end within this session."}</p>
      {!events.length ? <p>{de ? "Keine Ereignisse auf dieser Seite verfügbar." : "No events available on this page."}</p> : <div className="tablewrap"><table>
        <thead><tr>{(de ? ["Zeit", "Ereignis", "Tool / Unteragent", "Ergebnis", "Dauer"] : ["Time", "Event", "Tool / subagent", "Result", "Duration"]).map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{events.map(e => { const evidence = e.metadata ? JSON.parse(e.metadata) : null; const identity = e.callId ?? e.childId ?? evidence?.kernel?.processId; return <tr key={e.id}>
          <td><time dateTime={new Date(e.at).toISOString()}>{new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(e.at)}</time></td>
          <td>{eventLabel(e.type, lang)}</td>
          <td>{e.tool ?? (e.metadata && e.type === "kernel_event" ? ({ process_exec: de ? "Programmstart" : "Process exec", file_open: de ? "Dateiöffnung versucht" : "File open attempted", network_connect: de ? "Verbindung versucht" : "Connection attempted" } as Record<string,string>)[evidence?.kernel?.operation] ?? "—" : "—")}{identity ? <small style={{ display: "block" }} title={identity}>ID {identity.slice(0, 12)}</small> : null}</td>
          <td>{e.ok === null ? "—" : <span className={e.ok ? "chip pass" : "chip fail"}>{e.ok ? (de ? "Erfolgreich" : "Succeeded") : (de ? "Fehlgeschlagen" : "Failed")}</span>}</td>
          <td>{duration(e.durationMs) || "—"}</td>
        </tr>; })}</tbody>
      </table></div>}
      <nav aria-label={de ? "Ablaufseiten" : "Timeline pages"} style={{ display: "flex", gap: 20, marginTop: 20 }}>
        {page > 1 ? <Link href={`${base}?page=${page - 1}`}>{de ? "Zurück" : "Previous"}</Link> : null}
        <span>{de ? "Ereignisse" : "Events"}: {total}</span>
        {page * 200 < total ? <Link href={`${base}?page=${page + 1}`}>{de ? "Weiter" : "Next"}</Link> : null}
      </nav>
    </section>
  </DashboardShell>;
}
