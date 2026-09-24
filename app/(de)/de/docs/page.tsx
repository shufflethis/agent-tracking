import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { alternatesForLocale } from "@/lib/i18n";
import { SOURCES_VERSION } from "@/lib/tracking/classify";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import sources from "@/lib/tracking/ai-sources.json";
import { CONTACT_EMAIL, GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

const API_CURL = `curl -s ${SITE_ORIGIN}/api/stats/example.com?days=30 \\
  -H "Authorization: Bearer wmt_dein_token"`;

const LOG_CURL = `curl -sS -X POST ${SITE_ORIGIN}/api/logs/example.com \\
  -H "Authorization: Bearer wmt_dein_token" \\
  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log`;

const API_MCP = `{
  "mcpServers": {
    "agent-tracking": {
      "url": "${SITE_ORIGIN}/api/mcp",
      "headers": { "Authorization": "Bearer wmt_dein_token" }
    }
  }
}`;

export const metadata: Metadata = {
  title: "Agent Tracking: Was KI-Agenten auf deiner Site tun",
  description:
    "Das Snippet beobachtet erkannte Referrals und unterstützte Browser-WebMCP-Aktionen. Optionale Logs und Site-Serverbelege liefern getrennte Nachweise. Messgrenzen und Datenauswahl erklärt.",
  alternates: alternatesForLocale("/docs", "de"),
};

const SNIPPET = snippetFor("example.com");

const REGISTER = `await document.modelContext.registerTool({
  name: "search_products",
  description: "Durchsucht den Katalog per Freitext.",
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  annotations: { readOnlyHint: true },
  execute: async ({ query }, { signal }) => { /* ... */ },
});
// agent.js beobachtet unterstützte Registrierungen und Aufrufe, während es aktiv ist:
// technischen Ausgang, Dauer und bereinigte Fehlerklasse; Argumentwerte werden nicht gespeichert.`;

const DECLARATIVE = `<form toolname="book_table" tooldescription="Reserviert einen Tisch für Datum und Personenzahl."
      action="/book" method="post">
  <input name="date" type="date" required>
  <input name="guests" type="number" min="1" required>
  <button type="submit" data-agent-goal="table_booked">Reservieren</button>
</form>`;

/** Deutsche Fassung von /docs. Das Dashboard selbst schaltet die Sprache über das Konto um. */
const DOCS_LD = [
  { "@context": "https://schema.org", "@type": "WebPage", "@id": `${SITE_ORIGIN}/de/docs#webpage`, url: `${SITE_ORIGIN}/de/docs`, name: "Agent Tracking Dokumentation", inLanguage: "de", isPartOf: { "@id": `${SITE_ORIGIN}/#site` }, about: { "@id": `${SITE_ORIGIN}/#app` } },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Start", item: `${SITE_ORIGIN}/de` }, { "@type": "ListItem", position: 2, name: "Dokumentation", item: `${SITE_ORIGIN}/de/docs` }] },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DOCS_LD) }} />
      <section className="shell section" style={{ paddingTop: 56, paddingBottom: 10 }}>
        <div className="pagehead">
          <p className="eyebrow">Agent Tracking</p>
          <h1>Was KI-Agenten auf deiner Site tun</h1>
          <p className="dek" style={{ maxWidth: "62ch" }}>
            Sieh erkannte Assistenten-Referrals und unterstützte Browser-WebMCP-Aktionen. Optionale Origin-Logs und Site-Serverbelege ergänzen getrennte Crawler- und Abschlussnachweise. Das Snippet setzt keine Cookies.
          </p>
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            <Link className="btn" href="/login?lang=de">Anmelden oder Konto anlegen</Link>
            <Link className="btn ghost" href="/demo">Demo-Seite ansehen</Link>
          </p>
        </div>
      </section>

      <section className="shell section">
        <h2>Einbauen</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Lege deine Site im Dashboard an und setze diese Zeile auf jede Seite. Die Domain in <code>data-domain</code> muss die registrierte sein; Ereignisse für jede andere Domain werden an
          der Tür verworfen.
        </p>
        <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{SNIPPET}</pre>
        <CopyButton text={SNIPPET} label="Kopieren" copiedLabel="Kopiert" />
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Unter fünf Kilobyte, reines JavaScript, kein Framework, keine Abhängigkeiten. Es schickt kleine Pakete per <code>sendBeacon</code> an <code>/api/event</code>, deshalb kommt
          auch ein Klick an, der die Seite verlässt. Das Script hat absichtlich keinen Integrity-Hash: es wird an Ort und Stelle aktualisiert, wenn ein neuer Agent in der Liste unten
          auftaucht.
        </p>
      </section>

      <section className="shell section">
        <h2>Drei Ebenen</h2>
        <div className="grid3">
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">A. KI-Referrals</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              Ein Besucher kommt von einem Assistenten: der Referrer wird gegen eine gepflegte Liste von Assistenten-Hosts abgeglichen, dazu <code>utm_source</code>-Muster. Erfasst
              als Assistent und Einstiegspfad.
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">B. KI-Abrufe</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              Ein Assistent lädt eine Seite und führt ihre Scripts aus: der User-Agent der Anfrage, die das Beacon trägt, wird gegen dieselbe Liste abgeglichen. Der Abgleich passiert
              auf unserem Server aus den Request-Headern, nicht im Snippet, damit die Liste an einem versionierten Ort bleibt und das Snippet klein.
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">C. WebMCP-Tool-Aufrufe</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              Das Snippet beobachtet unterstützte <code>document.modelContext</code>- und ältere <code>navigator.modelContext</code>-Aufrufe, während es aktiv ist. Es erfasst technische Ausgänge, Dauer und bereinigte Fehlerklassen. Deklarative Formulare erzeugen Submit-Versuche. Remote-MCP-Aufrufe brauchen den getrennten Serveradapter.
            </p>
          </div>
        </div>
        <div className="callout hot" style={{ marginTop: 24 }}>
          <span className="tag">Was das nicht sehen kann</span>
          <p style={{ marginBottom: 0 }}>
            Ein Crawler ohne JavaScript führt das Snippet nie aus. GPTBot, ClaudeBot und ihresgleichen holen meist rohes HTML und erscheinen hier nur, wenn sie die Seite rendern. Sie zu
            zählen braucht das Server-Log. Für {SITE_HOST} selbst läuft der Collector alle 15 Minuten. Ein Abruf-Burst bedeutet mindestens drei verschiedene relevante Pfade nahe beieinander in einem Import-Batch; er verrät weder Suchfrage noch Absicht. Für deine Site lädst du ein vollständiges Append-only-Log hoch oder verwendest einen Collector mit stabilen Datensatzidentitäten. Wo ein Anbieter IP-Bereiche veröffentlicht, wird ein Agenten-Claim dagegen geprüft. Fehlende oder veraltete Listen und Abweichungen bleiben getrennt von bestätigten Zahlen.
          </p>
        </div>
      </section>

      <section className="shell section">
        <h2>Tools und Ziele</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>An der Registrierung deiner Tools ändert sich nichts. Registriere sie, wie die Spezifikation es vorsieht, und das Snippet sieht sie:</p>
        <pre className="code">{REGISTER}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Deklarative Tools sind Formulare mit einem <code>toolname</code>. Setze <code>data-agent-goal</code>, um einen Browser-Zielversuch zu markieren. Eine bestätigte Anfrage oder Buchung braucht einen getrennten Serverbeleg:
        </p>
        <pre className="code">{DECLARATIVE}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Wenn du ein Manifest unter <code>/.well-known/webmcp</code> veröffentlichst, hasht das Snippet es einmal pro Besuch auf der Einstiegsseite. Das Dashboard zeigt, wann es sich
          zuletzt geändert hat; Pro-Konten können benachrichtigt werden.
        </p>
      </section>

      <section className="shell section">
        <h2>Was erfasst wird und was nicht</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Erfasst</th>
                <th>Nie erfasst</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Seitenpfad ohne Query-String</td>
                <td>Query-Strings, Fragmente, Formularwerte</td>
              </tr>
              <tr>
                <td>Referrer-Host und utm_source, wenn sie einen Assistenten benennen</td>
                <td>Vollständige Referrer-URLs</td>
              </tr>
              <tr>
                <td>Beobachteter Tool-Name, Dauer, technischer Ausgang und bereinigte Fehlerklasse</td>
                <td>Eingabewerte, Ausgabewerte</td>
              </tr>
              <tr>
                <td>Eine Sitzungskennung: täglicher Zufalls-Salt, deine Domain, eine grobe Browserklasse und die Adresse, gehasht</td>
                <td>Die Adresse selbst, Cookies, Speicher, Fingerprints, jede dauerhafte Kennung</td>
              </tr>
              <tr>
                <td>Erkannter Quellen-Claim und Nachweisstatus (Listen-Version {SOURCES_VERSION})</td>
                <td>Vollständige User-Agent-Strings</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Rohdaten werden {RAW_RETENTION_DAYS} Tage aufbewahrt und dann gelöscht; Tagessummen bleiben, solange die Site besteht. Alles liegt auf unserem eigenen Server in Deutschland.
          Site entfernen löscht alles. Die <Link href="/de/datenschutz#tracking">Datenschutzerklärung</Link> hat die formale Fassung, und der{" "}
          <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link> wird geschlossen, wenn du eine Site anlegst.
        </p>
      </section>

      <section className="shell section">
        <h2>Pläne</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          In der Pilotphase ist jedes Konto auf Free, bezahlte Pläne sind noch nicht offen. Brauchst du während der Pilotphase mehr? Schreib an {CONTACT_EMAIL}, wir stellen dein
          Konto von Hand um. Die <Link href="/de#plans">Produktseite</Link> hat die Bedingungen der Pilotphase.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Sites</th>
                <th>Agenten-Ereignisse pro Monat</th>
                <th>Verlauf</th>
                <th>Extras</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(PLANS).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.domains === Infinity ? "unbegrenzt" : p.domains}</td>
                  <td>{p.eventsPerMonth.toLocaleString("de-DE")}</td>
                  <td>{p.windowDays} Tage</td>
                  <td>{[p.manifestAlerts ? "Manifest-Änderungsalarm" : null, p.whiteLabelBadge ? "White-Label-Badge" : null].filter(Boolean).join(", ") || "keine"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>Preise stehen im Dashboard beim Checkout. Free braucht keine Karte.</p>
      </section>

      <section className="shell section" id="api">
        <h2>Deine Zahlen in deinen eigenen Werkzeugen</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Aggregierte Site-Statistiken gibt es als JSON und über ein MCP-Lesetool für berechtigte Scripts und Agenten. Erzeuge das Token auf der
          Einstellungsseite einer Site; es wird einmal gezeigt und gehört zum Konto. Es liest eigene und ausdrücklich freigegebene Sites, keine Rohereignisse.
        </p>
        <pre className="code">{API_CURL}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Dasselbe Token schickt dein Server-Log. Vollständige Append-only-Dateien kannst du erneut senden. Für Rotation oder überlappende Chunks brauchst du stabile Header für Quelle, Dateigeneration und Datensatzposition. Bereits angenommene Positionen werden übersprungen:
        </p>
        <pre className="code">{LOG_CURL}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          <code>GET /api/stats</code> mit demselben Header listet die Sites, die das Token lesen darf. <code>days</code> ist auf den Verlauf des Plans gedeckelt. Die Antwort enthält
          Summen, die Vorperiode für Trends, die Tagesreihe, die Agenten mit Anteil und Trend, die Tools mit Erfolgsquote und mittlerer Dauer und die meistbesuchten Seiten.
        </p>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Über MCP trägst du unseren Server mit dem Token als Header ein und fragst in Worten. Claude Desktop, Cursor und die meisten Clients nehmen eine Konfiguration wie diese:
        </p>
        <pre className="code">{API_MCP}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Dann: &bdquo;Welche Agenten haben example.com diese Woche gelesen?&ldquo; Der Client ruft <code>get_agent_stats</code> auf und bekommt dasselbe JSON. Ein Client, der keine
          Header setzen kann, übergibt das Token stattdessen im Argument <code>token</code> des Tools.
        </p>
      </section>

      <section className="shell section" id="server-outcomes">
        <h2>Anfragen und Buchungen serverseitig bestätigen</h2>
        <p className="dek">Erstelle in den Site-Einstellungen getrennte Schreibzugänge für Abschlüsse und Remote-MCP-Aufrufe. Bewahre sie nur auf deinem Server auf. Nach erfolgreichem Speichern einer Anfrage sende einen stabilen Beleg an <code>/api/outcomes/example.com</code> mit <code>Authorization: Bearer atw_...</code>. Das Stats-Lesetoken kann hier nicht schreiben.</p>
        <pre className="code">{`{"receiptId":"receipt_1234567890123","kind":"inquiry_created","status":"confirmed","occurredAt":${Date.UTC(2026, 8, 25, 12)},"taskId":"task_1234567890123456"}`}</pre>
        <p className="dek">Vergib pro echter Anfrage eine neue Beleg-ID und wiederhole bei Netzfehlern dieselbe ID. Wiederholungen liefern <code>duplicate</code>, geänderte Nutzdaten zur selben ID HTTP 409. Sende keine Kontakt-, Zahlungs- oder Bestellinhalte. Task- und Invocation-ID verknüpfen Beobachtungen, belegen aber keinen Akteur.</p>
        <p className="dek">Für externe MCP-Server nutze den separaten Zugang und <code>/api/server-tools/example.com</code> mit Invocation-ID, optionaler Task-ID, Toolname, Zeitpunkt, technischem Ausgang und Akteurstyp. Ein Agentenakteur ist eine Aussage deines Servers, keine unabhängige Verifikation. Das Browser-Snippet sieht nicht jeden externen MCP-Aufruf. Das ausführbare TypeScript-Beispiel liegt im Repository unter <code>examples/inquiry-app</code>.</p>
      </section>

      <section className="shell section">
        <h2>Die Agenten auf der Liste</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Version {SOURCES_VERSION}. Referrer: {sources.referrers.map((r) => r.label).join(", ")}. User-Agents: {sources.agents.map((a) => a.label).join(", ")}. Fehlt einer? Schreib
          an {CONTACT_EMAIL}, oder öffne einen Pull Request gegen <code>lib/tracking/ai-sources.json</code>.
        </p>
      </section>
    </>
  );
}
