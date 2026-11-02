import Link from "next/link";
import { MCP_WARNING_RULES, mcpWarnings, type MCPMetric, type MCPInvocation, type MCPEnvironment } from "@/lib/tracking/mcp-analytics";

const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
export default function MCPAnalyticsPanel({ domain, days, environment, rows, recent, lang, tool, before, after }: {
  domain: string; days: number; environment: MCPEnvironment; rows: MCPMetric[]; recent: MCPInvocation[];
  lang: "de" | "en"; tool?: string; before?: string; after?: string;
}) {
  const de = lang === "de", base = `/app/${encodeURIComponent(domain)}/tools`;
  const warnings = mcpWarnings(rows), tools = [...new Set(rows.map(row => row.toolName))].sort();
  const selectedTool = tools.includes(tool ?? "") ? tool! : tools[0];
  const versions = rows.filter(row => row.toolName === selectedTool && row.pluginVersion !== null);
  const first = before ? versions.find(row => row.pluginVersion === before) : versions[0];
  const second = after ? versions.find(row => row.pluginVersion === after) : versions.find(row => row !== first);
  const metrics: [string, (row: MCPMetric) => string | number][] = [
    [de ? "Aufrufe (Stichprobe)" : "Calls (sample)", row => row.calls],
    [de ? "Fehler + Timeouts" : "Failures + timeouts", row => `${row.failed + row.timedOut} / ${row.calls} (${percent(row.failureRate)})`],
    [de ? "Technisch erfolgreich" : "Technically completed", row => `${row.completed} / ${row.calls} (${percent(row.completed / row.calls)})`],
    [de ? "Unbekannter technischer Ausgang" : "Unknown technical outcome", row => `${row.unknown} / ${row.calls} (${percent(row.unknownRate)})`],
    [de ? "Abgebrochen" : "Cancelled", row => row.cancelled],
    [de ? "p95 / gemessene Laufzeiten" : "p95 / duration samples", row => `${row.p95Ms === null ? "—" : `${row.p95Ms} ms`} / ${row.durationSamples}`],
    [de ? "Aufrufe mit PDF-Erstellung" : "Calls with PDF creation", row => row.pdfCreated],
    [de ? "Aufrufe mit PDF-Auslieferung" : "Calls with PDF delivery", row => row.pdfFetched],
    [de ? "Aufrufe mit Anfrage / Buchung" : "Calls with inquiry / booking", row => row.businessResults],
  ];
  return <section className="card" id="mcp-analytics" style={{ padding: 24, marginBottom: 28 }}>
    <h2>{de ? "ChatGPT & MCP: Aufrufe und Ergebnisse" : "ChatGPT & MCP: calls and outcomes"}</h2>
    <p>{de ? "Servermeldungen mit exakt verknüpften Ergebnisbelegen. Fehlende Belege bedeuten unbekannt; ein PDF-Abruf bestätigt kein Lesen. Client-Kennungen beweisen keine Agentenidentität." : "Server reports with exactly linked outcome receipts. Missing receipts mean unknown; a PDF fetch does not prove reading. Client identifiers do not prove agent identity."}</p>
    <p>{days} {de ? "Tage" : "days"} · <Link href={`?days=${days}&environment=production`} aria-current={environment === "production" ? "page" : undefined}>{de ? "Produktion" : "Production"}</Link> · <Link href={`?days=${days}&environment=test`} aria-current={environment === "test" ? "page" : undefined}>{de ? "Testdaten" : "Test data"}</Link> — {environment}</p>
    <h3>{de ? "Warnungen" : "Warnings"}</h3>
    <p style={{ fontSize: 13 }}>{de ? `Feste Schwellen im gewählten Zeitraum: mindestens ${MCP_WARNING_RULES.minimumCalls} Aufrufe, mindestens ${MCP_WARNING_RULES.minimumFailures} Fehler/Timeouts und mindestens 10 % Fehlerquote; oder p95 ≥ 5.000 ms bei mindestens 20 gemessenen Laufzeiten. p95 ist die Grenze, unter der mindestens 95 % der gemessenen Laufzeiten liegen. Warnungen erscheinen im Dashboard; sie werden nicht extern versendet.` : "Fixed thresholds in the selected window: at least 20 calls, at least 3 failures/timeouts and at least 10% failure rate; or p95 ≥ 5,000 ms across at least 20 measured durations. p95 is the threshold covering at least 95% of measured durations. Warnings appear in the dashboard; they are not sent externally."}</p>
    {warnings.length ? <ul>{warnings.map(warning => <li key={`${warning.kind}:${warning.metric.toolName}:${warning.metric.pluginVersion}`}><strong>{warning.metric.toolName} · {warning.metric.pluginVersion ?? "?"}</strong>: {warning.kind === "errors" ? `${warning.metric.failed + warning.metric.timedOut} / ${warning.metric.calls} (${percent(warning.metric.failureRate)}) ${de ? "Fehler/Timeouts" : "failures/timeouts"}` : `p95 ${warning.metric.p95Ms} ms (${warning.metric.durationSamples} ${de ? "Messungen" : "samples"})`} — <Link href="#mcp-recent">{de ? "Aufrufe untersuchen" : "Inspect calls"}</Link></li>)}</ul> : <p>{de ? "Keine Schwelle überschritten. Bei kleinen Stichproben oder fehlenden Laufzeiten ist keine belastbare Warnung möglich." : "No threshold crossed. Small samples or missing durations cannot support a reliable warning."}</p>}
    <div className="tablewrap"><table><thead><tr>{[de ? "Tool / Version" : "Tool / version", de ? "Aufrufe" : "Calls", de ? "Erfolgreich" : "Completed", de ? "Fehler / Abbruch / Timeout / unbekannt" : "Failed / cancelled / timeout / unknown", "Ø ms", "p95 ms", de ? "PDF erstellt" : "PDF created", de ? "PDF abgerufen" : "PDF fetched", de ? "Anfragen / Buchungen" : "Inquiries / bookings"].map(label => <th key={label}>{label}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(row => <tr key={JSON.stringify([row.toolName, row.pluginVersion])}><td>{row.toolName}<br /><small>{row.pluginVersion ?? (de ? "Version unbekannt" : "Version unknown")}</small></td><td>{row.calls}</td><td>{row.completed}</td><td>{row.failed} / {row.cancelled} / {row.timedOut} / {row.unknown}</td><td>{row.avgMs ?? "—"}</td><td>{row.p95Ms ?? "—"} <small>({row.durationSamples})</small></td><td>{row.pdfCreated}</td><td>{row.pdfFetched}</td><td>{row.businessResults}</td></tr>) : <tr><td colSpan={9}>{de ? "Noch keine Servermeldungen in dieser Umgebung." : "No server reports in this environment yet."}</td></tr>}</tbody></table></div>
    <h3 id="mcp-versions">{de ? "Versionen vergleichen" : "Compare versions"}</h3>
    <p>{de ? "Vergleiche dasselbe Tool in derselben Umgebung und im selben Empfangszeitraum. Unterschiede in Nutzung, Eingaben und Messabdeckung können die Zahlen verändern; dies ist kein Nachweis einer kausalen Verbesserung. Ergebniszahlen sind Aufrufe mit mindestens einem bestätigten Beleg, keine Conversion-Rate. Fehlende Belege bleiben unbekannt." : "Compare the same tool in the same environment and receipt-time window. Usage, inputs and coverage can change these numbers; this does not establish a causal improvement. Outcome counts are calls with at least one confirmed receipt, not conversion rates. Missing receipts remain unknown."}</p>
    {tools.length > 0 && <form method="get" action={`${base}#mcp-versions`} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
      <input type="hidden" name="days" value={days} /><input type="hidden" name="environment" value={environment} />
      <label>{de ? "Tool" : "Tool"}<select name="tool" defaultValue={selectedTool}>{tools.map(name => <option key={name}>{name}</option>)}</select></label>
      <label>{de ? "Version A" : "Version A"}<input name="before" list="mcp-version-options" defaultValue={first?.pluginVersion ?? ""} placeholder="1.0.2" maxLength={64} /></label>
      <label>{de ? "Version B" : "Version B"}<input name="after" list="mcp-version-options" defaultValue={second?.pluginVersion ?? ""} placeholder="1.0.3" maxLength={64} /></label>
      <button className="btn" type="submit">{de ? "Vergleichen" : "Compare"}</button>
    </form>}
    <datalist id="mcp-version-options">{versions.map(row => <option key={row.pluginVersion} value={row.pluginVersion!} />)}</datalist>
    {versions.length > 0 && <p>{de ? "Verfügbare Versionen" : "Available versions"}: {versions.map(row => row.pluginVersion).join(", ")}</p>}
    {first && second && first !== second ? <div className="tablewrap"><table><thead><tr><th>{selectedTool}</th><th>{first.pluginVersion}</th><th>{second.pluginVersion}</th></tr></thead><tbody>{metrics.map(([label, value]) => <tr key={label}><th>{label}</th><td>{value(first)}</td><td>{value(second)}</td></tr>)}</tbody></table></div> : <p>{de ? "Zwei verschiedene bekannte Versionen desselben Tools sind erforderlich. Historische Aufrufe ohne Version werden nicht einer Version zugerechnet." : "Two different known versions of the same tool are required. Historical calls without a version are not assigned to one."}</p>}
    <h3 id="mcp-recent">{de ? "Letzte Aufrufe – Ablauf öffnen" : "Recent calls – open timeline"}</h3>
    <p>{de ? "Bis zu 50 zuletzt empfangene Aufrufe. Die Detailansicht zeigt nur Belege mit derselben Site, Umgebung und Aufruf-ID." : "Up to 50 most recently received calls. Details show receipts with the same site, environment and invocation ID."}</p>
    <div className="tablewrap"><table><thead><tr>{[de ? "Empfangen (UTC)" : "Received (UTC)", "Tool", de ? "Version" : "Version", de ? "Ausgang" : "Outcome", "ms", de ? "Ergebnisbelege" : "Outcome receipts", de ? "Ablauf" : "Timeline"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{recent.length ? recent.map(call => <tr key={call.invocationId}><td>{new Date(call.receivedAt).toISOString()}</td><td>{call.toolName}</td><td>{call.pluginVersion ?? "—"}</td><td>{call.technicalOutcome}</td><td>{call.durationMs ?? "—"}</td><td>{call.outcomeReceipts}</td><td><Link href={`${base}/${encodeURIComponent(call.invocationId)}?days=${days}`}>{de ? "Öffnen" : "Open"} →</Link></td></tr>) : <tr><td colSpan={7}>{de ? "Keine Aufrufe im gewählten Zeitraum." : "No calls in the selected window."}</td></tr>}</tbody></table></div>
    <p><Link href={de ? "/de/docs#mcp-analytics" : "/docs#mcp-analytics"}>{de ? "MCP-Integration einrichten" : "Set up MCP tracking"}</Link></p>
  </section>;
}
