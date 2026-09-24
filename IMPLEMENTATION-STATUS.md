# Agent Tracking – Umsetzung

Stand: 2026-09-25. Arbeitsgrundlage: `IMPLEMENTATION-PROMPT.md`.

## Fortschritt

| Paket | Status | Ergebnis / Prüfung | Nächster Schritt |
| --- | --- | --- | --- |
| F01 | erledigt | `measurement.ts`, v2-Protocol, serverseitig gesetzte Evidenz, atomare Site/Transport-ID-Deduplizierung und `docs/measurement.md`. Vier Verhaltenstests bestanden; `npm run typecheck` und bisheriger Gesamttest bestanden. | F02 beginnen. |
| F02 | erledigt | Wiederholbare Migration aus F01; alte `conversion`-Zähler in Dashboard, Statistikseite, JSON-API, CSV, Digest und MCP als unbestätigte Browser-Zielsignale ausgewiesen. Additive API-Felder und Definitionshinweise; Typecheck bestanden. | F03 beginnen. |
| F03 | erledigt | Stream-Limits vor dem Puffern, 64-MB-Grenze auch nach gzip, Plattform-Origin-Ausnahme entfernt, interne Drop-Zähler und private Health-Ausgabe. Atomare Browser-Batch-Quote und freie Registrierungen; 76 Tests/Typecheck bestanden. | F04 beginnen. |
| F04 | erledigt | Snippet sendet `goal_attempt` und `form_attempt`; Klick/Submit derselben Aktion einmal, Wiederholung mit neuer ID. Kein pauschaler Toolerfolg/Abschluss. VM-Browsertest, Route-Test, 78 Gesamttests und Typecheck bestanden; Kernsnippet 5.119 Bytes. | F05 beginnen. |
| F05 | erledigt | Einmalige technische Endzustände inkl. Cancel/Timeout, unveränderte Rückgabe/Fehler/`this`; fachlicher Abschluss bleibt unbestätigt. Technische Outcome-Serie und UI-Label; VM-Verhaltenstest, Typecheck; echtes Minifying hält Kernsnippet bei 4.035 Bytes. | F06 beginnen. |
| F06 | erledigt | Sofortige Instrumentierung und 15-Sekunden-Nachbeobachtung; getTools-Discovery, toolchange/Abort-Removal, getrennte Aktivierungs-/Cancel-Signale, Schemaversionen, parallele Aufrufe und optionales Early-SDK. Browsermatrix/Spec-Grenzen dokumentiert; VM-Tests, Typecheck, Kernsnippet 4.926 Bytes. | F07 beginnen. |
| F07 | erledigt | Fehlerklassen-Whitelist, keine Argument-/Formularwerte oder dynamischen Schlüsselnamen, Standard- und konfigurierbare Pfadredaktion; historische Ausgaben bereinigt. Tests für E-Mail/Token/Formwert und Typecheck/Gesamttest. | F08 beginnen. |
| F08 | erledigt | Pro-Anbieter-Refresh-/Fehlerstand, konfigurierbare Frischefrist, tatsächlicher IP-Abgleich für Browser und Log, getrennte Zustände und `verification_audit`; historische Fetch-Claims bleiben getrennt. Typecheck, 89 Tests, Browser-/Log-Fälle bestanden. | F09 beginnen. |
| F09 | erledigt | Google-/Apple-Richtlinientokens separat; generische Such-/Unternehmensquellen entfernt; UA-Grenzen, Pfad- und exakte UTM-Regeln, URL-Redaktion sowie Negativtests. `docs/source-classification.md`; Typecheck und 90 Tests bestanden. | F10 beginnen. |
| F10 | erledigt | Log-Versuche nach Methode, HTTP-Ergebnis, Status, Ressourcenvermutung und Identitätsstand in Migration v6 aggregiert; UI zeigt sie separat. Nur 2xx-HTML-GET bleibt bestätigter Fetch. PDF/API/Discovery, 301/403/429/500, null Content-Type/Timing getestet; 92 Tests und Typecheck bestanden. | F11 beginnen. |
| F11 | erledigt | Migration v7: Site-/Quellen-/Generations-/Positionsbelege, atomarer Import mit Zählern/Bursts/SQLite-Cursor; lokaler Collector mit Rotation und altem JSON-Cursor; Upload als Append-only-Vollsnapshot oder mit Quellheadern. Browser-Fallback bei >36h ohne neue Datensätze; Lücken und fehlende Quellendopplung dokumentiert. Tests für gleiche Zeile/Zeit, späte Zeilen, zwei Quellen, Rotation, Retry, Rollback, Legacy-Cutover; 96 Tests und Typecheck. | F12 beginnen. |
| F12 | erledigt | Burst erst ab drei verschiedenen relevanten HTML-Pfaden; Batchgrenze und fehlender Absichtsnachweis dokumentiert. Migration v8 backfillt tägliche Tool-Session-Näherungen aus noch vorhandenen Rohdaten; Tagesaggregate überstehen 90-Tage-Löschung. Hash-Kollisionsgrenzen in UI/Doku. 98 Tests und Typecheck. | F13 beginnen. |
| F13 | erledigt | Zentrale technische Regel: Toolaufruf oder IP-bestätigter HTML-Fetch; Quotenprüfung atomar in Browser- und Logpfad. Kostenfreie Zustände, Zugriffsversuche und Nachweise bleiben bei Grenze; Quotenlücken in Health/Dashboard, API/MCP, CSV und Digest. Retrys und Grenzfälle getestet; Preise/Planlimits unverändert; 100 Tests und Typecheck. | F14 beginnen. |
| F14 | erledigt | Migration v9: separate Setup-Test-IDs für Snippet-/Score-Checks, letzter Versuch neben letztem Erfolg, erster/letzter angenommener Beacon seit Einführung des Status, letzter echter Toolaufruf; Logfrische und Abschlussquelle getrennt angezeigt. Warnung nach fehlgeschlagenem Recheck und direkter Link zum Messzustand; API ergänzt. 101 Tests und Typecheck. | F15 beginnen. |
| F15–F22 | offen | Noch nicht implementiert. | Der Reihenfolge im Umsetzungsauftrag folgen. |

## Entscheidungen

- Alte Snippets ohne Event-ID bleiben kompatibel. Ihre Ereignisse können nicht zuverlässig über Retries dedupliziert werden; das wird nicht als gelöst ausgegeben.
- Browserdaten liefern Beobachtungen. Transportherkunft und Identitätsnachweise werden ausschließlich auf dem Server gesetzt.
- Produktionsdaten werden in Tests nie geöffnet oder verändert. SQLite-Tests laufen im Speicher oder mit temporären Dateien.
- v2-Deduplizierungsbelege bleiben für die bisherige Rohdaten-Aufbewahrungsdauer erhalten. Plain Views behalten keine neuen Rohzeilen; ihre IDs liegen nur in der Belegtabelle.
- Browser-Toolaufrufe belasten technisch das bestehende Kontingent; Registrierungen, Simulationen, Views und unbestätigte UA-Claims tun das nicht. Die Regel wird in F13 für den Logpfad und alle Zähler nochmals zusammengeführt.
- Der Ingest-Ratenbegrenzer ist pro Node-Prozess. Diese Installation nutzt einen Prozess; eine verteilte Installation braucht einen gemeinsamen Limiter. Origin ist keine Authentifizierung.
- Allgemeine Regex-Regeln erkennen nicht jeden sensiblen Pfad. Site-spezifische Routen werden über `TRACKING_REDACT_PATHS` markiert. Historische Rohdaten können bis zum Ablauf der bisherigen Aufbewahrungsfrist alte Inhalte enthalten; Anzeigen und CSV filtern ihre Dimensionsnamen.
