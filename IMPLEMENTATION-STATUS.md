# Agent Tracking – Umsetzung

Stand: 2026-09-24. Arbeitsgrundlage: `IMPLEMENTATION-PROMPT.md`.

## Fortschritt

| Paket | Status | Ergebnis / Prüfung | Nächster Schritt |
| --- | --- | --- | --- |
| F01 | erledigt | `measurement.ts`, v2-Protocol, serverseitig gesetzte Evidenz, atomare Site/Transport-ID-Deduplizierung und `docs/measurement.md`. Vier Verhaltenstests bestanden; `npm run typecheck` und bisheriger Gesamttest bestanden. | F02 beginnen. |
| F02 | erledigt | Wiederholbare Migration aus F01; alte `conversion`-Zähler in Dashboard, Statistikseite, JSON-API, CSV, Digest und MCP als unbestätigte Browser-Zielsignale ausgewiesen. Additive API-Felder und Definitionshinweise; Typecheck bestanden. | F03 beginnen. |
| F03 | in Arbeit | Requestgrößen, Origin-Ausnahme und Drop-Zustände werden geprüft. | Begrenztes Einlesen und Messzustand umsetzen. |
| F04–F22 | offen | Noch nicht implementiert. | Der Reihenfolge im Umsetzungsauftrag folgen. |

## Entscheidungen

- Alte Snippets ohne Event-ID bleiben kompatibel. Ihre Ereignisse können nicht zuverlässig über Retries dedupliziert werden; das wird nicht als gelöst ausgegeben.
- Browserdaten liefern Beobachtungen. Transportherkunft und Identitätsnachweise werden ausschließlich auf dem Server gesetzt.
- Produktionsdaten werden in Tests nie geöffnet oder verändert. SQLite-Tests laufen im Speicher oder mit temporären Dateien.
- v2-Deduplizierungsbelege bleiben für die bisherige Rohdaten-Aufbewahrungsdauer erhalten. Plain Views behalten keine neuen Rohzeilen; ihre IDs liegen nur in der Belegtabelle.
