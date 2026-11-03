import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { traceDetail } from "@/lib/agents/otlp";
import { duration, when } from "@/lib/agents/format";
export const metadata: Metadata = { title: "Trace", robots: { index: false, follow: false } };
export const runtime = "nodejs";
export default async function Page({ params, searchParams }: { params: Promise<{ traceId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { traceId } = await params; const account = await requireAccount(`/app/fleet/telemetry/${encodeURIComponent(traceId)}`);
  const requested = Number((await searchParams).page ?? 1); const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested,100000) : 1;
  const trace = traceDetail(account.email,traceId,(page-1)*200); if (!trace) notFound();
  const lang = dashLang(account.lang); const de = lang === "de";
  return <DashboardShell account={account} area="fleet" title="Trace">
    <section className="shell section" style={{ paddingTop: 32 }}>
      <Link href="/app/fleet/telemetry">← OpenTelemetry</Link>
      <p>{de ? "Zeitliche Reihenfolge; Eltern-IDs verbinden Dienste. IDs werden pro Account gehasht. Ein Eltern-Span kann fehlen oder auf einer anderen Seite stehen." : "Chronological order; parent IDs connect services. IDs are hashed per account. A parent span may be missing or on another page."}</p>
      <div className="tablewrap"><table><thead><tr>{(de ? ["Start", "Dienst / Version", "Operation", "Dauer", "Status", "Modell / Tool", "Tokens ein / aus", "Span / Eltern-ID"] : ["Started", "Service / version", "Operation", "Duration", "Status", "Model / tool", "Tokens in / out", "Span / parent ID"]).map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{trace.spans.map(s => <tr key={s.id} id={`span-${s.id}`}><td>{when(s.startedAt,lang)}</td><td>{s.service}<small style={{ display:"block" }}>{s.version}</small></td><td>{s.operation}</td><td>{duration(s.endedAt-s.startedAt)}</td><td>{s.status === 2 ? (de ? "Fehler" : "Error") : s.status === 1 ? "OK" : (de ? "Unbekannt" : "Unset")}</td><td>{s.model ?? s.tool ?? "—"}</td><td>{s.inputTokens ?? "—"} / {s.outputTokens ?? "—"}</td><td><code>{s.id.slice(0,12)}</code>{s.parentId ? <small style={{ display:"block" }}>{trace.spans.some(p=>p.id===s.parentId) ? <a href={`#span-${s.parentId}`}>↳ {s.parentId.slice(0,12)}</a> : `↳ ${s.parentId.slice(0,12)}`}</small> : null}</td></tr>)}</tbody></table></div>
      <nav style={{ display:"flex",gap:20,marginTop:20 }}>{page>1 ? <Link href={`?page=${page-1}`}>{de?"Zurück":"Previous"}</Link>:null}<span>{trace.total} Spans</span>{page*200<trace.total ? <Link href={`?page=${page+1}`}>{de?"Weiter":"Next"}</Link>:null}</nav>
    </section>
  </DashboardShell>;
}
