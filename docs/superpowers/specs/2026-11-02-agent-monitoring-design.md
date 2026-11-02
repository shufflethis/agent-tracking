# Design: „What's your agent doing?“ – Monitoring eigener Agents

Status: Entwurf zur Freigabe, 2026-11-02. Noch nichts davon ist implementiert.

## Intent und Warum

agenttracking.co bekommt eine zweite Seite. Heute beantwortet das Produkt **„Who's coming for you?“**: welche fremden KI-Agents eine Website oder ein MCP-Tool besuchen und was sie dort tun. Neu kommt **„What's your agent doing?“** dazu: Wer eigene Agents autonom laufen lässt (Claude-Code-Loops, Codex, Hermes, Cron-Jobs, eigene Bots), sieht morgens in 30 Sekunden, was nachts passiert ist und ob etwas hängt oder brennt.

Anlass: Boardy (Matchmaking-Agent) meldete Ende Oktober 2026, dass viele in seinem Netzwerk bessere Wege suchen, ihre Agents zu überwachen, und riet: „now point it at their own agents“. Gorden hatte dasselbe Bedürfnis bereits selbst. Auf seinem eigenen Server laufen nachts rund 25 Cron-Jobs, etwa 15 Agent-Services (blogger, instagram, medium, youtube, geo-trend-scout, hermes-gateway …) sowie Claude- und Codex-Sessions. Niemand sieht, was davon nachts schiefgeht. Die Logs liegen verstreut in `/var/log/*.log`.

**Erster Nutzer ist Gorden selbst.** Was für seinen Server nahtlos funktioniert, wird danach den Kontakten aus Boardys Netzwerk gezeigt.

**Langfristiger Burggraben (nicht MVP):** Beide Seiten verbinden. Landet ein überwachter Agent auf einer Site oder einem MCP-Tool, das ebenfalls agenttracking nutzt, sieht der Betreiber beide Perspektiven nebeneinander („Agent meldet ‚gebucht‘, die Site hat keinen Submit gesehen“). Agent-Tracing-Tools (LangSmith, Langfuse, AgentOps) sehen nur die Agent-Seite, Bot-Analytics sieht nur die Site-Seite.

## Erfolg

- Gordens Server ist angeschlossen: alle Claude-Code-Sessions und mindestens 10 seiner Cron-Jobs. Das Morgen-Briefing ist eine Woche lang jeden Tag nützlich, ohne dass er zusätzlich Logs lesen muss.
- Ein neuer Nutzer aus Boardys Netzwerk ist in unter 5 Minuten vom Login bis zum ersten sichtbaren Agent-Run.
- Ein Free-User kostet im Betrieb praktisch nichts.

## Ziele (MVP)

1. **Anschluss ohne Code.** Login auf agenttracking.co, Agent-Token erzeugen, ein Befehl pro Agent-Typ:
   - `npx agenttracking connect claude` trägt Hooks in die Claude-Code-Settings ein (User-Ebene `~/.claude/settings.json`, optional Projekt-Ebene). Ab dann ist jede Session und jeder Loop sichtbar.
   - `npx agenttracking wrap --name <name> -- <befehl …>` umschließt einen Cron-Job und meldet Start, Ende, Dauer und Exit-Code. Der Exit-Code des Befehls wird unverändert weitergegeben.
2. **Morgen-Briefing** per E-Mail zu einer vom Nutzer gewählten Uhrzeit (Standard 07:00, Zeitzone des Kontos): pro Agent, ob er lief, was er geschafft hat und wo er hängt. Probleme stehen oben, Unauffälliges kompakt darunter. **Regelbasiert, kein LLM-Aufruf.**
3. **Sofort-Benachrichtigung** nur bei echten Problemen: Cron-Job endet mit Exit-Code ≠ 0, ein erwarteter Lauf fehlt, eine Session ist offen, sendet aber seit X Minuten nichts mehr. Kanal: E-Mail und optional eine Webhook-URL (damit gehen Telegram, Slack oder Discord ohne eigene Integration).
4. **Dashboard-Bereich „Your agents“** im eingeloggten App-Bereich: Liste der Agents mit Status-Ampel, Timeline pro Run.
5. **Startseite mit zwei Seiten** (EN und DE): „Who's coming for you?“ (bestehend) und „What's your agent doing?“ (neu), jeweils mit eigenem Einstieg.
6. **Kostenlos** während der Beta, ohne Bezahlschranke.

## Nicht-Ziele (MVP)

- Kein Mitschneiden von Prompts, Antworten, Tool-Argumenten, Tool-Ergebnissen oder Dateiinhalten.
- Kein volles LLM-Tracing (Token-Kosten, Prompt-Ketten) wie bei LangSmith oder Langfuse.
- Keine Fernsteuerung von Agents. Das bestehende Agent-Hub-SDK kann `onCommand`, das kommt hier nicht hinein.
- Keine Verknüpfung mit der Site-Seite (die Brücke kommt später).
- Kein Billing, keine Preisstufen. Den Preis (Richtung 3,99 €/Monat oder Jahrespreis) entscheidet Gorden erst mit 20–50 echten Nutzern.
- Anbindungen für Codex, Hermes und OpenTelemetry kommen in Phase 2, nicht ins MVP.

## Anti-Ziele (wäre ein Fehlschlag, selbst wenn es technisch läuft)

- **Der Hook bremst oder bricht den Agent des Nutzers.** Jeder Hook-Aufruf muss schnell zurückkehren und darf nie mit Fehler enden oder den Agent blockieren, auch wenn agenttracking.co nicht erreichbar ist. `wrap` darf Ausgabe und Exit-Code des Befehls nie verändern.
- **Sensible Inhalte landen bei uns:** Prompts, Secrets, Pfade mit Kundennamen, Log-Inhalte ohne ausdrückliche Zustimmung.
- **Alarm-Spam.** Ein Loop, der planmäßig auf Eingabe wartet, darf nicht als „hängt“ gelten. Lieber eine Warnung zu wenig als zehn falsche.
- **Ein Free-User verursacht laufende Kosten** (LLM pro Briefing, große Rohdaten).
- **Das Setup braucht mehr als einen Befehl pro Agent.**

## Rahmenbedingungen

- Bestehende Codebasis: Next.js 16 (App Router), React 19, `node:sqlite` (eine Datei, `lib/tracking/db.ts`), keine weiteren Laufzeit-Abhängigkeiten. Daran halten.
- Konten und Login existieren (`accounts`, Magic-Link-Login, `lib/session.ts`). API-Tokens nach dem Muster von `lib/tracking/api-token.ts` (Präfix, nur Hash gespeichert, einmal angezeigt, widerrufbar).
- E-Mail geht über Brevo (`lib/email.ts`). Für das Briefing kommt eine neue `MailFamily` dazu.
- Bestehende Datenschutz-Prinzipien gelten weiter: Allowlist statt Denylist bei Feldern, Session-IDs nur als HMAC, „unbekannt statt erfunden“, durchgesetzte Retention (`pruneRaw()` in `db.ts`).
- Die bestehenden Site-Tabellen sind nach `domain` geschlüsselt. Agent-Monitoring gehört aber zu einem **Konto**, nicht zu einer Domain.
- Zweisprachig EN/DE wie der Rest der Site.
- Ein npm-Paket zu veröffentlichen ist eine externe Veröffentlichung und braucht Gordens ausdrückliche Freigabe zum jeweiligen Zeitpunkt.

## Entschiedenes zum Wie

Von Gorden entschieden:
- Läuft unter agenttracking.co, nicht unter eigener Marke. Zwei Seiten: „Who's coming for you?“ und „What's your agent doing?“.
- Anschluss: einloggen, dann trackt agenttracking die Agents. Es soll nahtlos sein.
- Morgen-Briefing im Stil „was ist Phase“, kein Chart-Dashboard als Hauptsache.
- Zum Start kostenlos, später sehr günstig.

Von mir (Claude) gesetzt, korrigierbar:
- **Ein CLI-Paket `agenttracking`** (npm, im Repo unter `cli/`) mit den Befehlen `login`/`connect`, `hook` (wird von Claude-Code-Hooks aufgerufen, liest das Hook-JSON von stdin) und `wrap`. Gleiches Token-Muster wie bestehende Tokens, eigenes Präfix (z. B. `atk_`), nur Schreibrecht für Agent-Events des eigenen Kontos.
- **Claude-Code-Hooks:** `SessionStart`, `PreToolUse`, `Stop`, `SubagentStop`, `SessionEnd`, `PostToolUse`, `Notification`. Pro Tool-Call wird nur der Tool-Name gemeldet (z. B. `Bash`, `Edit`, `mcp__github__…`) und ob er erfolgreich war, nie `tool_input` oder `tool_response`. Die Session-ID wird beim Nutzer per HMAC gehasht, das Arbeitsverzeichnis nur als Basename (z. B. `agent-tracking`), damit Projekte unterscheidbar sind.
- **Hook-Zustellung asynchron:** Der Hook schreibt das Event in eine lokale Spool-Datei und kehrt sofort zurück. Ein abgekoppelter Prozess sendet gesammelt. Fällt das Netz aus, wird später gesendet oder nach einer Obergrenze verworfen.
- **`wrap` meldet standardmäßig keine Log-Inhalte.** Mit `--tail N` werden die letzten N Zeilen von stderr mitgeschickt, gekürzt und mit einfacher Secret-Maskierung (Tokens, Keys, `Bearer …`), und nur 7 Tage aufbewahrt. Damit wird aus „Exit 1“ ein lesbarer Grund, aber nur mit Zustimmung.
- **Fehlende Läufe:** `wrap --every 24h` (oder `--cron "0 7 * * *"`) teilt mit, wann der nächste Lauf erwartet wird. Ohne Angabe gibt es keine „fehlt“-Warnung, also keine geratene Erkennung.
- **„Hängt“ bei Claude-Sessions:** Eine Session gilt als hängend, wenn sie nicht beendet ist, das letzte Event kein `Stop` oder `Notification` war (also kein Warten auf Eingabe) und seit über 30 Minuten (konfigurierbar) kein Event kam.
- **Datenmodell** neu und kontobezogen: `agents` (Konto, Typ `claude|cron|custom`, Name, Host-Label, erste und letzte Sichtung), `agent_runs` (Agent, Start, Ende, Status `running|ok|failed|hung|missed`, Exit-Code, Dauer, Zähler wie Tool-Calls und Fehler), `agent_events` (Run, Zeit, Typ, Tool-Name, Fehlerklasse aus Allowlist). Retention: `agent_events` 30 Tage, `agent_runs` 90 Tage, Tagesaggregate dauerhaft. Wird in `pruneRaw()` aufgenommen.
- **Briefing-Inhalt pro Agent:** Läufe seit dem letzten Briefing, davon ok, fehlgeschlagen oder hängend, Dauer im Vergleich zum Median der letzten 14 Tage, bei Claude die Zahl der Sessions und Tool-Calls pro Projekt. Ganz oben steht ein Satz („2 Probleme, 9 Agents unauffällig“).
- **Grenzen in der Beta** gegen Missbrauch und Kosten: z. B. 50 Agents und 50.000 Events pro Monat pro Konto, über das bestehende Quota- und Rate-Limit-Muster.

Nach dem Builder-Check von mir (Claude) entschieden, korrigierbar:
- **Hosting:** wie heute ein einzelner Node-Prozess auf dem eigenen Server (`agent-tracking.service`, systemd), SQLite-Datei, Cron über `scripts/*.sh`. Ein viertelstündlicher Job erkennt `hung` und `missed` per Abfrage und verschickt fällige Briefings und Sofort-Meldungen. Echtzeit unter einer Minute ist kein Ziel.
- **Auslieferung des CLI:** wird als npm-Paket `agenttracking` gebaut. Bis zur Veröffentlichung wird es lokal über einen Tarball (`npm pack`) getestet, und Gordens eigener Server wird so angeschlossen. Die Veröffentlichung auf npm wird vor den ersten externen Nutzern separat freigegeben. Die 5-Minuten-Metrik gilt ab dann.
- **Tokens und Login:** pro Maschine ein eigenes Agent-Token (`atk_`, nur Schreibrecht für Agent-Events des Kontos), einzeln widerrufbar im Dashboard (Liste: Host-Label, erstellt, zuletzt gesehen). `npx agenttracking login` nutzt einen Device-Flow: Das CLI zeigt einen Code und öffnet die URL, der eingeloggte Nutzer bestätigt im Browser, das CLI erhält das Token. Als Fallback geht `--token` zum Einfügen. Abgelegt wird es in `~/.agenttracking/config.json` mit Rechten 0600. Das bestehende Konto-API-Token bleibt unverändert.
- **HMAC-Key:** Beim `login` wird lokal ein zufälliges Geheimnis pro Maschine erzeugt und in derselben Config gespeichert. Session-IDs werden damit gehasht, bevor sie die Maschine verlassen. Auf derselben Maschine sind sie stabil, also korreliert der Server über den Hash. Den Klartext sieht der Server nie. Eine Token-Rotation ändert den Key nicht.
- **Agent und Run bei Claude:** Ein Agent ist Host plus Projekt-Basename (z. B. `server1 / agent-tracking`). Ein Run ist eine Session (von `SessionStart` bis `SessionEnd`, oder bis zur Inaktivität). Lange Loops bleiben ein Run, das Briefing zählt dann die Turns (`Stop`-Events) und Tool-Calls im Briefing-Zeitraum. Bei Cron ist ein Agent ein `--name` pro Host, ein Run ist ein Aufruf.
- **„Hängt“ und lange Tool-Calls:** `PreToolUse` kommt zur Hook-Liste dazu. Ist ein Tool-Call offen (`PreToolUse` ohne passendes `PostToolUse`), gilt die Session erst nach 3 Stunden als hängend, sonst nach 30 Minuten. Beides ist konfigurierbar.
- **Webhook:** Presets für Telegram (Bot-Token und Chat-ID), Slack und Discord (jeweils Incoming-Webhook-URL) im passenden Format, dazu „generisch“ (POST JSON `{text, agent, status, url}`). Nur `https`-Ziele.

## Dem Builder überlassen

- Genaue Hook-Konfiguration und Merge-Logik in eine bestehende `settings.json` (vorhandene Hooks des Nutzers dürfen nicht verloren gehen; `connect` muss idempotent und mit `disconnect` rückgängig zu machen sein).
- Spool-Format, Batching und Backoff des CLI.
- API-Route-Namen und Payload-Schema, solange die Allowlist-Regel gilt und der bestehende Body-Limit- und Quota-Code (`request-body.ts`, `server-ingest.ts`) wiederverwendet wird.
- Layout des Dashboard-Bereichs und der Startseiten-Hälfte. Bestehende Komponenten und Copy-Stil (`lib/home-content.ts`, `lib/tracking/copy.ts`) nutzen.
- Wie der Briefing-Versand geplant wird (bestehender Cron `scripts/tracking-cron.sh` oder eigener Job, viertelstündlich nach fälligen Konten).
- Texte und Schwellenwerte im Detail, innerhalb der Anti-Ziele.

## Phase 2 (nach dem MVP, Reihenfolge nach Nutzerfeedback)

- `connect codex` und `connect hermes` über deren Hook- bzw. Config-Mechanismen (Hermes hat `~/.hermes/hooks/`).
- OTLP/HTTP-Ingest für eigene Agents (siehe `docs/design/agent-observability-roadmap.md`, Punkt 2), plus ein Mini-SDK mit `log`/`heartbeat` nach dem Vorbild von `/opt/agent-hub/agent-sdk.js`.
- `connect systemd`: Dauerläufer-Services über Neustarts und Exit-Status überwachen.
- Die Brücke: Agent-Run-ID beim Besuch einer getrackten Site bzw. eines MCP-Tools mitschicken und beide Perspektiven verbinden.
- Preise.
