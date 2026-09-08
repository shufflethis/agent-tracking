import Link from "next/link";
import { alternatesForLocale } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, SITE_HOST } from "@/lib/site";
import { RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

export const metadata = {
  title: "Auftragsverarbeitungsvertrag",
  description: `Auftragsverarbeitungsvertrag nach Art. 28 DSGVO für Agent Tracking auf ${SITE_HOST}: Gegenstand, Weisungen, Unterauftragsverarbeiter, Drittlandübermittlung, technische und organisatorische Maßnahmen, Löschung.`,
  alternates: alternatesForLocale("/dpa", "de"),
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
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Auftragsverarbeitungsvertrag</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          Vereinbarung über die Verarbeitung personenbezogener Daten im Auftrag nach Art. 28 DSGVO für den Dienst Agent Tracking. Sie wird elektronisch geschlossen, wenn Sie im
          Dashboard eine Site hinzufügen (Art. 28 Abs. 9 DSGVO). Die <Link href="/dpa">englische Fassung</Link> ist verbindlich; diese Seite ist eine Übersetzung.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">Die Kurzfassung</span>
        <p>
          Für die Daten Ihrer Besucher sind Sie Verantwortlicher. Wir verarbeiten sie nur nach Ihrer Weisung, auf einem Server in {country}, ohne Netzwerkadressen zu speichern und
          ohne eigene Zwecke. Rohdaten sind nach {RAW_RETENTION_DAYS} Tagen weg. Entfernen Sie die Site im Dashboard, ist alles weg.
        </p>
      </div>

      <div className="prose terms">
        <Clause n="1" title="Parteien, Gegenstand und Dauer">
          <p>
            Dieser Vertrag wird geschlossen zwischen dem Inhaber des Kontos, das eine Site zu Agent Tracking hinzufügt (der „Verantwortliche“), und <b>{LEGAL.name}</b>,{" "}
            {LEGAL.addressLines.join(", ")} (der „Auftragsverarbeiter“). Vollständige Angaben stehen im <Link href="/de/impressum">Impressum</Link>.
          </p>
          <p>
            Gegenstand ist die Verarbeitung der Daten, die das Script <code>agent.js</code> auf den Seiten des Verantwortlichen erhebt und an den Auftragsverarbeiter sendet, von
            Server-Log-Zeilen, die der Verantwortliche hochlädt, sowie deren Speicherung, Aggregation und Anzeige im Dashboard, in der API und am MCP-Endpunkt. Anlage 1 beschreibt
            die Verarbeitung im Einzelnen.
          </p>
          <p>Der Vertrag beginnt mit dem Hinzufügen der Site und endet, wenn der Verantwortliche die Site aus dem Konto entfernt oder das Konto gelöscht wird. § 7 regelt, was dann mit den Daten geschieht.</p>
        </Clause>

        <Clause n="2" title="Art und Zweck der Verarbeitung, Datenkategorien und betroffene Personen">
          <p>
            Zweck ist eine Statistik darüber, ob und wie KI-Assistenten und KI-Agenten die Site des Verantwortlichen besuchen und ihre WebMCP-Tools nutzen. Die Verarbeitung
            besteht aus Erheben, Übermitteln, Speichern, Aggregieren zu Tagessummen, Anzeigen und Löschen.
          </p>
          <p>Die Datenkategorien sind die in Anlage 1 aufgeführten. Betroffene sind Besucher der Site des Verantwortlichen und Personen, die einen KI-Assistenten nutzen, der sie besucht.</p>
        </Clause>

        <Clause n="3" title="Weisungen">
          <p>
            Der Auftragsverarbeiter verarbeitet die Daten nur auf dokumentierte Weisung des Verantwortlichen. Dieser Vertrag und die Einstellungen, die der Verantwortliche im
            Dashboard vornimmt (Hinzufügen, Verifizieren, Veröffentlichen und Entfernen einer Site, Hochladen eines Logs), sind diese Weisungen. Weitere Weisungen erfolgen in
            Textform an <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <p>Hält der Auftragsverarbeiter eine Weisung für rechtswidrig, teilt er das dem Verantwortlichen unverzüglich mit und darf die Ausführung aussetzen, bis der Verantwortliche sie bestätigt oder ändert.</p>
          <p>
            Der Auftragsverarbeiter verarbeitet die Daten nicht für eigene Zwecke. Insbesondere werden sie nicht für Werbung, Profilbildung oder das Training von Modellen genutzt
            und nicht an Dritte weitergegeben, es sei denn, ein Gesetz verlangt es; dann informiert der Auftragsverarbeiter den Verantwortlichen vor der Verarbeitung, soweit das
            Gesetz es erlaubt.
          </p>
        </Clause>

        <Clause n="4" title="Pflichten des Auftragsverarbeiters">
          <p>Der Auftragsverarbeiter stellt sicher, dass nur zur Vertraulichkeit verpflichtete Personen Zugang zu den Daten haben.</p>
          <p>
            Er setzt die technischen und organisatorischen Maßnahmen der Anlage 2 nach Art. 32 DSGVO um und darf sie weiterentwickeln, solange das Schutzniveau nicht sinkt.
            Wesentliche Änderungen werden in Anlage 2 mit neuem Datum dokumentiert.
          </p>
          <p>
            Er unterstützt den Verantwortlichen bei der Beantwortung von Anfragen betroffener Personen. Die gespeicherten Daten enthalten keine Kennung, über die eine bestimmte
            Person auffindbar wäre; der Auftragsverarbeiter bestätigt das auf Anfrage und löscht auf Weisung die Datensätze eines benannten Zeitraums.
          </p>
          <p>
            Er unterstützt den Verantwortlichen bei den Pflichten aus Art. 32 bis 36 DSGVO, soweit die ihm verfügbaren Informationen es erlauben. Eine Verletzung des Schutzes
            personenbezogener Daten, die diese Verarbeitung betrifft, wird dem Verantwortlichen an die Kontoadresse unverzüglich nach Bekanntwerden gemeldet, mit den Angaben nach
            Art. 33 Abs. 3 DSGVO, soweit verfügbar.
          </p>
          <p>Er führt das Verzeichnis nach Art. 30 Abs. 2 DSGVO und stellt dem Verantwortlichen die Angaben bereit, die dieser für sein eigenes Verzeichnis braucht; Anlage 1 enthält sie.</p>
        </Clause>

        <Clause n="5" title="Unterauftragsverarbeiter und Drittlandübermittlung">
          <p>Der Verantwortliche stimmt dem Einsatz folgender Unterauftragsverarbeiter zu:</p>
          <ul>
            <li>
              <b>{LEGAL.hostingProvider}</b>: Bereitstellung und Anbindung des Servers, auf dem die Daten gespeichert sind. Der Hoster hat im Regelbetrieb keinen Zugriff auf die
              Inhalte der Daten.
            </li>
            <li>
              <b>GitHub, Inc.</b>, 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA: Speicherung einer täglichen Kopie der Datenbank, mit AES-256 verschlüsselt, bevor
              sie den Server verlässt, in einem privaten Repository. Den Schlüssel hält nur der Auftragsverarbeiter; GitHub kann die Inhalte nicht lesen. Die Übermittlung stützt
              sich auf den Angemessenheitsbeschluss zum EU-US Data Privacy Framework, dem GitHub angehört.
            </li>
          </ul>
          <p>
            Weitere Unterauftragsverarbeiter werden nicht eingesetzt. Insbesondere werden die Daten nicht an Anbieter von E-Mail-, Zahlungs- oder Analysediensten übermittelt;
            Nachrichten an den Verantwortlichen selbst enthalten keine Daten betroffener Personen.
          </p>
          <p>
            <b>Übermittlung an den Auftragsverarbeiter.</b> Der Auftragsverarbeiter ist in den Vereinigten Staaten niedergelassen. Alle Daten dieses Vertrags werden auf dem Server
            in {country} gespeichert und verarbeitet; der Auftragsverarbeiter erreicht ihn nur über eine verschlüsselte Administrationsverbindung, und die in Anlage 1
            beschriebenen pseudonymisierten Datensätze sind die einzigen Daten, die ein Administrator sehen kann. Für Verantwortliche in EU oder EWR sind die
            Standardvertragsklauseln der Europäischen Kommission (Beschluss (EU) 2021/914, Modul Zwei, Verantwortlicher an Auftragsverarbeiter) Bestandteil dieses Vertrags, mit
            dem Verantwortlichen als Datenexporteur, dem Auftragsverarbeiter als Datenimporteur, Anlage 1 als deren Anhang I.B, Anlage 2 als deren Anhang II, gewählter
            Kopplungsklausel, dem Recht und den Gerichten Irlands für Klausel 17 und 18 und der Aufsichtsbehörde des Mitgliedstaats des Verantwortlichen nach Klausel 13.
            Widersprechen sich dieser Vertrag und die Klauseln, gehen die Klauseln vor. Verantwortliche im Vereinigten Königreich sind durch das UK International Data Transfer
            Addendum zu denselben Klauseln erfasst.
          </p>
          <p>
            Beabsichtigt der Auftragsverarbeiter, einen Unterauftragsverarbeiter hinzuzufügen oder zu ersetzen, informiert er den Verantwortlichen mindestens 30 Tage vorher an die
            Kontoadresse. Der Verantwortliche kann aus einem wichtigen datenschutzrechtlichen Grund widersprechen. Kommt keine Einigung zustande, kann der Verantwortliche diesen
            Vertrag durch Entfernen der Site beenden.
          </p>
        </Clause>

        <Clause n="6" title="Nachweise und Kontrollen">
          <p>
            Auf Anfrage stellt der Auftragsverarbeiter dem Verantwortlichen die Informationen bereit, die zum Nachweis der Einhaltung dieses Vertrags nötig sind, in der Regel
            als Beschreibung der Verarbeitung und der Maßnahmen der Anlage 2 in Textform. Der Quellcode des Dienstes ist öffentlich und jederzeit einsehbar.
          </p>
          <p>
            Reicht das nicht aus, kann der Verantwortliche oder ein von ihm beauftragter, zur Vertraulichkeit verpflichteter Prüfer die Einhaltung kontrollieren: mit mindestens 14
            Tagen Ankündigung, zu üblichen Geschäftszeiten, ohne unverhältnismäßige Störung des Betriebs und höchstens einmal je Kalenderjahr, sofern nicht ein konkreter Anlass
            eine weitere Kontrolle erfordert. Die Kosten der Kontrolle trägt der Verantwortliche.
          </p>
        </Clause>

        <Clause n="7" title="Löschung und Rückgabe">
          <p>Unabhängig von diesem Vertrag werden Rohdaten automatisch {RAW_RETENTION_DAYS} Tage nach Erhebung gelöscht. Tagessummen bleiben, solange die Site im Konto ist.</p>
          <p>
            Entfernt der Verantwortliche die Site aus dem Konto, löscht der Auftragsverarbeiter alle Rohdaten, Tagessummen, das Tool-Register und die zugehörigen Einstellungen
            unverzüglich und dauerhaft. Dasselbe gilt für alle Sites eines Kontos, wenn das Konto gelöscht wird. Verschlüsselte Backup-Kopien laufen innerhalb von 30 Tagen ab.
          </p>
          <p>Die Tagessummen einer Site lassen sich vor dem Entfernen jederzeit im Dashboard als CSV exportieren.</p>
          <p>Gesetzliche Aufbewahrungspflichten bleiben unberührt; nach Kenntnis des Auftragsverarbeiters gelten für die hier beschriebenen Daten keine.</p>
        </Clause>

        <Clause n="8" title="Haftung">
          <p>Die Haftung der Parteien gegenüber betroffenen Personen richtet sich nach Art. 82 DSGVO. Im Verhältnis der Parteien gilt § 7 der <Link href="/de/agb">AGB</Link>.</p>
        </Clause>

        <Clause n="9" title="Schlussbestimmungen">
          <p>
            Der Vertrag kommt zustande, wenn der Verantwortliche im Dashboard eine Site hinzufügt. Er gilt entsprechend für jede weitere Site. Widerspricht er den AGB, geht er in
            Fragen des Datenschutzes vor.
          </p>
          <p>
            Ändert der Auftragsverarbeiter diesen Vertrag, veröffentlicht er die neue Fassung mit Datum unter dieser Adresse und informiert den Verantwortlichen an die
            Kontoadresse. Die neue Fassung gilt sofort für danach hinzugefügte Sites und für bestehende Sites 30 Tage nach der Mitteilung, sofern der Verantwortliche die Site nicht
            vorher entfernt.
          </p>
          <p>
            Der englische Text ist verbindlich. Der Vertrag unterliegt dem Recht, das für die AGB gilt, mit der Ausnahme, dass die in § 5 einbezogenen Standardvertragsklauseln
            gelten, wie sie es selbst vorsehen, und nichts in diesem Vertrag Rechte beschränkt, die die DSGVO betroffenen Personen oder dem Verantwortlichen einräumt.
          </p>
        </Clause>

        <section className="clause">
          <h2 id="annex1">Anlage 1: Die Verarbeitung im Einzelnen</h2>
          <p>
            <b>Erhoben und gespeichert</b> je Seitenaufruf: der Seitenpfad ohne Query-String und Fragment; der Referrer-Host und der Parameter <code>utm_source</code>, nur zur
            Zuordnung des Besuchs zu einem KI-Assistenten; das Ergebnis dieser Zuordnung (Referrer und User-Agent gegen eine veröffentlichte, versionierte Liste abgeglichen); eine
            Sitzungskennung. Bei WebMCP-Tools zusätzlich: der Toolname, ein Hash von Beschreibung und Schema, Dauer und Ergebnis eines Aufrufs (Erfolg oder Fehlschlag,
            Fehlerklasse), die Namen der Eingabefelder; der Name eines als Ziel markierten Elements bei Klick oder Absenden; ein Hash des Manifests unter{" "}
            <code>/.well-known/webmcp</code>.
          </p>
          <p>
            <b>Die Sitzungskennung</b> ist ein SHA-256-Hash aus einem täglich neu erzeugten Zufallswert, der Domain, einer groben Browserklasse (mobil oder Desktop, oder der
            Kennung eines bekannten Agenten) und der Netzwerkadresse, gekürzt auf 16 Zeichen. Die Netzwerkadresse wird nicht gespeichert. Ab dem nächsten Tag lässt sich der Hash
            nicht mehr mit dem Vortag verknüpfen.
          </p>
          <p>
            <b>Nicht erhoben:</b> die Netzwerkadresse als solche, Cookies oder anderes auf dem Gerät Abgelegtes, Werte von Eingabefeldern oder Formularinhalte, Namen,
            E-Mail-Adressen oder Konten von Besuchern, Bildschirm- oder Gerätemerkmale. Ereignisse mit anderen als den vorgesehenen Feldern und Batches von einer anderen als der
            registrierten Domain werden verworfen.
          </p>
          <p>
            <b>Server-Log-Zeilen</b>, die der Verantwortliche hochlädt oder per Script sendet: Aus einer Zeile werden Tag, Agentenname und Seitenpfad übernommen. Die Netzwerkadresse
            wird während der Verarbeitung nur genutzt, um Abrufe eines Agenten zu gruppieren und den Agenten gegen die veröffentlichten Adressbereiche seines Anbieters zu prüfen,
            und mit dem Ende der Anfrage verworfen. Die Logdatei selbst wird nicht gespeichert.
          </p>
          <p>
            <b>Dauer:</b> Rohdaten {RAW_RETENTION_DAYS} Tage; Tagessummen, Tool-Register und Manifest-Hash bis zum Entfernen der Site. <b>Ort:</b> ein Server in {country}.
          </p>
        </section>

        <section className="clause">
          <h2 id="annex2">Anlage 2: Technische und organisatorische Maßnahmen</h2>
          <ul>
            <li>
              <b>Serverzugang:</b> Der Server steht in einem Rechenzentrum in {country}. Der Zugang erfolgt ausschließlich über SSH mit Schlüsseln; Passwort-Login ist deaktiviert.
            </li>
            <li>
              <b>Zugriff auf die Daten:</b> Das Dashboard ist nur nach Anmeldung erreichbar. Die Anmeldung erfolgt über einen Link an die Kontoadresse, 30 Minuten und einmal
              gültig; die Sitzung endet nach 30 Tagen oder beim Abmelden. Jede Site ist nur für ihren Kontoinhaber sichtbar. Eine öffentliche Stats-Seite erscheint nur, wenn der
              Verantwortliche sie ausdrücklich einschaltet, und zeigt nur Summen.
            </li>
            <li>
              <b>Pseudonymisierung und Datenminimierung:</b> wie in Anlage 1. Der Zufallswert für die Sitzungskennung wird täglich neu erzeugt und der alte verworfen. Batches über
              50 Ereignisse, Felder außerhalb der Liste, Query-Strings und Eingabewerte werden beim Empfang verworfen.
            </li>
            <li>
              <b>Übertragung:</b> Script, Ingest-Endpunkt und Dashboard werden nur über TLS ausgeliefert und nehmen Daten nur über TLS an.
            </li>
            <li>
              <b>Trennung:</b> Daten werden je Domain gespeichert und abgefragt; der Ingest ist je Konto und je sendender Adresse begrenzt.
            </li>
            <li>
              <b>Löschung:</b> Rohdaten werden täglich automatisch nach {RAW_RETENTION_DAYS} Tagen gelöscht. Das Entfernen einer Site löscht alle ihre Daten in einer Transaktion.
            </li>
            <li>
              <b>Verfügbarkeit:</b> Die Datenbank schreibt transaktional. Täglich wird ein konsistenter Snapshot mit AES-256 verschlüsselt und außerhalb des Servers abgelegt (siehe
              § 5); den Schlüssel hält nur der Auftragsverarbeiter.
            </li>
            <li>
              <b>Änderungskontrolle:</b> Der Dienst wird aus öffentlichem, versioniertem Quellcode mit automatisierten Tests ausgerollt. Verworfene Batches werden ohne Personenbezug
              gezählt.
            </li>
          </ul>
        </section>

        <p className="terms-date">Stand {LEGAL.revised}.</p>
      </div>

      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--ink-2)" }}>Eine Frage zu diesem Vertrag, oder Ihr Datenschutzbeauftragter braucht eine unterschriebene Fassung? Eine E-Mail genügt.</p>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
            {CONTACT_EMAIL}
          </a>
          <Link href="/de/datenschutz">Datenschutz</Link>
          <Link href="/de/agb">AGB</Link>
          <Link href="/de/docs">Dokumentation</Link>
        </p>
      </div>
    </article>
  );
}
