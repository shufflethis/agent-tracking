import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { requireSite } from "@/lib/tracking/auth";
import { clampDays } from "@/lib/tracking/stats-api";
import { mcpInvocation } from "@/lib/tracking/mcp-analytics";

export const metadata: Metadata = { title: "MCP timeline", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ params, searchParams }: { params: Promise<{ domain: string; invocation: string }>; searchParams: Promise<{ days?: string }> }) {
  const { domain, invocation } = await params;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const days = clampDays((await searchParams).days, account);
  const detail = mcpInvocation(site.domain, invocation, days);
  if (!detail) notFound();
  const { call, outcomes } = detail, de = account.lang === "de";
  const entries = [
    { id: "call", at: call.occurredAt, received: call.receivedAt, label: call.toolName, status: call.technicalOutcome, kind: "tool" },
    ...outcomes.map(o => ({ id: o.receiptId, at: o.occurredAt, received: o.receivedAt, label: o.kind, status: o.status, kind: "receipt" })),
  ].sort((a, b) => a.at - b.at || a.received - b.received || a.id.localeCompare(b.id));
  return <DashboardShell account={account} site={site} view="tools"><section className="shell section">
    <p><Link href={`/app/${encodeURIComponent(site.domain)}/tools?days=${days}&environment=${call.environment}#mcp-recent`}>← {de ? "Zurück zu den Aufrufen" : "Back to calls"}</Link></p>
    <h1>{de ? "MCP-Ablauf" : "MCP timeline"}: {call.toolName}</h1>
    <p>{call.environment} · {de ? "Version" : "Version"}: {call.pluginVersion ?? (de ? "unbekannt" : "unknown")} · {call.durationMs === null ? (de ? "Laufzeit unbekannt" : "Duration unknown") : `${call.durationMs} ms`} · {call.errorClass ?? (de ? "Keine Fehlerklasse gemeldet" : "No error class reported")}</p>
    <p style={{ overflowWrap: "anywhere" }}>{de ? "Aufruf-ID" : "Invocation ID"}: <code>{call.invocationId}</code></p>
    <p>{de ? "Der technische Ausgang und die Ergebnisbelege sind getrennte Servermeldungen. Fehlende Schritte werden nicht ergänzt. Uhrzeiten stammen vom meldenden Server und können abweichen; Empfangszeiten zeigen verspätete Meldungen. Diese Ansicht ist kein Gesprächsprotokoll." : "Technical outcomes and outcome receipts are separate server reports. Missing steps are not inferred. Times come from the reporting server and may differ; receipt times show late reports. This view is not a conversation transcript."}</p>
    <ol style={{ display: "grid", gap: 20 }}>{entries.map(entry => <li key={entry.id} className="card" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 20 }}>{entry.label}</h2><p><strong>{entry.status}</strong> · {entry.kind === "tool" ? (de ? "Tool-Aufruf" : "Tool call") : (de ? "Ergebnisbeleg" : "Outcome receipt")}</p>
      <p>{de ? "Ereigniszeit" : "Event time"}: <time dateTime={new Date(entry.at).toISOString()}>{new Date(entry.at).toISOString()}</time><br />{de ? "Empfangen" : "Received"}: {new Date(entry.received).toISOString()}</p>
      {entry.kind !== "tool" && <p style={{ overflowWrap: "anywhere" }}><code>{entry.id}</code></p>}
    </li>)}</ol>
    {!outcomes.length && <p>{de ? "Kein exakt verknüpfter Ergebnisbeleg vorhanden. Der Geschäftsausgang ist unbekannt, auch wenn das Tool erfolgreich war." : "No exactly linked outcome receipt exists. The business outcome is unknown even if the tool completed."}</p>}
    {detail.truncated && <p>{de ? "Die Ansicht ist auf 100 Ergebnisbelege begrenzt." : "The view is limited to 100 outcome receipts."}</p>}
    <p>{de ? "Ein PDF-Abruf bestätigt die Auslieferung, nicht das Lesen. Der Akteur wird nur vom Site-Server gemeldet; eine unabhängige Agentenverifikation liegt nicht vor." : "A PDF fetch confirms delivery, not reading. The actor is reported by the site server only; there is no independent agent verification."}</p>
  </section></DashboardShell>;
}
