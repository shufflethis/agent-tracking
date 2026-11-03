import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { traceList } from "@/lib/agents/otlp";
import { duration, when } from "@/lib/agents/format";
import { SITE_ORIGIN } from "@/lib/site";
export const metadata: Metadata = { title: "OpenTelemetry", robots: { index: false, follow: false } };
export const runtime = "nodejs";
export default async function Page() {
  const account = await requireAccount("/app/fleet/telemetry"); const lang = dashLang(account.lang); const de = lang === "de";
  const traces = traceList(account.email);
  return <DashboardShell account={account} area="fleet" title="OpenTelemetry">
    <section className="shell section" style={{ paddingTop: 32 }}>
      <Link href="/app/fleet">← {de ? "Deine Agents" : "Your agents"}</Link>
      <p className="dek">{de ? "Zusammenhängende Abläufe über Dienste hinweg. Angezeigt werden gemeldete Zeitspannen, Beziehungen, Status und ausgewählte Metadaten." : "Connected workflows across services. Displays reported spans, relationships, status and selected metadata."}</p>
      <p>{de ? "Letzte 100 Traces, 30 Tage Aufbewahrung. Ein erfolgreicher Span bestätigt kein Aufgabenergebnis. Fehlende oder verspätete Spans können den Ablauf unvollständig machen." : "Latest 100 traces, 30-day retention. A successful span does not verify a task outcome. Missing or delayed spans can leave traces incomplete."}</p>
      {traces.length ? <div className="tablewrap"><table><thead><tr>{(de ? ["Start", "Dauer", "Spans", "Dienste", "Fehler"] : ["Started", "Duration", "Spans", "Services", "Errors"]).map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{traces.map(t => <tr key={t.id}><td><Link href={`/app/fleet/telemetry/${t.id}`}>{when(t.startedAt,lang)}</Link></td><td>{duration(t.durationMs)}</td><td>{t.spans}</td><td>{t.services}</td><td>{t.errors}</td></tr>)}</tbody></table></div> : <p>{de ? "Noch keine Traces empfangen." : "No traces received yet."}</p>}
      <h2>{de ? "Dienst verbinden" : "Connect a service"}</h2>
      <p>{de ? "Nutze ein widerrufbares Agent-Token aus der CLI-Geräteanmeldung und einen Exporter mit OTLP/HTTP JSON. Maximal 100 Spans pro Batch; keine Kompression. Traces teilen sich das monatliche Agent-Kontingent." : "Use a revocable agent token from CLI device login and an exporter supporting OTLP/HTTP JSON. Maximum 100 spans per batch; no compression. Traces share the monthly agent quota."}</p>
      <pre className="code" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=${SITE_ORIGIN}/api/agents/otlp/v1/traces\nOTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json\nOTEL_EXPORTER_OTLP_TRACES_COMPRESSION=none\nOTEL_BSP_MAX_EXPORT_BATCH_SIZE=100\nOTEL_EXPORTER_OTLP_TRACES_HEADERS=Authorization=Bearer <AGENT_TOKEN>`}</pre>
      <p>{de ? "Der Token bleibt auf deinem Server. Protobuf, gRPC, Metriken und Logs werden an diesem Endpunkt nicht angenommen. Entferne sensible Attribute vor dem Export: Der Empfänger speichert nur erlaubte Felder, verhindert aber keine Übertragung durch deinen Exporter." : "Keep the token on your server. This endpoint does not accept Protobuf, gRPC, metrics or logs. Remove sensitive attributes before exporting: the receiver stores only allowed fields but cannot prevent your exporter from transmitting them."}</p>
    </section>
  </DashboardShell>;
}
