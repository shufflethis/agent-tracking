# Umsetzungsauftrag für agenttracking.co

Du arbeitest als implementierender Entwickler im Repository `/root/agent-tracking`.
Setze die folgenden Korrekturen und anschließend die beschriebenen Produktfunktionen um.
Liefere funktionierenden Code, Tests und Dokumentation. Ein Plan allein erfüllt den Auftrag nicht.

Preise, Preisexperimente, Stripe-Konfiguration, Tarifnamen, Domainlimits, konfigurierte
Eventlimits und kommerzielle Planänderungen sind außerhalb des Auftrags.
Die technische Korrektur, welche Ereignisse ein Kontingent verbrauchen, gehört dazu.

## Arbeitsweise

1. Lies anwendbare `AGENTS.md`, `package.json`, `README.md` und den aktuellen Git-Status.
   Der Ausgangsaudit bezog sich auf Commit `b528c09`; prüfe den heutigen Code, bevor du
   einen Befund übernimmst. Bewahre Änderungen anderer Beteiligter.
2. Arbeite die Phasen unten in Reihenfolge ab. Implementiere jeweils ein kleines,
   zusammenhängendes Paket. Prüfe dessen Abnahmekriterien vor dem nächsten Paket.
3. Pflege `IMPLEMENTATION-STATUS.md`: Paket-ID, offen/in Arbeit/erledigt/blockiert,
   betroffene Dateien, ausgeführte Prüfungen, Ergebnis, offene Voraussetzung und
   konkreter nächster Schritt. Erledigt bedeutet implementiert und überprüft.
4. Halte wichtige Entscheidungen in dieser Datei fest. Lies sie nach einem Neustart
   oder Kontextwechsel und setze am ersten offenen Punkt fort.
5. Verwende Next.js, TypeScript, SQLite und die vorhandene Architektur weiter.
   Vermeide einen Frameworkwechsel, neue Microservices und ein neues Abrechnungssystem.
   Zusätzliche Infrastruktur nur für eine konkret belegte Anforderung einführen.
6. Stelle Rückfragen nur, wenn eine Information wirklich fehlt. Triff reversible
   Implementierungsentscheidungen selbst und dokumentiere sie. Fehlende Zugangsdaten
   für optionale externe Funktionen blockieren nicht die unabhängigen Korrekturen.
7. Nutze Tests mit isolierten Datenbanken und lokalen Testseiten. Keine Testereignisse,
   Testkunden, Buchungen oder Nachrichten in Produktionssystemen erzeugen.
   Keine Secrets, vollständigen Umgebungsdateien oder echten Nutzerdaten ausgeben.
8. Schreibe sinnvolle Verhaltenstests für Messlogik, Migration, Berechtigungen und
   Deduplizierung. Passe bestehende Tests an die korrigierte Semantik an; entferne
   keine fehlgeschlagenen Assertions nur, damit der Testlauf grün wird.
9. Halte Oberfläche, Hilfetexte und Fehlermeldungen auf Deutsch und Englisch konsistent.
   Bewahre den bestehenden Stil. Bewahre insbesondere den direkten Einstieg nach
   dem Hinzufügen unter `/app/[domain]/settings#install` und den Verifizierungsstatus.
10. Trenne Fakten, unbekannte Zustände und Simulationen durchgehend. Erfinde keine
    Agentenidentität, keine erfolgreiche Messung und keine geschäftlichen Ergebnisse.
11. Erstelle nach überprüften Paketen nachvollziehbare Commits. Veröffentliche am Ende
    den geprüften Gesamtstand gemäß der unten beschriebenen Abschlussphase.

## Fachliche Regeln für alle Phasen

- Ein AI-Referral ist ein Besuch mit identifizierbarer Herkunft. Er beweist nicht,
  dass der Browser anschließend von einem Agenten bedient wurde.
- Ein User-Agent-String ist eine Behauptung. Ein IP-Nachweis bestätigt die Übereinstimmung
  mit einer dokumentierten Liste, nicht die Identität eines konkreten Sprachmodells.
- Ein Tool-Aufruf ist ein beobachteter Aufruf. Technisch beendet, fachlich erfolgreich,
  abgebrochen und unbekannter Ausgang sind unterschiedliche Zustände.
- Ein Geschäftsabschluss benötigt eine vertrauenswürdig angenommene Servermeldung.
  Ob ein Agent beteiligt war, benötigt zusätzlich eine explizite Verknüpfung und
  ausgewiesene Evidenz. Ein bestätigter Abschluss mit unbekanntem Akteur bleibt so benannt.
- Herkunft des Reports, Identität des Akteurs und Bestätigung des Ergebnisses sind
  getrennte Eigenschaften. Ein signierter Collector macht Browserbehauptungen nicht wahr.
- Fehlende Messung ist kein gemessener Wert von null. Produktive Nutzung, durch AI
  vermittelte menschliche Besuche und synthetische Tests bleiben getrennt.
- Keine vollständige Erkennung aller Agenten, Rekonstruktion geheimer Prompts,
  sichere Zitierungszuordnung oder kausale Umsatzwirkung aus Crawl-Bursts behaupten.

## Phase 1: Ereignismodell, Migration und sichere Verarbeitung

Betroffene Ausgangsdateien:
`lib/tracking/classify.ts`, `lib/tracking/db.ts`, `app/api/event/route.ts`,
`lib/tracking/dashboard.ts`, `lib/tracking/stats-api.ts`, `app/api/stats/`,
`app/api/export/`, `app/api/mcp/`, `lib/tracking/digest.ts`.

### F01 – Versionierter Messvertrag

Definiere einen kleinen zentralen TypeScript-Vertrag und dokumentiere ihn in
`docs/measurement.md`. Verwende vorhandene Felder, wo sie passen. Ergänze mindestens:

- Schemaversion und stabile Ereignis-ID;
- Ereigniszeit und Annahmezeit;
- Site und Quelle: Browser, Log, Server oder kontrollierter Test;
- Akteurbehauptung, tatsächliche Nachweise und deren Prüfzustand;
- Referral-Quelle als eigenständige Eigenschaft;
- beobachtete Aktion und deren Ergebnis;
- optionale Task-, Invocation-, Parent- und Release-ID;
- nachweisbare Tool-/Schema-Version;
- Kennzeichnung synthetischer Daten.

Nutze getrennte Zustände für technischen Ablauf und fachlichen Abschluss. Vertraue
clientseitigen Feldern wie `verified`, `server_confirmed`, `transport` oder `model`
nicht: Der annehmende Server setzt vertrauensrelevante Eigenschaften selbst.

Stabile IDs müssen einen Retry desselben Ereignisses erkennen, ohne zwei unabhängige
identische Aktionen zusammenzufassen. Deduplizierung und Aggregation erfolgen atomar.
Die Zugehörigkeit eines Ereignisses zu einer Site ist Teil seiner Identität.

### F02 – Bestehende Daten und Clients erhalten

Implementiere versionierte, wiederholt ausführbare SQLite-Migrationen. Alte Snippets
müssen weiter angenommen werden, bekommen aber nur die tatsächlich belegbare Einstufung.

Bestehende Conversion-Zähler ohne Abschluss-/Agentennachweis als historische Werte
mit alter Definition kennzeichnen. Keine nachträgliche Hochstufung und keine erfundene
Rekonstruktion aus Summen. Zeige bei Definitionswechseln eine nachvollziehbare Grenze.
Vergleiche Zeiträume mit unterschiedlichen Definitionen nicht kommentarlos.

Ändere die Semantik vorhandener öffentlicher API-Felder nicht stillschweigend.
Nutze additive Felder oder eine explizite API-Version. Stelle Dashboard, Export,
öffentliche Statistik, Digest und MCP-Ausgabe konsistent auf die neuen Definitionen um.

### F03 – Eingaben begrenzen und Vertrauensgrenzen erhalten

Begrenze Requestgrößen beim Lesen; berücksichtige entpackte Loggrößen. Validierung,
Ratenbegrenzung und Quoten müssen auch bei mehreren Batches nachvollziehbar bleiben.
Origin-Prüfung schützt nicht gegen direkte HTTP-Clients mit selbst gesetzten Headern.
Behalte Browserbeacons als unbeglaubigte Beobachtungen. Hinterlege kein geheimes
Authentifizierungstoken im öffentlichen Snippet.

Prüfe die Sonderbehandlung, mit der die eigene Origin für beliebige Sites posten kann.
Demo-/Testfälle dürfen keine beliebigen produktiven Kundendaten verändern oder deren
Vertrauensstufe erhöhen. Fehler/Drops werden intern gezählt und dem berechtigten
Site-Nutzer als Messzustand zugänglich, ohne öffentliche Detaillecks.

Abnahme Phase 1:

- Migration funktioniert auf leerer und befüllter Testdatenbank und bei Wiederholung.
- Altes Snippet bleibt kompatibel; alte Daten werden nicht fälschlich bestätigt.
- Zwei Meldungen derselben Event-ID zählen einmal, verschiedene IDs zählen zweimal.
- Eine ID in einer anderen Site erlaubt weder Zugriff noch Veränderung der ersten Site.
- Ein gefälschtes Browserfeld kann keinen IP-Nachweis oder Serverabschluss erzeugen.
- Quoten- und Verarbeitungsfehler führen nicht zu einem scheinbar gesunden Datenstrom.

## Phase 2: Browser- und Tool-Messung korrigieren

Betroffene Ausgangsdateien: `snippet/agent.src.js`, `scripts/build-snippet.mjs`,
`lib/tracking/classify.ts`, `lib/tracking/db.ts`, `app/api/event/route.ts`, Tests.

### F04 – Klick, Submit und Abschluss auseinanderhalten

`data-agent-goal` darf einen Zielversuch bzw. eine normale Browseraktion melden.
Ein menschlicher Klick erhöht keine bestätigten Agenten-Conversions. Ein Submit wird
nicht pauschal als erfolgreicher Tool-Aufruf gewertet. Beachte abgebrochene, verhinderte
und ungültige Formulare. Klick plus Submit für dieselbe Aktion darf nicht denselben
Zielversuch doppelt erzeugen; Wiederholungsversuche benötigen eigene IDs.

Verlasse dich nicht allein auf `isTrusted`, Headless-Merkmale oder `toolname`, um einen
Agenten zu behaupten. Ohne belastbaren Aufrufkontext bleibt der Akteur unbekannt.

### F05 – Technischer und fachlicher Tool-Erfolg

Ein Throw bzw. eine Promise-Rejection wird als technischer Fehler erfasst. Ein
erfülltes Promise ist nur technisch beendet. Fachlicher Erfolg benötigt einen
expliziten, dokumentierten Ergebnisvertrag oder die Serverbestätigung aus Phase 5.
Interpretiere keine beliebigen Rückgabeobjekte heuristisch als Buchungserfolg.

Decke Cancellation, Timeout, noch laufende Aufrufe und unbekannten Ausgang ab.
Die Instrumentierung muss Argumente, `this`, Rückgabewerte und Fehlerweitergabe der
Originalfunktion erhalten. Ein Aufruf darf nur einen finalen Zustand bekommen.

### F06 – Registrierung und Lifecycle zuverlässig erfassen

Instrumentiere eine bereits verfügbare API sofort. Ergänze kontrollierte Unterstützung
für später verfügbare APIs. Vermeide doppeltes Wrapping. Untersuche, welche vorhandenen
Registrierungen sich mit den tatsächlich verfügbaren APIs beobachten lassen; wo das
nicht geht, biete eine explizite optionale SDK-Integration und zeige die Lücke an.

Prüfe die aktuelle offizielle WebMCP-Spezifikation und unterstützte Browserfassungen,
bevor du Lifecycle-APIs einsetzt. Führe eine kleine Kompatibilitätsmatrix. Die damaligen
API-Namen im Code sind keine Garantie für heutige Unterstützung. Ein fehlendes API
bedeutet „nicht unterstützt“. Verwende keine erfundenen Ereignisse oder Fallback-Erfolge.

Erfasse Änderungen und Entfernen von Tools, parallele Aufrufe und Versionswechsel.
Eine spät bemerkte Tool-Existenz ist kein Beweis für die Erfassung früherer Aufrufe.
Behalte das bestehende Größenlimit des Kernsnippets bei. Falls zusätzliche Fähigkeiten
ein SDK benötigen, liefere es gesondert und dokumentiere dessen Einbindung.

### F07 – Datenschutz durch konkrete Datenauswahl

Speichere standardmäßig begrenzte Fehlercodes/-klassen statt beliebiger Error-Nachrichten.
Keine Argumentwerte, Formularwerte, Prompts, Tokens oder Querystrings erfassen.
Bereinige Pfade anhand dokumentierter Regeln; unterstütze konfigurierte Pfadvorlagen
für sensible Routen. Unbekannte sensible Pfade können als `[redacted]` erscheinen.
Behaupte nicht, dass ein allgemeiner Regex sämtliche personenbezogenen Pfade erkennt.

Teste Fehlertexte mit E-Mail, Zugangstoken und Formulareingaben. Diese Werte dürfen
nicht in Events, Logs, Exporten oder Berichten landen. Keine Cookies, Browserstorage
oder zusätzliche Fingerprinting-Signale zur Lösung der Zuordnungsprobleme einführen.

Abnahme Phase 2:

- Menschlicher Zielklick: kein bestätigter Agenten-Abschluss.
- Klick und Submit derselben Aktion: keine doppelte Conversion/kein doppelter Versuch.
- Verhinderter menschlicher Submit: kein erfolgreicher Agenten-Tool-Aufruf.
- Promise mit fachlicher Ablehnung: kein fachlicher Erfolg.
- Throw, Reject, Cancel und Timeout sind unterscheidbar.
- Frühe/späte Registrierung und wiederholte Instrumentierung sind getestet.
- Nicht erfasste Fälle werden als Lücke dokumentiert, statt als null verkauft.
- Originalfunktion bleibt funktional; sensible Testwerte werden nicht gespeichert.

## Phase 3: Bot-Klassifikation, Logaufnahme und Vollständigkeit

Betroffene Ausgangsdateien: `lib/tracking/ai-sources.json`, `classify.ts`,
`bot-ranges.ts`, `log-import.ts`, `db.ts`, `app/api/logs/[domain]/route.ts`,
`scripts/log-import.ts`, `scripts/tracking-cron.ts`, Dashboard und Tests.

### F08 – Tatsächliche Nachweise erhalten

Ersetze eine reine Einteilung „verifizierbar“ durch den tatsächlichen Nachweiszustand
der erfassten Requests: bestätigt, fehlende Daten, veraltete Daten, fehlgeschlagene
Prüfung oder prinzipiell kein Nachweis verfügbar. Verifizierungsmethode, Listenstand
und Zeitpunkt müssen nachträglich erklärbar sein. Das reine Vorhandensein einer
RANGE_SOURCES-Zuordnung erzeugt kein Verified-Label.

Führe den Aktualisierungszustand pro Anbieter. Ein erfolgreicher Abruf einer anderen
Liste macht eine alte fehlgeschlagene Liste nicht wieder frisch. Nutze eine dokumentierte
konfigurierbare Frist für die Gültigkeit. Nicht bestätigte Claims dürfen sichtbar bleiben,
gehen aber nicht in bestätigte Crawlerzahlen ein. Gleiche Regeln für Log- und Browserpfad.

### F09 – Agentenliste fachlich bereinigen

Prüfe Einträge gegen Primärquellen. Google-Extended besitzt laut Google keinen eigenen
HTTP-UA; Applebot-Extended crawlt laut Apple selbst keine Seiten. Behandle solche
Richtlinientokens separat von tatsächlich beobachtbaren Requests.

Vermeide breite Substring-Treffer und die pauschale Einstufung normaler Suchcrawler als
bewiesene AI-Nutzung. Unternehmenswebsite-Referrals sind nicht automatisch Besuche aus
einer Assistant-Antwort. Bewahre Referrer-/UTM-Nachweise, ohne sensible vollständige
Referrer-URLs zu speichern. Überschneidungen und Pfadregeln brauchen Tests.

Modellgestützte UA-Vorschläge bleiben überprüfbare Vorschläge. Sie dürfen keinen
Verifikationsstatus oder bestätigte Messwerte automatisch erzeugen.

### F10 – Fehlgeschlagene Zugriffe und Ressourcentypen

Erhalte relevante 2xx/3xx/4xx/5xx sowie GET/HEAD/sonstige Methoden als eigene Dimensionen.
3xx sind Redirects, keine bereits ausgelieferten Zielseiten. Bewahre relevante HTML-,
PDF-, JSON-, API- und Discovery-/Manifest-Anfragen mit Ressourcentyp. Assets dürfen
getrennt aggregiert werden. Fehlende Content-Type-/Timing-Daten bleiben null; eine aus
der Endung abgeleitete Vermutung muss als solche erkennbar sein.

Das UI muss Zugriffsversuch, erfolgreiche Auslieferung, Redirect, Blockierung,
Rate-Limit und Serverfehler unterscheiden. Ein 200-Request beweist nicht, dass der
Agent den Inhalt verstanden oder zitiert hat. Referrals und Fetches nicht in einer
unbeschrifteten Seitenmetrik oder einer gemeinsamen Besucherquote vermischen.

### F11 – Importcursor und Idempotenz

Ersetze den einen globalen Zeitstempel durch einen Zustand pro Site und Quelle.
Der neue Collector liefert stabile Quell-/Generations-/Datensatzidentitäten, etwa
Dateigeneration und Byteoffset oder eine stabile Request-ID. Zeit ist kein eindeutiger
Schlüssel. Identische Logzeilen können echte unterschiedliche Requests sein.

Implementiere zuerst einen generischen, authentifizierten Quelladapter und einen
funktionierenden lokalen nginx/Apache-Collector. Unterstütze Rotation, Wiederholung,
verspätete Zeilen und atomaren Fortschritt von Zählern und Cursor. Bei Fehlern darf ein
erneuter Import keine akzeptierten Daten doppelt zählen und keine offenen verlieren.

Bewahre den bisherigen Uploadpfad mit klar definiertem Kompatibilitätsmodus. Wenn sich
beliebige überlappende Chunks ohne Quellmetadaten nicht eindeutig zuordnen lassen,
fordere die nötigen Metadaten an oder dokumentiere einen verlässlichen Vollsnapshotmodus.
Verkaufe einen bloßen Hash der Logzeile nicht als allgemeine Lösung.

Der Schalter `log_since` darf bei einem ausgefallenen oder unbrauchbaren Import nicht
unbemerkt eine vollständige Erfassung suggerieren. Definiere Quellenpriorität,
Überlappung und Lücken zwischen Browser und Log; ohne gemeinsame Request-ID nicht
behaupten, beide Quellen vollständig deduplizieren zu können.

### F12 – Bursts und geschätzte Sitzungen

Ein mehrseitiger Burst benötigt mindestens drei unterschiedliche relevante Pfade.
Mehrfachabrufe einer Seite sind kein mehrseitiger Burst. Behandle Importgrenzen
nachvollziehbar; kann ein Zusammenhang nicht erhalten werden, zeige die Einschränkung.
Keine Nutzerfrage oder sichere Absicht aus einem Burst ableiten.

Beschrifte den täglichen Session-Hash als Näherung: mehrere Menschen hinter derselben
IP mit derselben Browserklasse können zusammenfallen. Keine genauen Personen oder
Agentenzahlen daraus ableiten. Session-Auswertungen über die Tarifhistorie dürfen nach
90 Tagen Rohdatenlöschung nicht heimlich zu null werden; nutze passende Tagesaggregate
oder kennzeichne den abweichenden Messzeitraum ausdrücklich.

### F13 – Technisch korrekte Kontingentzählung

Zähle Registrierungen, Einrichtungsprüfungen, synthetische Tests und nicht bestätigte
Bot-Claims nicht als bestätigte Agentenereignisse. Lege eine zentrale technische
Zählregel fest und verwende sie konsistent in Browser- und Logpfad.

Verhindere Doppelverbrauch bei Retries und atomare Überschreitungen beim Batch.
Kostenfreie Messzustände dürfen bei erreichtem Eventkontingent nicht verschwinden.
Ein erreichter Grenzwert muss als Ursache fehlender Daten sichtbar werden. Ändere
keine Preise, Planlimits oder bereits gebuchten Zahlungsbeträge.

Abnahme Phase 3:

- Fehlende/abgelaufene IP-Liste erzeugt keinen bestätigten Crawlerwert.
- Netzwerk-Mismatch und „keine Liste vorhanden“ sind unterschiedliche Ergebnisse.
- 403/429/500, Redirects, PDFs und API-Requests bleiben richtig kategorisiert sichtbar.
- Zwei verschiedene Requests derselben Sekunde zählen beide.
- Ein später eingetroffener älterer Request wird nicht allein wegen seiner Zeit verworfen.
- Identischer Reimport zählt einmal; legitime identische Zeilen zählen entsprechend ihrer IDs.
- Zwei Quellen, Rotation, Crash/Retry und Cursorfortschritt sind getestet.
- Drei Requests derselben Seite ergeben keinen mehrseitigen Burst.
- Wiederholte Toolregistrierung und Einrichtungstests verbrauchen kein Eventkontingent.
- Dashboard, Export, API, MCP und Digest verwenden dieselben korrigierten Definitionen.

## Phase 4: Einrichtung und Messzustand verständlich machen

Betroffene Ausgangsdateien: `components/SiteActions.tsx`, `DashboardShell.tsx`,
`app/(en)/app/page.tsx`, `app/(en)/app/[domain]/page.tsx`,
`app/(en)/app/[domain]/settings/page.tsx`, `lib/tracking/copy.ts`,
`app/api/sites/route.ts`, `lib/tracking/score.ts`, Cron und DB.

### F14 – Verifiziert bedeutet genau eine Sache

Behalte „✓ Snippet verifiziert“ als Installationsstatus. Ergänze unabhängig davon:
erster tatsächlich angenommener Beacon, letzter angenommener Beacon, Logquelle und
Datenfrische, geprüfte Tool-Erfassung und eingerichtete Abschlussquelle.

Einrichtungstests bekommen eigene Test-IDs und belasten keine Produktionsstatistik.
Ein fehlgeschlagener erneuter Snippet-Check darf nicht kommentarlos weiterhin aktuelle
Erreichbarkeit behaupten. Bewahre den letzten erfolgreichen Check und zeige den
letzten Prüfversuch mit Ergebnis. Nach erfolgreichem Einrichten ist der nächste
sinnvolle Schritt direkt erreichbar.

### F15 – Echter Scanstatus und klare Nullzustände

Ergänze nachvollziehbare Scanversuche: geplant, läuft, erfolgreich, fehlgeschlagen,
deaktiviert. Speichere Zeitpunkt und bereinigte Fehlerursache. Verwende die vorhandene
Job-/Cron-Struktur, soweit möglich. Verknüpfe den Hinweis „innerhalb von 24 Stunden
geplant“ mit tatsächlicher Konfiguration/Planung. Kein endloses neues Zeitversprechen
allein durch erneute Verifizierung. Kein geplanter Scan bei deaktiviertem Check-Service.

Eine Null erscheint nur bei aktiver Messquelle und tatsächlich keinem beobachteten
Ereignis im angegebenen Zeitraum. Sonst „noch keine Daten“, „nicht eingerichtet“,
„Quelle veraltet“, „Kontingent erreicht“ oder „nicht unterstützt“ anzeigen.

Abnahme Phase 4: Der Ablauf Hinzufügen → Installieren → Prüfen → Messzustand ist auf
Deutsch und Englisch bedienbar. Script-Verifizierung, Scan und reale Datenannahme sind
klar unterscheidbar. Simulierte Erfolge oder dekorative grüne Zustände sind ausgeschlossen.

## Phase 5: Serverbestätigte Abschlüsse und explizite Verknüpfung

### F16 – Eine funktionierende Abschlussintegration

Implementiere einen dokumentierten Server-Endpunkt und eine kleine TypeScript-Hilfe
für genau eine erste Abschlussart: erfolgreich angelegte Anfrage oder Buchung.
Ein generischer Adapter plus eine vollständige lokale Beispielintegration genügt.

Serverzugänge sind an Site und Schreibzweck gebunden, widerrufbar und getrennt vom
bisherigen Stats-Lesetoken. Verwende etablierte Authentifizierung; akzeptiere keine
Browserbeacons als Serverabschluss. Bei Signaturen über rohe Bytes prüfen, mit
Zeitfenster und Replaybehandlung. Credentials nie im Browser ausliefern.

Erhalte eine stabile Beleg-ID, Task-/Invocation-ID soweit vorhanden, Abschlussart,
Zeitpunkt und fachlichen Status. Betrag/Währung sind optional; keine Zahlungsdaten,
Kontaktinformationen oder Bestellinhalte standardmäßig speichern.

Abschlussmeldungen können vor dem passenden Versuch ankommen. Verknüpfe sie atomar,
nach Site getrennt und idempotent, sobald beide vorhanden sind. Eine vom Browser frei
erfundene Task-ID reicht nicht für eine Hochstufung zum bestätigten Agenten-Abschluss.
Bewahre nachvollziehbar, welche Teile der Kette vom Server bestätigt und welche nur
beobachtet wurden. Ohne ausreichenden Kontext bleibt der Akteur unbekannt.

Remote-MCP-Telemetrie benötigt einen eigenen Serveradapter. Stelle eine dokumentierte
Integration für serverseitige Tool-Aufrufe bereit, die denselben Messvertrag verwendet.
Keine Behauptung, das Browser-Snippet könne sämtliche externen MCP-Aufrufe beobachten.

Abnahme Phase 5:

- Echte lokale Beispielintegration erzeugt einen bestätigten Abschluss im Testsystem.
- Gleicher Beleg zweimal zählt einmal; ein neuer Beleg zählt zusätzlich.
- Widerrufener, fremder oder nur lesender Zugang kann nicht schreiben.
- Browserfake und gültiger Serverbeleg mit unbekanntem Akteur bleiben korrekt getrennt.
- Out-of-order-Verknüpfung und Mandantentrennung funktionieren.
- UI zeigt Versuche, bestätigte Abschlüsse und unbekannten Ausgang mit passendem Nenner.

## Phase 6: Kontrollierte Aufgabentests und Nachtests

### F17 – Schmaler, echter Runner

Implementiere eine Aufgabenart für eine Anfrage-/Buchungsstrecke und einen lokal
ausführbaren Browserrunner. Verwende feste Testdaten und explizite Erfolgsbedingungen.
Der Runner protokolliert Run-ID, Aufgabe, Versionen, Start/Ende, Schritte, Ergebnis und
bereinigte Fehler. Standardmäßig gegen Test-/Stagingseiten; keine echten Bestellungen,
Buchungen, Nachrichten oder sonstigen externen Verpflichtungen im Test erzeugen.

Unterscheide deterministische Browserprüfung und modellgesteuerten Agententest sichtbar.
Ein Playwright-Script wird nicht durch Umbenennung zum fremden Agenten. Für einen
modellgesteuerten Lauf muss ein tatsächlich konfigurierter Provideradapter verwendet
werden. Ohne Konfiguration: „nicht eingerichtet“, niemals ein simulierter Erfolg.

Begrenze erlaubte Ziele, Weiterleitungen, Laufzeit, Schritte, Parallelität und externe
Modellnutzung. Ein allgemein steuerbarer Runner darf nicht zu einem SSRF-Endpunkt werden.
Vorhandene Prüfung öffentlicher Hosts wiederverwenden; localhost-Ausnahmen nur im
isolierten lokalen Testmodus. Persistenter Runstatus muss Abstürze/Timeouts verkraften.

Alle Runnerereignisse werden serverseitig als synthetisch markiert. Sie fließen nicht
in produktive Conversion-/Traffic-Zähler. Der Runner selbst und Ergebnisse bleiben
hinter den Site-Berechtigungen. Wiederholtes Starten derselben Job-ID ist idempotent.

### F18 – Änderungen und Wiederholung nachvollziehen

Speichere einen Verlauf von Tool-/Schema-/Release-Versionen. Verknüpfe einen Fehler
mit einer dokumentierten Korrektur und einem neuen Run derselben Aufgabe.
Zeige Vorher/Nachher mit Stichprobe, Versionsstand, Testbedingungen und Unknown-Anteil.
Unterschiedliche Aufgaben oder Modellversionen nicht als kontrollierten Vergleich ausgeben.
Keinen kausalen Umsatzgewinn aus einer bloßen zeitlichen Veränderung berechnen.

Abnahme Phase 6: Eine lokale Beispielstrecke scheitert reproduzierbar an einem
konkreten Fehler. Nach einer lokalen Korrektur bestätigt ein neuer Run den Erfolg.
Der Bericht enthält echte Run-IDs und bleibt vollständig aus produktiven Kennzahlen
heraus. Ohne externen Provider sind Agentenläufe ausdrücklich unkonfiguriert; lokale
Browserprüfungen und der übrige Ablauf funktionieren trotzdem.

## Phase 7: Befunde, Agenturberichte und wiederverwendbares Wissen

### F19 – Kundenarbeit abbilden

Erweitere das bestehende Account-/Site-Modell so klein wie möglich um explizite
Site-Berechtigungen, Befunde und deren Bearbeitungszustand. Mindestens Eigentümer und
Leseberechtigter; Schreibrechte und Eigentumswechsel nicht implizit vergeben.
Einladungen/Zugangslinks müssen widerrufbar und begrenzt sein. Keine echten Einladungsmails
oder Testnachrichten während der Implementierung versenden.

Ein Befund enthält Evidenzreferenzen, betroffene Aufgabe/Version, Fehlerkategorie,
Beschreibung, Verantwortlichen, Status, Korrektur und optionalen Nachtest.
Status wie offen, in Arbeit, behoben und durch Nachtest bestätigt sind unterscheidbar.

Erstelle eine druckbare HTML-Berichtsansicht und einen strukturierten Export pro Site:
Messabdeckung → beobachtetes Problem → Korrektur → Nachtest → offene Punkte.
Schütze Links und Artefakte mit denselben Rechten wie das Dashboard. Öffentliche
Statistikseiten erhalten nicht automatisch interne Befunde oder Abschlussbelege.

### F20 – Grundlage für bessere Diagnosen

Lege eine versionierte Sammlung allgemeiner Fehlerkategorien und überprüfbarer
Korrekturrezepte an. Befunde dürfen passende Rezepte referenzieren. Trenne tatsächlich
bestätigte Korrekturen von Vorschlägen. Erfinde keine erfolgreichen Fälle.

Kundenspezifische Fälle bleiben beim jeweiligen Kunden. Keine mandantenübergreifende
Übernahme von Traces, Prompts oder Daten für Benchmarks/Training ohne ausdrückliche
Freigabe. Implementiere jetzt keine vorgetäuschten Branchenränge oder Netzwerkeffekte.

Abnahme Phase 7: Ein Kunde mit Leserechten kann nur seine freigegebene Site und deren
Berichte lesen. Ein anderer Kunde kann weder IDs erraten noch Exporte/Artefakte abrufen.
Ein Befund lässt sich vom Fehler über die Korrektur bis zum echten Nachtest verfolgen.

## Phase 8: Produkttexte, Gesamtprüfung und Veröffentlichung

### F21 – Nur nachweisbare Fähigkeiten beschreiben

Suche in Website, README, Docs, Guides, llms.txt, API-/MCP-Beschreibungen und Kopien nach
unbelegten Claims: alle Agenten, jeder Tool-Aufruf, keine persönlichen Daten garantiert,
alle Requests IP-verifiziert, sichere Fan-outs/Prompts, alleiniger Anbieter,
automatische Agenten-Conversions oder globales MCP-Tracking durch ein Browser-Snippet.

Ersetze sie durch die implementierte, überprüfbare Funktionsbeschreibung einschließlich
relevanter Messgrenzen. Technische Datenauswahl präzise beschreiben; daraus keine
pauschalen juristischen Garantien ableiten. Keine neuen Preis- oder Tariftexte verfassen.

### F22 – Release-Gates

Vor Abschluss alle Paket-IDs F01–F22 im Status prüfen. Es dürfen keine Platzhalter,
Demo-Ergebnisse als Produktdaten oder als erledigt markierte reine Interfaces verbleiben.
Fehlende externe Konfigurationen exakt benennen und die betroffenen Funktionen korrekt
deaktiviert halten. Unabhängige Pflichtkorrekturen trotzdem vollständig abschließen.

Führe die erforderlichen Projektprüfungen aus:

    npm run typecheck
    npm test
    npm run build
    git diff --check

Prüfe die relevanten Benutzerabläufe im Browser und die API-Berechtigungen mit isolierten
Testdaten. Prüfe Migration und Datenhaltung an einer konsistenten Testkopie; ein
Migrationsfehler darf nicht erst im Live-Deploy auffallen. Notiere eine Wiederherstellung
von vorherigem Code und konsistenter Datenbank; ein Git-Revert allein rollt Daten nicht zurück.

Erstelle den Abschlusscommit, pushe den vorgesehenen Branch und verwende das vorhandene
`deploy.sh`, sobald die Prüfungen erfolgreich sind. Bewahre vor schreibenden produktiven
Migrationen eine konsistente Sicherung über die SQLite-Backupfunktion bzw. den vorhandenen
Backupweg; kopiere bei aktiver WAL-Nutzung nicht einfach nur die Hauptdatei.

Beachte technische Freigaben des Environments. Umgehe keine Sandbox oder abgelehnten
Aktionen. Nach Deployment Dienstzustand, HTTP-Antwort, relevante neue Routen und
Migrationsstand prüfen. Live keine Testbuchungen auslösen.

Der Abschlussbericht nennt: erledigte Paket-IDs, relevante Tests, verbleibende echte
Voraussetzungen, Commit/Push/Deploy-Status und Änderungen an historischen Kennzahlen.

## Quellen zur technischen Verifikation

- WebMCP: https://webmachinelearning.github.io/webmcp/
- Google-Crawler und Steuerungstokens:
  https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- Applebot: https://support.apple.com/en-gb/119829
- Bestehende signierte Bot-Identität, soweit ein Adapter sie unterstützt:
  https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/

Prüfe aktuelle Primärquellen nur für die jeweils bearbeitete Integration. Wenn ein
Nachweisverfahren nicht implementiert ist, bleibt sein Zustand „nicht unterstützt“.

Beginne jetzt mit dem Repository-Status und F01. Arbeite danach Paket für Paket weiter.
