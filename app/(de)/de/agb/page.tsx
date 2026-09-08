import Link from "next/link";
import { alternatesForLocale } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, SITE_HOST } from "@/lib/site";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

export const metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: `Die Bedingungen für den gehosteten Dienst Agent Tracking auf ${SITE_HOST}: Leistung, Pläne, Pflichten, Verfügbarkeit, Haftung, Laufzeit, Recht.`,
  alternates: alternatesForLocale("/terms", "de"),
};

const country = LEGAL.hostingCountry === "Germany" ? "Deutschland" : LEGAL.hostingCountry;

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="clause">
      <h2 id={`s${n}`}>
        <span className="clause-n">§ {n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Rechtliches</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Allgemeine Geschäftsbedingungen</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          Für den gehosteten Dienst auf {SITE_HOST}. Die Software selbst ist gesondert unter der AGPL-3.0 lizenziert; wer sie selbst betreibt, braucht nichts hiervon. Die{" "}
          <Link href="/terms">englische Fassung</Link> ist verbindlich; diese Seite ist eine Übersetzung.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">Die Kurzfassung</span>
        <p>
          Sie bekommen ein Dashboard darüber, was KI-Agenten auf Ihrer Site tun. Free ist kostenlos und bleibt es in der Pilotphase; bezahlte Pläne kommen später, mit 30 Tagen
          Vorlauf, bevor sich an Ihrem Konto etwas ändert. Sie setzen eine Zeile Script auf Ihre eigene Site und stehen dafür gegenüber Ihren Besuchern ein. Wir betreiben den
          Dienst sorgfältig, versprechen aber keine Verfügbarkeit, und unsere Haftung ist auf das begrenzt, was Sie uns in den letzten zwölf Monaten gezahlt haben. Recht von
          Florida, englischer Text.
        </p>
      </div>

      <div className="prose terms">
        <Clause n="1" title="Parteien und Geltung">
          <p>
            Diese Bedingungen gelten zwischen <b>{LEGAL.name}</b>, {LEGAL.addressLines.join(", ")} („wir“), und der Person oder dem Unternehmen, das auf {SITE_HOST} ein Konto
            anlegt („Sie“). Sie regeln nur den gehosteten Dienst. Der Quellcode ist freie Software unter der GNU Affero General Public License v3.0; für die Software gilt diese
            Lizenz, nicht diese Bedingungen.
          </p>
          <p>Der Dienst richtet sich an Unternehmen, Organisationen und Freiberufler für Websites, die sie betreiben. Er wird Verbrauchern nicht angeboten.</p>
        </Clause>

        <Clause n="2" title="Der Dienst">
          <p>
            Agent Tracking erfasst für eine Site, die Sie registrieren und verifizieren, welche KI-Assistenten Besucher schicken, welche KI-Agenten Seiten abrufen, welche
            WebMCP-Tools aufgerufen werden und ob markierte Ziele erreicht werden, und zeigt Tagessummen in einem Dashboard, über eine API und über ein MCP-Tool. Was erfasst wird
            und was nicht, beschreiben die <Link href="/de/docs">Dokumentation</Link> und der <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link>.
          </p>
          <p>
            Die Erkennung von Agenten beruht auf einer veröffentlichten, versionierten Liste von Referrern und User-Agents und, für Server-Logs, auf den von den Anbietern
            veröffentlichten Adressbereichen. Ein Agent, der sich nicht zu erkennen gibt, wird nicht gezählt. Die Zahlen sind eine Messung mit dieser Grenze, keine Garantie für
            Vollständigkeit.
          </p>
        </Clause>

        <Clause n="3" title="Konto">
          <p>
            Ein Konto ist eine E-Mail-Adresse. Angemeldet wird über einen Link an diese Adresse; wer das Postfach kontrolliert, kontrolliert das Konto, halten Sie es also sicher.
            Sie sind für alles verantwortlich, was über Ihr Konto geschieht, und dafür, dass die Adresse aktuell bleibt.
          </p>
          <p>Sie dürfen eine Site nur registrieren, wenn Sie sie betreiben oder der Betreiber Sie ermächtigt hat. Die Verifikation prüft, ob das Snippet installiert ist, nicht, wer Sie sind.</p>
        </Clause>

        <Clause n="4" title="Pläne, Pilotphase und Preise">
          <p>
            Die Pläne und ihre Grenzen stehen in der Dokumentation: Free umfasst {PLANS.free.domains} Site, {PLANS.free.eventsPerMonth.toLocaleString("de-DE")} Agenten-Ereignisse
            im Monat und {PLANS.free.windowDays} Tage Verlauf; Pro und Agency erweitern diese Grenzen. Reine Seitenaufrufe werden nie auf das Kontingent angerechnet.
          </p>
          <p>
            In der Pilotphase ist jedes Konto kostenlos auf Free, und wir können die Grenzen eines Kontos auf Anfrage von Hand anheben. Bezahlte Pläne öffnen, wenn wir Preise
            bekanntgeben. An einem bestehenden Konto ändert sich nichts ohne 30 Tage Vorlauf per E-Mail; ist Ihnen eine Änderung nicht recht, entfernen Sie Ihre Sites vor dem
            Stichtag, und es ist nichts geschuldet.
          </p>
          <p>
            Sobald geöffnet, werden bezahlte Pläne über Stripe im Voraus für den gewählten Zeitraum abgerechnet und verlängern sich, bis sie im Dashboard gekündigt werden. Preise
            werden beim Checkout angezeigt und verstehen sich ohne Steuern, die Sie schulden können. Ein Plan kann jederzeit gekündigt werden und endet mit dem bezahlten Zeitraum;
            eine Erstattung des Rests gibt es nicht, außer wo das Gesetz sie verlangt.
          </p>
        </Clause>

        <Clause n="5" title="Ihre Pflichten">
          <ul>
            <li>Installieren Sie das Snippet nur auf Sites, die Sie ändern dürfen, und informieren Sie Ihre Besucher darüber, wie es das Recht an Ihrem Ort verlangt.</li>
            <li>Für die Daten Ihrer Besucher sind Sie Verantwortlicher; wir verarbeiten sie nach Ihrer Weisung im Rahmen des Auftragsverarbeitungsvertrags.</li>
            <li>Senden Sie keine erfundenen Ereignisse, sondieren oder überlasten Sie den Ingest nicht und messen Sie keine Site gegen den Willen ihres Betreibers.</li>
            <li>Halten Sie das API-Token geheim. Widerrufen Sie es im Dashboard, wenn es abhandenkommt; wir können es nicht zweimal anzeigen.</li>
            <li>Verkaufen Sie den gehosteten Dienst nicht ohne unsere schriftliche Zustimmung als Ihren eigenen weiter. Die Software selbst unter der AGPL zu betreiben ist immer erlaubt.</li>
          </ul>
          <p>Verletzen Sie diese Pflichten, können wir das Konto nach Ankündigung sperren, oder ohne Ankündigung, wenn die Verletzung den Dienst oder andere gefährdet.</p>
        </Clause>

        <Clause n="6" title="Verfügbarkeit und Änderungen">
          <p>
            Wir betreiben den Dienst sorgfältig auf einem Server in {country}, halten tägliche verschlüsselte Backups und beheben Störungen so schnell wir können, versprechen aber
            keine bestimmte Verfügbarkeit. Wartung kann den Dienst unterbrechen; geplante Wartung kündigen wir vorher an, wo wir können.
          </p>
          <p>
            Wir dürfen den Dienst ändern, Funktionen hinzufügen oder entfernen und die Agentenliste aktualisieren. Eine Änderung, die einem bezahlten Plan eine wesentliche Funktion
            nimmt, wird 30 Tage vorher angekündigt, und Sie können mit anteiliger Erstattung für den Restzeitraum kündigen.
          </p>
          <p>Ein Ereignis-Batch, den der Dienst nicht annehmen kann, etwa über dem Kontingent oder fehlerhaft, wird stillschweigend verworfen. Das Snippet zeigt auf Ihrer Site nie einen Fehler.</p>
        </Clause>

        <Clause n="7" title="Gewährleistung und Haftung">
          <p>
            Der Dienst wird bereitgestellt, wie er ist. Soweit das Gesetz es zulässt, schließen wir alle ausdrücklichen und stillschweigenden Gewährleistungen aus, einschließlich
            der Marktgängigkeit und der Eignung für einen bestimmten Zweck, und gewährleisten weder die Vollständigkeit der Zahlen noch einen unterbrechungs- oder fehlerfreien
            Dienst.
          </p>
          <p>
            Soweit das Gesetz es zulässt, haften wir nicht für mittelbare, zufällige, besondere, Folge- oder Strafschäden noch für entgangenen Gewinn, Umsatz oder Daten, gleich
            wie entstanden. Unsere Gesamthaftung aus diesen Bedingungen ist auf den Betrag begrenzt, den Sie uns in den zwölf Monaten vor Entstehen des Anspruchs für den Dienst
            gezahlt haben, bei einem Free-Konto auf 100 US-Dollar. Nichts hiervon begrenzt die Haftung für Vorsatz oder Betrug oder eine Haftung, die gesetzlich nicht begrenzt
            werden kann.
          </p>
          <p>Zwischen den Parteien regelt der Auftragsverarbeitungsvertrag den Datenschutz und geht diesem Abschnitt vor, wo beide sich widersprechen.</p>
        </Clause>

        <Clause n="8" title="Laufzeit und Löschung">
          <p>
            Der Vertrag läuft, bis Sie das Konto entfernen oder wir ihn beenden. Sie können jede Site oder das ganze Konto jederzeit im Dashboard entfernen; alle Daten einer
            entfernten Site, roh und aggregiert, werden sofort gelöscht, Rohdaten ohnehin nach {RAW_RETENTION_DAYS} Tagen.
          </p>
          <p>
            Wir können den Vertrag mit 30 Tagen Frist per E-Mail beenden, bei einer wesentlichen Verletzung fristlos. Stellen wir den gehosteten Dienst ein, kündigen wir das
            mindestens 90 Tage vorher an und bieten einen Export Ihrer Tagessummen; die Software bleibt unter ihrer Lizenz für den Eigenbetrieb verfügbar.
          </p>
        </Clause>

        <Clause n="9" title="Recht, Gerichtsstand und Schlussbestimmungen">
          <p>
            Es gilt das Recht des Bundesstaats Florida, USA, unter Ausschluss seines Kollisionsrechts; ausschließlicher Gerichtsstand sind die Gerichte von Pinellas County,
            Florida, wobei wir einstweiligen Rechtsschutz überall beantragen dürfen. Zwingendes Recht an Ihrem Geschäftssitz, das nicht abbedungen werden kann, bleibt unberührt.
            Das UN-Kaufrecht findet keine Anwendung.
          </p>
          <p>
            Der englische Text ist verbindlich; Übersetzungen dienen der Verständlichkeit. Ist eine Bestimmung unwirksam, bleibt der Rest in Kraft, und die Bestimmung wird durch
            eine ersetzt, die ihrem Zweck am nächsten kommt. Wir dürfen diese Bedingungen mit 30 Tagen Vorlauf per E-Mail ändern; weitere Nutzung nach diesem Datum gilt als
            Annahme, das Entfernen Ihrer Sites davor als kostenlose Ablehnung.
          </p>
          <p>
            Fragen an <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Clause>

        <p className="terms-date">Stand {LEGAL.revised}.</p>
      </div>
    </article>
  );
}
