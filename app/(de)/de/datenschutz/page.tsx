import Link from "next/link";
import { alternatesForLocale } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, SITE_HOST } from "@/lib/site";
import { RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datenschutzerklärung",
  description: `Was ${SITE_HOST} über Besucher dieser Site, über Kontoinhaber und im Auftrag von Kunden auf deren Sites erfasst. Keine Cookies, keine Fremdscripts, keine Werbung.`,
  alternates: alternatesForLocale("/privacy", "de"),
};

const country = LEGAL.hostingCountry === "Germany" ? "Deutschland" : LEGAL.hostingCountry;

export default function Page() {
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Rechtliches</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Datenschutzerklärung</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          Was diese Site erfasst, warum, wie lange, und was sie bewusst nicht tut. Die <Link href="/privacy">englische Fassung</Link> ist maßgeblich; diese Seite ist eine
          Übersetzung.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">Die Kurzfassung</span>
        <p>
          Keine Cookies, keine Fremdscripts, keine Werbung, kein Analytics-Dienst. Ein Besuch hinterlässt eine Server-Log-Zeile, die nach 14 Tagen gelöscht wird. Ein Konto ist
          eine E-Mail-Adresse. Auf den Sites unserer Kunden erfasst unser Script, was KI-Agenten tun, ohne Adressen oder Kennungen, im Auftrag des Kunden. Alles liegt auf einem
          Server in {country}.
        </p>
      </div>

      <div className="prose terms">
        <h2 id="controller">Verantwortlicher</h2>
        <p>
          <b>{LEGAL.name}</b>, {LEGAL.addressLines.join(", ")}, <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Fragen zu dieser Erklärung an{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          {LEGAL.euRepresentative ? <> Unser Vertreter in der Europäischen Union nach Art. 27 DSGVO ist {LEGAL.euRepresentative}.</> : null}
        </p>
        <p>
          Der Verantwortliche ist ein Unternehmen in den Vereinigten Staaten. Der Server, der alle hier beschriebenen Daten speichert, steht in {country}, und die Daten bleiben
          dort. Der Verantwortliche erreicht ihn nur über eine verschlüsselte Administrationsverbindung; außer dem, was ein Administrator am Bildschirm sieht, wird nichts in die
          USA kopiert.
        </p>

        <h2 id="hosting">Besuch dieser Site</h2>
        <p>
          Der Webserver schreibt pro Anfrage eine Zeile: Pfad, Zeitpunkt, Status, Größe der Antwort, Referrer, falls der Browser einen sendet, User-Agent-String und
          Netzwerkadresse. Die Zeilen dienen dem Betrieb, der Fehlersuche, der Abwehr von Missbrauch und der Zählung, wie oft KI-Agenten unsere eigenen Seiten abrufen; sie werden
          nach 14 Tagen gelöscht. Rechtsgrundlage ist unser berechtigtes Interesse an einem funktionierenden und sicheren Dienst (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p>
          Schriften werden von diesem Server ausgeliefert. Keine Schrift, kein Script, kein Bild und kein Stylesheet wird von einer fremden Domain geladen; niemand sonst erfährt
          von Ihrem Besuch. Die Site trägt ihr eigenes Tracking-Snippet, das hier dasselbe erfasst wie auf Kundensites, siehe unten.
        </p>

        <h2 id="account">Konto und Anmeldung</h2>
        <p>
          Ein Konto besteht aus einer E-Mail-Adresse, dem Plan, der Sprache des Dashboards, den hinzugefügten Sites und, falls Sie eines anlegen, einem gehashten API-Token. Es
          gibt kein Passwort: Anmelden heißt, per E-Mail einen Link zu erhalten, 30 Minuten und einmal gültig, dessen Seite ein Sitzungs-Cookie für 30 Tage setzt. Dieses Cookie
          (<code>at_session</code>) ist für das Dashboard zwingend erforderlich und braucht keine Einwilligung; es ist das einzige Cookie, das diese Site je setzt, und nur nach
          der Anmeldung. Wir verarbeiten diese Daten zur Erfüllung des Vertrags mit Ihnen (Art. 6 Abs. 1 lit. b DSGVO). Anmeldelinks sind pro Adresse und Tag begrenzt; dafür
          wird gezählt, wie viele eine Adresse erhalten hat.
        </p>
        <p>
          E-Mails werden über Brevo (Sendinblue GmbH, Köpenicker Straße 126, 10179 Berlin) versandt, die Adresse und Nachricht zur Zustellung verarbeitet. Wir senden Anmeldelinks
          und, solange Sie es nicht abschalten, wöchentlich eine Zusammenfassung der Zahlen Ihrer Sites mit Abmeldelink in jeder Mail; die Zusammenfassung lässt sich im Dashboard
          jederzeit abschalten (Art. 6 Abs. 1 lit. b und f DSGVO).
        </p>

        <h2 id="tracking">Agent Tracking auf Kundensites</h2>
        <p>
          Site-Betreiber binden unser Script <code>agent.js</code> auf ihren Seiten ein. Für deren Besucher erfassen wir dann in ihrem Auftrag: den Seitenpfad ohne Query-String,
          ob der Besuch von einem KI-Assistenten kam oder durch einen erfolgte (Abgleich von Referrer und User-Agent gegen eine veröffentlichte Liste), und bei WebMCP-Tools den
          Toolnamen, Dauer, Erfolg oder Fehlschlag, die Fehlerklasse und die <b>Namen der Eingabefelder, nie deren Werte</b>. Jeder Datensatz trägt eine Sitzungskennung aus
          einem täglich neuen Zufallswert, der Site, einer groben Browserklasse und der Netzwerkadresse, gehasht; die Adresse selbst wird nicht gespeichert, kein Cookie gesetzt,
          nichts auf das Gerät geschrieben. Rohdaten werden nach {RAW_RETENTION_DAYS} Tagen gelöscht; Tagessummen bleiben, solange die Site im Konto ist.
        </p>
        <p>
          Site-Betreiber können außerdem ihr eigenes Server-Log hochladen. Aus jeder Zeile werden Tag, Agentenname und Seitenpfad übernommen; die Netzwerkadresse wird nur während
          der Verarbeitung genutzt, um Abrufe eines Agenten zu gruppieren und den Agenten gegen die veröffentlichten Adressbereiche seines Anbieters zu prüfen, und mit dem Ende
          der Anfrage verworfen.
        </p>
        <p>
          Für diese Datensätze ist der Site-Betreiber Verantwortlicher, wir verarbeiten sie als Auftragsverarbeiter nach seiner Weisung; wir nutzen sie nicht für eigene Zwecke
          und geben sie an niemanden weiter. Der <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link> regelt das förmlich. Fragen zum Tracking auf einer bestimmten Site gehen
          an deren Betreiber; wir helfen bei der Antwort.
        </p>

        <h2 id="stats">Öffentliche Stats-Seiten</h2>
        <p>Ein Site-Betreiber kann eine Seite mit Tagessummen seiner Site veröffentlichen. Sie zeigt Zahlen und Agentennamen, nie Sitzungen, Pfade oder etwas über einzelne Besucher.</p>

        <h2 id="api">Stats-API und MCP-Endpunkt</h2>
        <p>
          Anfragen mit API-Token werden pro Adresse für die Ratenbegrenzung gezählt und aus denselben Tagessummen beantwortet, die das Dashboard zeigt. Das Token wird als Hash
          gespeichert; wir können es nicht erneut anzeigen.
        </p>

        <h2 id="payment">Zahlung</h2>
        <p>
          Bezahlte Pläne werden, sobald sie geöffnet sind, über Stripe, Inc. (354 Oyster Point Boulevard, South San Francisco, CA 94080, USA) abgerechnet. Stripe erhält Ihre
          E-Mail-Adresse und den Plan und wickelt die Karte selbst ab; Kartendaten sehen wir nie. Stripe meldet uns den Abonnementstatus und eine Kundenkennung, die wir beim Konto
          speichern (Art. 6 Abs. 1 lit. b DSGVO). Für die Zahlungsdaten gilt die Datenschutzerklärung von Stripe.
        </p>

        <h2 id="processors">Empfänger und Drittlandübermittlung</h2>
        <ul>
          <li>
            <b>{LEGAL.hostingProvider}</b>: stellt den Server bereit und ans Netz. Kein Zugriff auf die Inhalte im Regelbetrieb.
          </li>
          <li>
            <b>Brevo</b>, Berlin: stellt unsere E-Mails zu.
          </li>
          <li>
            <b>GitHub, Inc.</b>, San Francisco, USA: hält eine tägliche Kopie der Datenbank, mit AES-256 verschlüsselt, bevor sie den Server verlässt. GitHub kann sie nicht lesen.
            Die Übermittlung stützt sich auf das EU-US Data Privacy Framework, dem GitHub angehört.
          </li>
          <li>
            <b>Stripe, Inc.</b>, USA: Zahlung, nur bei bezahlten Plänen, unter dem EU-US Data Privacy Framework und den Standardvertragsklauseln von Stripe.
          </li>
          <li>
            <b>Der Verantwortliche selbst</b> sitzt in den Vereinigten Staaten. Der administrative Zugang zum Server von dort ist durch Verschlüsselung und Schlüssel geschützt.
            Für Kunden in EU und EWR enthält der Auftragsverarbeitungsvertrag die Standardvertragsklauseln der Europäischen Kommission.
          </li>
        </ul>
        <p>Niemand sonst erhält Daten. Nichts wird verkauft, für Werbung geteilt oder zum Training von Modellen genutzt.</p>

        <h2 id="backup">Backups</h2>
        <p>
          Einmal täglich wird eine konsistente Kopie der Datenbank auf dem Server verschlüsselt und in einem privaten Repository abgelegt (siehe oben). Backups werden 30 Tage
          aufbewahrt und nur zur Wiederherstellung nach einem Ausfall genutzt. Ein aus der Datenbank gelöschter Datensatz kann daher bis zu 30 Tage in einem Backup fortbestehen.
        </p>

        <h2 id="rights">Ihre Rechte</h2>
        <p>
          Nach der DSGVO haben Sie das Recht auf Auskunft über die Daten, die wir über Sie halten, auf Berichtigung und Löschung, auf Einschränkung der Verarbeitung und Widerspruch
          sowie auf Datenübertragbarkeit (Art. 15 bis 21). Soweit die Verarbeitung auf berechtigtem Interesse beruht, können Sie aus Gründen Ihrer besonderen Situation
          widersprechen. Sie haben außerdem das Recht auf Beschwerde bei einer Aufsichtsbehörde, etwa der Ihres Wohnsitz-Mitgliedstaats. Schreiben Sie dafür an{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; Kontodaten löschen Sie im Dashboard selbst, indem Sie eine Site oder das Konto entfernen.
        </p>
        <p>
          Für Besucher von Kundensites: Die Datensätze enthalten keine Kennung, über die eine bestimmte Person auffindbar wäre, und keine Netzwerkadresse. Ein Auskunftsersuchen
          ergibt daher ehrlicherweise nichts, was Sie betrifft; wir sagen das, statt einen Treffer zu erfinden.
        </p>

        <h2 id="children">Kinder</h2>
        <p>Der Dienst richtet sich an Unternehmen und deren Websites. Wir legen wissentlich keine Konten für Personen unter 16 Jahren an.</p>

        <h2 id="changes">Änderungen</h2>
        <p>Ändert sich der Dienst, ändert sich diese Erklärung mit, mit neuem Datum. Kontoinhaber werden per E-Mail über Änderungen informiert, die sie betreffen. Stand {LEGAL.revised}.</p>
      </div>
    </article>
  );
}
