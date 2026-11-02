import Link from "next/link";

const setup = `import { MCPTracking } from "./lib/agenttracking-mcp";

const tracking = new MCPTracking({
  origin: "https://agenttracking.co",
  domain: "example.com", // your registered domain
  toolToken: process.env.TRACKING_TOOL_TOKEN!,
  outcomeToken: process.env.TRACKING_OUTCOME_TOKEN!,
  pluginVersion: "1.0.2",
  environment: process.env.TRACKING_ENVIRONMENT === "production"
    ? "production" : "test",
});`;
const wrap = `// Keep the existing descriptor and business logic.
server.registerTool("calculate_quote", calculateDescriptor,
  tracking.wrap("calculate_quote", calculateQuoteHandler)
);

server.registerTool("create_quote_pdf", pdfDescriptor,
  tracking.wrap("create_quote_pdf", async (args, extra, context) => {
    // Save context.invocationId with the PDF in your backend.
    const pdf = await createAndSavePdf(args, context);
    const delivered = await tracking.outcome({
      ...context,
      receiptId: "created_" + context.invocationId,
      kind: "pdf_created",
      occurredAt: Date.now(),
    });
    // If false, retry a durably stored copy of this same receipt.
    return { structuredContent: { downloadUrl: pdf.downloadUrl } };
  })
);`;
const fetchReceipt = `// After your backend confirms a successful full GET delivery:
await tracking.outcome({
  invocationId: pdf.trackingInvocationId,
  receiptId: storedDelivery.id, // opaque ID, 16–64 characters
  kind: "pdf_fetched",
  occurredAt: storedDelivery.deliveredAt, // milliseconds, unchanged on retry
});`;

export default function MCPSetupGuide({ lang }: { lang: "de" | "en" }) {
  const de = lang === "de";
  return <section className="shell section" id="mcp-analytics">
    <h2>{de ? "ChatGPT-Plugin und MCP-Server mit AgentTracking verbinden" : "Connect a ChatGPT plugin or MCP server to AgentTracking"}</h2>
    <p className="dek">{de ? "Die Integration läuft in deinem Node.js-/TypeScript-MCP-Server. Das Website-Snippet allein erfasst keine externen MCP-Aufrufe. Du kannst schon vor der Veröffentlichung mit einem privat verbundenen Plugin testen." : "The integration runs in your Node.js/TypeScript MCP server. The website snippet alone cannot capture remote MCP calls. You can test with a privately connected plugin before publication."}</p>
    <div className="callout"><h3>{de ? "Was kommt in die Plugin-ZIP?" : "What goes in the plugin ZIP?"}</h3><p>{de ? "Der Tracking-Wrapper gehört in das Serverprojekt, das deine MCP-Adresse bedient. In plugin.json trägst du keine Tracking-Tokens ein. Für diese Integration bleiben MCP-Adresse und Tool-Beschreibungen gleich; die ZIP braucht keine Tracking-Konfiguration. Änderungen an Manifest oder angebotenen Tools sind separat zu behandeln." : "Put the tracking wrapper in the server project serving your MCP endpoint. Do not put tracking tokens in plugin.json. This integration keeps the MCP URL and tool descriptors unchanged; the ZIP needs no tracking configuration. Manifest or exposed-tool changes must be handled separately."}</p></div>
    <h3>{de ? "1. Zwei Schreibzugänge erstellen" : "1. Create two write credentials"}</h3>
    <p>{de ? "Melde dich an, öffne deine Site → Einstellungen → Server-Integrationen. Erstelle einen Schreibzugang für Tool-Telemetrie und einen für bestätigte Abschlüsse. Das Stats-Lesetoken funktioniert hier nicht. Die Site-Domain muss später mit domain im Code übereinstimmen." : "Sign in and open your site → Settings → Server integrations. Create one tool telemetry credential and one outcome credential. The read-only Stats token cannot write here. The registered site domain must match domain in the code."} <Link href="/app">{de ? "Zum Arbeitsbereich" : "Open workspace"}</Link></p>
    <h3>{de ? "2. Wrapper herunterladen und Server konfigurieren" : "2. Download the wrapper and configure your server"}</h3>
    <p><a href="/downloads/agenttracking-mcp.ts" download>{de ? "TypeScript-Wrapper herunterladen" : "Download TypeScript wrapper"}</a>{de ? " und als lib/agenttracking-mcp.ts in deinem Serverprojekt speichern. Er benötigt Node.js mit fetch und node:crypto; im Vercel Edge Runtime läuft er nicht." : " and save it as lib/agenttracking-mcp.ts in your server project. It needs Node.js with fetch and node:crypto; it does not run in the Vercel Edge Runtime."}</p>
    <p>{de ? "In Vercel: Projekt → Settings → Environment Variables. Hinterlege diese Werte für die gewünschte Deployment-Umgebung, dann deploye erneut. Bei anderen Hosts verwendest du deren Server-Umgebungsvariablen. Nutze keine NEXT_PUBLIC_-Variablen." : "In Vercel: project → Settings → Environment Variables. Set these values for the desired deployment environment, then redeploy. On other hosts use their server environment variables. Do not use NEXT_PUBLIC_ variables."}</p>
    <div className="tablewrap"><table><thead><tr><th>{de ? "Variable" : "Variable"}</th><th>{de ? "Wert" : "Value"}</th></tr></thead><tbody>
      <tr><td><code>TRACKING_TOOL_TOKEN</code></td><td>{de ? "Schreibzugang für Tool-Telemetrie" : "Tool telemetry write credential"}</td></tr>
      <tr><td><code>TRACKING_OUTCOME_TOKEN</code></td><td>{de ? "Schreibzugang für bestätigte Abschlüsse" : "Outcome write credential"}</td></tr>
      <tr><td><code>TRACKING_ENVIRONMENT</code></td><td><code>test</code> / <code>production</code></td></tr>
    </tbody></table></div>
    <pre className="code">{setup}</pre>
    <h3>{de ? "3. Bestehende Tool-Handler umschließen" : "3. Wrap existing tool handlers"}</h3>
    <p>{de ? "Das folgende Beispiel verwendet die MCP-Servermethode registerTool. calculateDescriptor, pdfDescriptor und die Handler stehen für deinen vorhandenen Code; createAndSavePdf musst du an deinen PDF-Speicher anbinden. Gib weiterhin das Ergebnisformat zurück, das dein Plugin bereits erwartet." : "This example uses the MCP server registerTool method. calculateDescriptor, pdfDescriptor and the handlers stand for your existing code; adapt createAndSavePdf to your PDF store. Preserve the result format your plugin already expects."}</p>
    <pre className="code">{wrap}</pre>
    <p>{de ? "Der Wrapper erfasst Toolname, Laufzeit, Version und technische Ausgänge, einschließlich isError: true. Er sendet keine Argumente, Antworten, Kundennamen oder PDF-URLs. Tracking-Ausfälle lassen Tool-Ergebnisse und Fehler bestehen; pro Versand wartet er standardmäßig höchstens 800 ms. Belege sollten für zuverlässige Wiederholungen zusammen mit dem Geschäftsvorgang gespeichert werden." : "The wrapper captures tool name, duration, version and technical outcomes, including isError: true. It sends no arguments, responses, customer names or PDF URLs. Tracking failures preserve tool results and errors; each delivery waits at most 800 ms by default. Store receipts with the business action for reliable retries."}</p>
    <h3>{de ? "4. PDF-Auslieferung bestätigen" : "4. Confirm PDF delivery"}</h3>
    <p>{de ? "Speichere die invocationId aus dem Erstellungsaufruf privat beim PDF. Nach einer erfolgreichen vollständigen GET-Auslieferung sendest du einen zweiten Beleg. HEAD-Anfragen, fehlgeschlagene und teilweise Übertragungen zählen nicht als vollständige Auslieferung. Wiederhole bei Netzfehlern exakt dieselbe Beleg-ID und denselben Zeitpunkt." : "Store the creation invocationId privately with the PDF. After a successful full GET delivery, send a second receipt. HEAD requests, failed or partial transfers are not full deliveries. Retry the same receipt ID and timestamp after network failures."}</p>
    <pre className="code">{fetchReceipt}</pre>
    <p>{de ? "Ein PDF-Abruf bestätigt die Auslieferung, nicht das Lesen: Auch automatische Vorabrufe können Downloads auslösen. Für Anfragen und Buchungen gibt es inquiry_created und booking_created. Eine gemeinsame Gesprächskennung allein beweist keinen zusammenhängenden Ablauf." : "A PDF fetch confirms delivery, not reading: automatic prefetches can also trigger downloads. Use inquiry_created and booking_created for inquiries and bookings. A shared conversation identifier alone does not prove a connected flow."}</p>
    <h3>{de ? "5. Privat testen und kontrollieren" : "5. Test privately and verify"}</h3>
    <ol>
      <li>{de ? "Setze TRACKING_ENVIRONMENT auf test und deploye den MCP-Server." : "Set TRACKING_ENVIRONMENT to test and deploy the MCP server."}</li>
      <li>{de ? "Rufe dein privat verbundenes Plugin auf: Angebot berechnen, PDF erstellen, PDF abrufen." : "Use your privately connected plugin: calculate a quote, create a PDF, fetch the PDF."}</li>
      <li>{de ? "Öffne deine Site → Tools → Testdaten. Prüfe Aufrufe, Version, Laufzeit, PDF erstellt und PDF abgerufen. Teste auch einen kontrollierten Tool-Fehler." : "Open your site → Tools → Test data. Check calls, version, duration, PDF created and PDF fetched. Also test a controlled tool failure."}</li>
      <li>{de ? "Für echte Nutzung setze die Produktionsumgebung explizit auf production und deploye erneut. Eigene Demo- und Review-Läufe weiter als test markieren." : "For real usage explicitly set the production environment to production and redeploy. Continue marking demo and review runs as test."}</li>
    </ol>
    <h3>{de ? "6. Abläufe, Warnungen und Versionen untersuchen" : "6. Inspect timelines, warnings and versions"}</h3>
    <p>{de ? "Unter Tools siehst du die letzten 50 MCP-Aufrufe. Öffnen zeigt den technischen Ausgang und bis zu 100 Ergebnisbelege, die exakt zur Site, Umgebung und Aufruf-ID passen. Fehlende Ergebnisbelege bleiben unbekannt. Ereigniszeit und Empfangszeit werden getrennt angezeigt." : "Tools lists the latest 50 MCP calls. Open shows the technical outcome and up to 100 receipts matching the exact site, environment and invocation ID. Missing outcome receipts remain unknown. Event time and receipt time are displayed separately."}</p>
    <p>{de ? "Dashboard-Warnungen erscheinen ab 20 Aufrufen, mindestens 3 Fehlern/Timeouts und einer Fehlerquote von mindestens 10 %, oder ab 20 gemessenen Laufzeiten mit p95 ≥ 5.000 ms. Produktionswarnungen erscheinen auch in Insights. Es wird keine E-Mail oder externe Nachricht versendet." : "Dashboard warnings appear with at least 20 calls, at least 3 failures/timeouts and a failure rate of at least 10%, or at least 20 measured durations with p95 ≥ 5,000 ms. Production warnings also appear in Insights. No email or external message is sent."}</p>
    <p>{de ? "Im Versionsvergleich wählst du ein Tool sowie zwei bekannte Versionen. Beide Spalten verwenden dieselbe Umgebung und denselben Empfangszeitraum. Stichproben, unbekannte Ausgänge und Laufzeitabdeckung sind sichtbar; ein Unterschied beweist keine kausale Verbesserung. Ergebniszahlen zählen Aufrufe mit bestätigtem Beleg, nicht Nutzer oder eine Conversion-Rate." : "In the version comparison select a tool and two known versions. Both columns use the same environment and receipt-time window. Samples, unknown outcomes and duration coverage remain visible; a difference does not prove a causal improvement. Outcome counts represent calls with a confirmed receipt, not users or a conversion rate."}</p>
    <p>{de ? "Keine Daten? Prüfe Domain, die beiden Token-Zwecke und das neue Deployment. Argumentfehler liefern HTTP 400, ungültige Tokens HTTP 401. Fehlende Ergebnisbelege bedeuten unbekannt, nicht automatisch einen verlorenen Kunden. Testdaten verbrauchen ebenfalls Ereigniskontingent." : "No data? Check the domain, the two credential purposes and the new deployment. Invalid fields return HTTP 400; invalid tokens return HTTP 401. Missing outcome receipts mean unknown, not automatically a lost customer. Test data also consumes event quota."}</p>
  </section>;
}
