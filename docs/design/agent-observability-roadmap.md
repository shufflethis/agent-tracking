# Agent observability roadmap (sketch)

Status: Entwurf, nichts davon ist implementiert. Anlass: Newsletter "Spying on your agents" (Probably Private, Okt 2026) und der Longread von kjam (blog.kjamistan.com, 19.10.2026). Der Artikel beschreibt die Betreiber-Sicht auf eigene Agenten; wir messen die Site-Sicht auf fremde Agenten. Übernommen werden Standards, Baselines und Privacy-Praxis, nicht eBPF oder Host-Beobachtung.

## Ausgangslage (aus dem Code, geprüft)

- `sdk/mcp.ts` (64 Zeilen) sendet Tool-Telemetrie und Outcome-Receipts. Keine Argumente, Ergebnisse oder Prompts.
- `lib/tracking/mcp-analytics.ts` warnt mit festen Schwellen (`MCP_WARNING_RULES`: ≥20 Calls, ≥3 Fehler, ≥10 %, p95 ≥ 5000 ms). Das ist keine Abweichung von einer Baseline.
- `tools`-Tabelle speichert bereits `description_hash` und `schema_hash` pro Tool (siehe `db.ts` um Zeile 944).
- **Lücke:** `pruneRaw()` in `db.ts` löscht `events`, `event_receipts`, `tool_session_receipts` nach `RAW_RETENTION_DAYS` (90). `server_tool_calls` und `server_outcomes` werden nur beim Löschen der ganzen Site gelöscht. `docs/mcp-analytics.md` sagt, sie folgten dem "bestehenden Lebenszyklus", faktisch haben sie keinen.

## 1. Retention für Server-Telemetrie schließen (zuerst)

Warum: Der Longread nennt begrenzte Retention, Zweckbindung und Datenminimierung als Pflicht für Beobachtungsdaten. Wir verlangen das vom Kunden, setzen es selbst aber nicht durch.

- `pruneRaw()` um `server_tool_calls` und `server_outcomes` erweitern (Cutoff über `received_at`).
- Vorher prüfen: Dashboard-Fenster je Plan (`plans.ts`) darf nicht größer sein als die Retention, sonst zeigt das Dashboard leere Zeiträume. Entweder Fenster auf Retention kappen oder getrennte Aggregattabelle (`daily`-Muster) für Zähler führen.
- Docs, Datenschutzerklärung (`app/(en)/privacy`, `app/(de)/de/datenschutz`) und Tests (`privacy.test.ts`, `mcp-analytics.test.ts`) anpassen.
- Aufwand: klein. Nutzen: Aussage "belegt und durchgesetzt" statt "konfigurieren Sie selbst".

## 2. OpenTelemetry-Anschluss (OTLP-Ingest + GenAI-Feldnamen)

Warum: Der Artikel setzt OTel als Standard-Einstieg. Wer schon OTel nutzt, soll keinen zweiten SDK-Pfad brauchen.

- Neuer Endpoint `POST /api/otlp/{domain}/v1/traces` (OTLP/HTTP JSON), gleiche Write-Credential wie `tool_telemetry`.
- Abbildung auf `server_tool_calls`: `gen_ai.tool.name` → `toolName`, Span-Dauer → `durationMs`, `error.type` → `errorClass` (nur Allowlist), `gen_ai.agent.id` nur als HMAC, Versions-Resource-Attribut → `pluginVersion`.
- **Allowlist statt Denylist:** `gen_ai.output.messages`, `gen_ai.system_instructions`, `gen_ai.tool.definitions`-Inhalte und alle unbekannten Attribute werden am Rand verworfen und nie gespeichert. Das ist der Gegenentwurf zum Artikel-Hinweis, dass Traces sensible Inhalte leaken.
- `sdk/mcp.ts` bleibt, bekommt optional dieselben Feldnamen, damit beide Wege dasselbe Schema erzeugen.
- Risiko: OTLP-Clients schicken große Batches. Body-Limit und Quota-Zählung über das bestehende `request-body.ts` und `server-ingest.ts` wiederverwenden.

## 3. Baseline-Abweichungen statt fester Schwellen

Warum: Der Artikel arbeitet mit Baselines (z. B. Durchsatz ×10) und nennt Alert Fatigue als offene Frage. Unsere Warnungen sind explizit "keine Abweichung gegen Baseline".

- Pro Tool/Version/Environment: gleitende 28-Tage-Baseline für Aufrufvolumen, Fehlerrate und p95 (Median + MAD, deterministisch, kein ML).
- Warnung nur bei Mindeststichprobe in Baseline und aktuellem Fenster, sonst "nicht genug Daten".
- Zusätzlich zwei billige Ereignisse: "Tool zum ersten Mal gesehen" und "Version zum ersten Mal gesehen". Daten sind vorhanden.
- Darstellung wie bisher vorsichtig: "weicht von der eigenen Baseline ab", keine Kausalität, kein Versand nach außen.
- Die festen Schwellen bleiben als Untergrenze bestehen.
- Offen: Wochentagsmuster (Wochenende) berücksichtigen oder nicht. Erst mit echten Daten entscheiden.

## 4. Tool-Surface-Drift und Privacy-Lint

Warum: Der Artikel betont Trust Boundaries und Task-Spezifität. Das Tool-Schema ist die Grenze, an der ein Agent entscheidet, was er sendet.

- **Drift:** Ändert sich `description_hash` oder `schema_hash` eines Tools zwischen zwei Scans, ist das ein Ereignis im Insights-Feed ("Beschreibung von Tool X wurde geändert"). Relevant, weil geänderte Beschreibungen das Agentenverhalten ändern.
- **Lint:** Schema-Feldnamen und Beschreibungen gegen eine feste Liste prüfen (z. B. `email`, `phone`, `iban`, `address`, `password`, `token`), Ergebnis als Hinweis "Tool fordert möglicherweise personenbezogene Daten an". Es werden nur Schema und Beschreibung gelesen, nie Argumente.
- Ergebnis ist ein Hinweis, kein Urteil. Falsch-positive und Falsch-negative sind zu erwarten und werden so benannt.

## 5. Poisoned-Input-Szenario im Task-Runner

Warum: Red Teaming mit Dummy-Daten ist eine Kernempfehlung. `task-runner.ts` führt bereits deterministische Test-Läufe aus.

- Ein zusätzliches Test-Szenario mit manipulierter Eingabe (z. B. Anweisung im Formularfeld), nur `environment: "test"`.
- Ergebnis: Wird die Eingabe als Anweisung befolgt (neuer Pfad, zusätzlicher Tool-Call) oder nicht. Es ist ein Test der Site, kein Urteil über ein Modell.
- Erst nach 1 bis 4, weil der Zuschnitt (was zählt als "befolgt") sorgfältig definiert werden muss.

## Reihenfolge

1. Retention (Punkt 1): klein, schließt eine echte Lücke, Voraussetzung für glaubwürdige Privacy-Aussagen.
2. Baseline + First-seen (Punkt 3) und Drift (Punkt 4): nutzen vorhandene Daten, kein neues Ingest.
3. OTLP (Punkt 2): größerer Eingriff in die Ingest-Schicht, lohnt mit Reichweite.
4. Poisoned Input (Punkt 5).

## Nicht übernommen

- eBPF, DNS und Netzwerk-Flows, Kernel-Calls: laufen auf dem Host des Agenten-Betreibers, nicht in unserer Sicht.
- Session-Hygiene, Rollenprofile, Sandboxing: Betreiber-Praxis.
- Datenklassifikation als Feld am Tool-Ergebnis: später, braucht eigene Datenschutzprüfung.

## Positionierung (Content)

Ein Beitrag "Agenten-Verkehr messen, ohne Personen zu tracken" für Privacy-Verantwortliche, DE und EN. Belegbar mit: Allowlist-Ingest, durchgesetzte Retention, HMAC-Korrelation, "unbekannt statt erfunden". Erst veröffentlichen, wenn Punkt 1 umgesetzt ist, sonst widerspricht die Aussage dem Code.
