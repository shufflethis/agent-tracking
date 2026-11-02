# Agent Monitoring („What's your agent doing?“) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Konten auf agenttracking.co können eigene Claude-Code-Sessions und Cron-Jobs mit einem Befehl anschließen, sehen sie im Dashboard und bekommen ein regelbasiertes Morgen-Briefing plus Sofort-Meldungen bei echten Problemen.

**Architecture:** Neues, kontobezogenes Subsystem `lib/agents/` mit eigenen SQLite-Tabellen (Migration 19 in `lib/tracking/db.ts`), einem Batch-Ingest-Endpoint mit Allowlist, einer reinen Status-Auswertung (hung/missed), Briefing- und Webhook-Renderern und einem 15-Minuten-Cron. Dazu ein abhängigkeitsfreies CLI-Paket `cli/` (npm `agenttracking`), das Claude-Code-Hooks installiert, Events lokal spoolt und asynchron sendet und Cron-Befehle umschließt.

**Tech Stack:** Next.js 16 App Router, React 19, `node:sqlite`, `node:test` + `tsx`, TypeScript. Keine neuen Laufzeit-Abhängigkeiten, auch nicht im CLI.

**Spec:** `docs/superpowers/specs/2026-11-02-agent-monitoring-design.md`

## Global Constraints

- Node ≥ 22.13 (wie `package.json` `engines`). Keine neuen npm-Dependencies in App oder CLI.
- Allowlist statt Denylist: Der Server speichert nur die Felder aus Task 3. Unbekannte Felder werden verworfen und nie gespeichert. Nie gespeichert oder gesendet werden `tool_input`, `tool_response`, Prompts, `transcript_path` und volle Pfade.
- Session-IDs verlassen die Maschine nur als HMAC-SHA256 mit einem lokalen Geheimnis pro Maschine. `cwd` wird nur als Basename gesendet.
- Hook-Prozess: schreibt nichts auf stdout oder stderr, beendet sich immer mit Exit-Code 0, kehrt in < 100 ms zurück (kein Netzwerk im Hook-Prozess selbst).
- `wrap` gibt stdout und stderr unverändert durch und beendet sich mit dem Exit-Code des Befehls (bei Signal: 128 + Signalnummer).
- Token-Präfix `atk_`, nur SHA-256-Hash gespeichert, einmal angezeigt, einzeln widerrufbar.
- Schwellen: hung nach 30 min ohne Event, 3 h bei offenem Tool-Call. Briefing-Standard 07:00, Zeitzone `Europe/Berlin`. Beta-Grenzen: 20 Agents und 50.000 Events pro Kalendermonat pro Konto.
- Retention: `agent_events` 30 Tage, `agent_runs` 90 Tage, Tagesaggregat `agent_daily` dauerhaft, `tail` 7 Tage. Wird in `pruneRaw()` durchgesetzt.
- Webhook-Ziele nur `https:`. Presets: `telegram`, `slack`, `discord`, `generic`.
- Zweisprachig EN/DE für alle sichtbaren Texte (Muster `lib/tracking/copy.ts`, `dashLang(account.lang)`).
- Git-Commits und npm-Veröffentlichung nur mit Gordens Freigabe. Autor bei Commits: `shufflethis <tracktronaut@gmail.com>`. Das Produktions-Deployment braucht eine eigene Freigabe.

## Review Focus

1. **Bestehende `~/.claude/settings.json` mit eigenen Hooks oder kaputtem JSON:** `connect` darf keinen fremden Hook verlieren und eine nicht parsbare Datei nie überschreiben (Abbruch mit Hinweis, Backup vor jedem Schreiben). → Tests in Task 9.
2. **Server offline oder langsam:** Der Hook bleibt schnell und still. Der Spool wächst nicht unbegrenzt (max. 5.000 Zeilen bzw. 2 MB, älteste zuerst verworfen). → Tests in Task 8.
3. **Events in falscher Reihenfolge oder doppelt** (Retry, Zeitversatz): Eine doppelte `id` wird ignoriert, `tool_end` ohne `tool_start` lässt `open_tools` nie unter 0 fallen, Events nach `session_end` öffnen keinen Run neu. → Tests in Task 3.
4. **Ein Loop, der auf Eingabe wartet** (letztes Event `turn_end`/`notification`), gilt nie als hung, egal wie lange. Nach 12 h Wartezeit wird er still als `ok` geschlossen. → Tests in Task 4.
5. **Secrets im stderr-Tail bei `wrap --tail`:** Bearer-Tokens, `sk-…`, `ghp_…`, `atk_…`, `key=…`/`token=…`/`password=…`-Werte und lange Hex- oder Base64-Folgen werden vor dem Senden maskiert. → Tests in Task 10.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `lib/tracking/db.ts` (Modify) | Migration 19 (Tabellen), `pruneRaw()` erweitern |
| `lib/agents/types.ts` | Gemeinsame Typen: `AgentEvent`, `AgentKind`, `RunStatus` |
| `lib/agents/tokens.ts` | Agent-Tokens und Device-Flow |
| `lib/agents/ingest.ts` | Allowlist-Parser und Schreiben inkl. Run-Zustand |
| `lib/agents/status.ts` | Reine Auswertung hung/missed/idle-close |
| `lib/agents/store.ts` | Lesende Abfragen für Dashboard und Briefing, Konto-Einstellungen |
| `lib/agents/briefing.ts` | Briefing-Daten und Mail-Rendering |
| `lib/agents/notify.ts` | Webhook-Presets und Alert-Mails |
| `lib/agents/copy.ts` | EN/DE-Texte des Subsystems |
| `app/api/agents/events/route.ts` | Ingest-Endpoint |
| `app/api/agents/device/route.ts`, `app/api/agents/device/poll/route.ts` | Device-Flow |
| `app/(en)/app/fleet/page.tsx`, `app/(en)/app/fleet/[agentId]/page.tsx` | Dashboard „Your agents“ |
| `app/(en)/app/connect/page.tsx` | Device-Code bestätigen |
| `app/(en)/app/fleet/settings/page.tsx` | Tokens, Briefing-Zeit, Webhook |
| `scripts/agents-cron.ts`, `scripts/agents-cron.sh` | 15-Minuten-Job |
| `cli/` | npm-Paket `agenttracking` (eigenes `package.json`, `tsconfig.json`, `src/`) |
| Startseiten EN/DE, `lib/home-content.ts` | Zwei-Seiten-Positionierung |

Ein statischer `app/(en)/app/fleet` hat Vorrang vor `app/(en)/app/[domain]`. Domains enthalten immer einen Punkt, deshalb gibt es keine Kollision.

---

### Task 1: Schema und Retention

**Files:**
- Modify: `lib/tracking/db.ts` (`migrate()` nach Version 18; `pruneRaw()` Zeile ~948)
- Modify: `package.json` Script `test`: `lib/agents/*.test.ts` und `cli/src/*.test.ts` ergänzen
- Test: `lib/agents/schema.test.ts`

**Interfaces:**
- Produces: Tabellen (alle mit `create table` in Migration 19):
  - `agent_tokens(id text pk, owner text not null references accounts(email), hash text unique not null, host_label text not null, created_at int not null, last_seen_at int, revoked_at int)`
  - `agent_device_codes(device_code_hash text pk, user_code text unique not null, host_label text not null, created_at int not null, expires_at int not null, approved_by text, token_id text, token_plain_once text)`
  - `agents(id text pk, owner text not null, kind text not null check(kind in ('claude','cron','custom')), name text not null, host text not null, first_seen int not null, last_seen int not null, expect_every_ms int, unique(owner, kind, host, name))`
  - `agent_runs(id text pk, agent_id text not null references agents(id), run_key text not null, started_at int not null, ended_at int, status text not null check(status in ('running','ok','failed','hung','missed')), exit_code int, duration_ms int, tool_calls int not null default 0, tool_errors int not null default 0, turns int not null default 0, open_tools int not null default 0, last_event_at int not null, last_event_type text not null, tail text, tail_at int, alerted_at int, unique(agent_id, run_key))`; Index `(agent_id, started_at)`
  - `agent_events(id text not null, owner text not null, run_id text not null, at int not null, received_at int not null, type text not null, tool text, ok int, primary key(owner, id))`
  - `agent_daily(agent_id text, day text, runs int default 0, failed int default 0, tool_calls int default 0, primary key(agent_id, day))`
  - `agent_usage(owner text, month text, count int default 0, primary key(owner, month))`
  - Spalten an `accounts`: `briefing_hour int not null default 7`, `briefing_last_day text`, `webhook_kind text`, `webhook_url text`, `webhook_chat_id text`, `alerts_email int not null default 1`
- Produces: `pruneRaw(now)` löscht zusätzlich `agent_events` älter als 30 Tage, `agent_runs` älter als 90 Tage (über `started_at`, nur beendete), setzt `tail = null` bei `tail_at` älter als 7 Tage und löscht abgelaufene `agent_device_codes`.

- [ ] **Step 1: Failing test** `lib/agents/schema.test.ts` mit `process.env.TRACKING_DB = ":memory:"`: `test("migration 19 creates agent tables")` prüft per `pragma table_info`, dass alle sieben Tabellen und die sechs `accounts`-Spalten existieren. `test("pruneRaw expires agent data on its own clock")` fügt Events mit 31 und 29 Tage altem `received_at`, beendete Runs mit 91 und 89 Tage altem `started_at` und einen Tail mit 8 Tage altem `tail_at` ein. Erwartet: nur die alten Zeilen sind weg bzw. `tail` ist `null`, der 89-Tage-Run bleibt.
- [ ] **Step 2:** `npx tsx --test lib/agents/schema.test.ts` → FAIL (Tabellen fehlen).
- [ ] **Step 3:** Migration 19 im bestehenden `if ((current.version ?? 0) < 19)`-Muster plus `pruneRaw()`-Zeilen ergänzen.
- [ ] **Step 4:** Test → PASS, `npm test` bleibt grün.
- [ ] **Step 5: Commit** `feat(agents): schema and retention for agent monitoring`

### Task 2: Agent-Tokens und Device-Flow

**Files:**
- Create: `lib/agents/tokens.ts`, `app/api/agents/device/route.ts`, `app/api/agents/device/poll/route.ts`, `app/(en)/app/connect/page.tsx`
- Test: `lib/agents/tokens.test.ts`

**Interfaces:**
- Consumes: Tabellen aus Task 1; `requireAccount` aus `lib/tracking/auth.ts`; `clientIp`, `take` aus `lib/ratelimit.ts`.
- Produces (`lib/agents/tokens.ts`):
  - `mintAgentToken(owner: string, hostLabel: string, now?: number): { id: string; token: string }` (Token `atk_` + 24 Byte base64url)
  - `agentTokenOwner(token: string | null, now?: number): { owner: string; tokenId: string } | null` (aktualisiert `last_seen_at` höchstens einmal pro Minute; widerrufene liefern null)
  - `listAgentTokens(owner: string): { id: string; hostLabel: string; createdAt: number; lastSeenAt: number | null }[]`
  - `revokeAgentToken(owner: string, id: string): boolean`
  - `startDeviceLogin(hostLabel: string, now?: number): { deviceCode: string; userCode: string; expiresAt: number }` (`userCode` 8 Zeichen aus `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, angezeigt als `XXXX-XXXX`; Ablauf 10 min)
  - `approveDeviceLogin(userCode: string, owner: string, now?: number): "approved" | "expired" | "unknown"`
  - `pollDeviceLogin(deviceCode: string, now?: number): { status: "pending" } | { status: "expired" } | { status: "approved"; token: string }` (liefert den Klartext genau einmal und löscht dann `token_plain_once`)
- HTTP: `POST /api/agents/device` Body `{hostLabel}` (≤ 64 Zeichen, `[\w.-]`) → `{deviceCode, userCode, verifyUrl: "<SITE_ORIGIN>/app/connect?code=XXXX-XXXX", interval: 3}`. `POST /api/agents/device/poll` Body `{deviceCode}` → Ergebnis von `pollDeviceLogin`. Beide mit Rate-Limit `requests`.
- Seite `/app/connect?code=`: zeigt Code und Host-Label, ein Button „Diese Maschine verbinden“ (Server Action → `approveDeviceLogin`).

- [ ] **Step 1: Failing tests:** `"agent token round-trip and revoke"` (mint → owner ok; nur Hash in DB, `assert.doesNotMatch` des Klartexts in `select *`; revoke → null). `"device flow hands out the token once"` (start → poll pending → approve → poll approved mit `atk_`-Token → zweiter poll liefert nicht mehr den Token, sondern `{status:"expired"}`). `"device code expires after 10 minutes"` (approve mit now+11 min → "expired").
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren. `deviceCode` 32 Byte base64url, gespeichert nur als SHA-256.
- [ ] **Step 4:** PASS. Manuell: `curl -XPOST localhost:3000/api/agents/device -d '{"hostLabel":"test"}'` liefert `userCode`.
- [ ] **Step 5: Commit** `feat(agents): per-machine tokens and device login`

### Task 3: Event-Schema, Ingest und Run-Zustand

**Files:**
- Create: `lib/agents/types.ts`, `lib/agents/ingest.ts`, `app/api/agents/events/route.ts`
- Test: `lib/agents/ingest.test.ts`

**Interfaces:**
- Produces (`lib/agents/types.ts`):
  ```ts
  export type AgentKind = "claude" | "cron" | "custom";
  export type AgentEventType = "session_start" | "tool_start" | "tool_end" | "turn_end" | "subagent_end" | "notification" | "session_end" | "cron_start" | "cron_end";
  export type RunStatus = "running" | "ok" | "failed" | "hung" | "missed";
  export type AgentEvent = {
    v: 1; id: string; type: AgentEventType; at: number;
    agent: { kind: AgentKind; name: string; host: string };
    run: string;            // HMAC hex (claude) or random id (cron), 16–64 [0-9a-f-]
    tool?: string;          // tool_start/tool_end only, ≤128, /^[A-Za-z0-9_.:-]+$/
    ok?: boolean;           // tool_end only
    exitCode?: number;      // cron_end only, integer 0–255
    durationMs?: number;    // cron_end only, 0–7 days
    expectEveryMs?: number; // cron_start only, 60_000–31 days
    tail?: string;          // cron_end only, ≤ 4000 chars
  };
  ```
- Produces (`lib/agents/ingest.ts`):
  - `parseAgentBatch(body: unknown, now?: number): { events: AgentEvent[]; dropped: number } | null` (null bei `{events: []}`-Formfehler oder > 100 Events; einzelne ungültige Events werden gezählt und verworfen; unbekannte Felder fallen weg; `at` außerhalb von now − 7 Tage bis now + 5 min wird auf `now` gesetzt; `name`/`host` ≤ 64 Zeichen, `[\w .:/@-]`)
  - `recordAgentEvents(owner: string, events: AgentEvent[], now?: number): { accepted: number; duplicates: number; rejected: "agent_limit" | "quota" | null }`
- Run-Zustand pro Event (`run_key = event.run`, Agent per `(owner, kind, host, name)` angelegt, neue Agents über 20 → `agent_limit`, Quota 50.000/Monat → `quota`):
  - `session_start`/`cron_start` → Run anlegen (`running`) falls neu. `cron_start.expectEveryMs` setzt `agents.expect_every_ms`.
  - jedes Event: `last_event_at = max(...)`, `last_event_type` nur, wenn `at ≥ last_event_at`. Ein Event für einen unbekannten Run legt ihn als `running` an.
  - `tool_start` → `open_tools + 1`. `tool_end` → `open_tools = max(0, open_tools − 1)`, `tool_calls + 1`, bei `ok === false` `tool_errors + 1`.
  - `turn_end` → `turns + 1`.
  - `session_end` → `ended_at`, Status `ok` (ausgenommen bereits `failed`). `cron_end` → `ended_at`, `exit_code`, `duration_ms`, Status `exitCode === 0 ? "ok" : "failed"`, `tail` und `tail_at`.
  - Ein beendeter Run wird durch spätere Events nicht wieder geöffnet. Ein Run im Status `hung` wird durch ein neues Event wieder zu `running`, und `alerted_at` wird zurückgesetzt.
  - `agent_daily` und `agent_usage` hochzählen, Dubletten (`(owner,id)` existiert) nicht zählen.
- HTTP `POST /api/agents/events`: Bearer `atk_` → `agentTokenOwner`, Body-Limit 64 KB über `readLimitedBody`, Rate-Limit `ingest`. Antworten: 401 ungültiges Token, 413, 400 JSON, 422 Form, 429 bei `agent_limit`/`quota` mit `detail`, sonst 200 `{ok:true, accepted, duplicates, dropped}`.

- [ ] **Step 1: Failing tests:**
  - `"allowlist drops unknown and sensitive fields"`: Event mit `tool_input`, `prompt`, `transcript_path`, `cwd:"/root/secret"` → nach `recordAgentEvents` enthält kein `select *` aus `agent_events`/`agent_runs`/`agents` die Strings `secret`, `tool_input` oder `prompt`.
  - `"duplicate ids are ignored"`: dasselbe Batch zweimal → `duplicates` = Anzahl, `tool_calls` unverändert.
  - `"out of order events keep counters sane"`: `tool_end` vor `tool_start` → `open_tools` = 0 danach, nicht −1. `session_end`, dann `tool_start` → Run bleibt `ok` und `ended_at` gesetzt.
  - `"cron_end sets status from exit code"`: exitCode 0 → ok, 2 → failed mit `tail`.
  - `"21st agent is rejected"` und `"quota stops at 50000"` (Usage-Zeile vorbefüllen).
  - `"parseAgentBatch rejects more than 100 events"`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren, Schreiben in einer Transaktion pro Batch.
- [ ] **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(agents): allowlisted event ingest with run state`

### Task 4: Status-Auswertung (hung, missed, idle-close)

**Files:**
- Create: `lib/agents/status.ts`
- Test: `lib/agents/status.test.ts`

**Interfaces:**
- Produces:
  - `type RunRow = { id: string; agentKind: AgentKind; status: RunStatus; endedAt: number | null; lastEventAt: number; lastEventType: AgentEventType; openTools: number }`
  - `type AgentRow = { id: string; kind: AgentKind; expectEveryMs: number | null; lastRunStartedAt: number | null; lastMissedAt: number | null }`
  - `export const HUNG_IDLE_MS = 30 * 60_000, HUNG_OPEN_TOOL_MS = 3 * 3_600_000, WAITING_CLOSE_MS = 12 * 3_600_000, CRON_HUNG_MS = 24 * 3_600_000;`
  - `evaluateRun(run: RunRow, now: number): RunStatus | "close_ok" | null` (null = keine Änderung)
  - `missedDue(agent: AgentRow, now: number): boolean`. Grace = `max(15 min, 10 % von expectEveryMs)`. Fällig, wenn `lastRunStartedAt + expectEveryMs + grace < now` und `lastMissedAt` vor dieser Fälligkeit liegt.
  - `applyStatus(now?: number): { newlyHung: string[]; newlyMissed: string[] }` (liest DB, schreibt Status. Für missed wird ein Run mit `run_key = "missed:<fälligkeit>"` und Status `missed` angelegt.)
- Regeln von `evaluateRun` (nur für `status === "running"`):
  - claude: `lastEventType ∈ {turn_end, notification}` → nie hung. Ist `now − lastEventAt > WAITING_CLOSE_MS`, dann `close_ok`, sonst null. Andernfalls hung, wenn `now − lastEventAt > (openTools > 0 ? HUNG_OPEN_TOOL_MS : HUNG_IDLE_MS)`.
  - cron: hung, wenn `now − lastEventAt > CRON_HUNG_MS`.

- [ ] **Step 1: Failing tests:** `"waiting loop never hangs"` (turn_end, now+11h → null, now+13h → close_ok). `"idle session hangs after 30 minutes"` (tool_end, +29 min → null, +31 min → hung). `"open tool waits 3 hours"` (openTools 1, +2h59 → null, +3h01 → hung). `"missed cron fires once per due slot"` (every 24h, last start −24h−16min → true; mit lastMissedAt nach Fälligkeit → false). `"missed without expectEveryMs is never due"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(agents): rule-based hung and missed detection`

### Task 5: Lese-Store und Konto-Einstellungen

**Files:**
- Create: `lib/agents/store.ts`
- Test: `lib/agents/store.test.ts`

**Interfaces:**
- Produces:
  - `type AgentSummary = { id: string; kind: AgentKind; name: string; host: string; lastSeen: number; health: "ok" | "running" | "problem" | "idle"; lastRun: { status: RunStatus; startedAt: number; endedAt: number | null } | null }` (`problem` = letzter Run failed/hung/missed. `idle` = seit über 7 Tagen nicht gesehen.)
  - `listAgents(owner: string): AgentSummary[]` (Probleme zuerst, dann nach `lastSeen` absteigend)
  - `agentRuns(owner: string, agentId: string, limit = 50): RunRow & { startedAt: number; exitCode: number | null; durationMs: number | null; toolCalls: number; toolErrors: number; turns: number; tail: string | null }[]` (null, wenn der Agent nicht zum Owner gehört; Prüfung im Store, nicht in der Seite)
  - `runsBetween(owner: string, from: number, to: number)` für das Briefing
  - `medianDurationMs(agentId: string, days: number, now?: number): number | null`
  - `type NotifySettings = { briefingHour: number; alertsEmail: boolean; webhook: { kind: "telegram" | "slack" | "discord" | "generic"; url: string; chatId?: string } | null }`
  - `getNotifySettings(owner)`, `saveNotifySettings(owner, s: NotifySettings): "ok" | "invalid_url"` (nur `https:`; bei Telegram ist `url` das Bot-Token und muss `^\d+:[\w-]{30,}$` entsprechen)

- [ ] **Step 1: Failing tests:** `"agents are isolated per owner"` (A sieht nicht B. `agentRuns(A, agentVonB)` → null). `"problems sort first"`. `"median over 14 days ignores running runs"`. `"webhook must be https"` (http → invalid_url).
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(agents): read model and notification settings`

### Task 6: Morgen-Briefing

**Files:**
- Create: `lib/agents/briefing.ts`, `lib/agents/copy.ts` (Briefing- und Alert-Texte EN/DE)
- Modify: `lib/email.ts` `MailFamily` um `"agent-briefing" | "agent-alert"`
- Test: `lib/agents/briefing.test.ts`

**Interfaces:**
- Consumes: `runsBetween`, `medianDurationMs`, `listAgents` (Task 5); `layout`, `heading`, `paragraph`, `button` aus `lib/email-layout.ts`; `escapeHtml`.
- Produces:
  - `type BriefingAgent = { name: string; host: string; kind: AgentKind; runs: number; ok: number; failed: number; hung: number; missed: number; turns: number; toolCalls: number; lastProblem: { status: RunStatus; at: number; exitCode: number | null; tail: string | null } | null; durationVsMedian: number | null }`
  - `buildBriefing(owner: string, since: number, now: number): { problems: BriefingAgent[]; quiet: BriefingAgent[] }`
  - `renderBriefingMail(b: ReturnType<typeof buildBriefing>, lang: "en" | "de", dashboardUrl: string): { subject: string; text: string; html: string }`
- Feste Texte. Kopfzeile = Betreff:
  - DE: `"{n} Problem(e), {m} Agents unauffällig"`, bei 0 Problemen `"Alles ruhig: {m} Agents unauffällig"`
  - EN: `"{n} problem(s), {m} agents quiet"`, bei 0 `"All quiet: {m} agents ran fine"`
  - Pro Problem eine Zeile, z. B. DE: `"autoblog (server1): fehlgeschlagen um 07:03, Exit 1"`, `"agent-tracking (server1): hängt seit 02:14"`, `"backup: Lauf fehlt (erwartet 05:35)"`. Uhrzeiten in `Europe/Berlin`.
  - Unauffällige Agents kompakt: `"blogger 3× ok · claude/agent-tracking 2 Sessions, 41 Tool-Calls"`.
  - Ein `tail` wird nur im Problemblock gezeigt, gekürzt auf die letzten 5 Zeilen und HTML-escaped.
- Kein Versand, wenn es keine Agents mit Läufen im Zeitraum gibt.

- [ ] **Step 1: Failing tests:** `"headline counts problems and quiet agents"` (2 failed + 9 ok → Betreff DE exakt `"2 Probleme, 9 Agents unauffällig"`). `"all quiet subject"`. `"tail is escaped and trimmed to 5 lines"` (`<script>` → `&lt;script&gt;`). `"no agents, no briefing"` (`buildBriefing` leer → Aufrufer sendet nicht; Hilfsfunktion `briefingWorthSending(b): boolean`).
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(agents): rule-based morning briefing`

### Task 7: Sofort-Meldungen, Webhooks und 15-Minuten-Cron

**Files:**
- Create: `lib/agents/notify.ts`, `scripts/agents-cron.ts`, `scripts/agents-cron.sh`
- Modify: `package.json` Script `"cron:agents": "tsx --no-warnings scripts/agents-cron.ts"`
- Test: `lib/agents/notify.test.ts`

**Interfaces:**
- Consumes: `applyStatus` (Task 4), `getNotifySettings` (Task 5), `buildBriefing`/`renderBriefingMail` (Task 6), `sendMail`.
- Produces:
  - `type Alert = { agent: string; host: string; status: "failed" | "hung" | "missed"; at: number; detail: string; url: string }`
  - `webhookRequest(w: NonNullable<NotifySettings["webhook"]>, a: Alert, lang): { url: string; body: string }`. Telegram: `https://api.telegram.org/bot<token>/sendMessage`, Body `{chat_id, text}`. Slack: `{text}`. Discord: `{content}`. Generic: `{text, agent, status, url}`.
  - `sendAlerts(now?: number): Promise<number>`: alle Runs mit Status failed/hung/missed und `alerted_at is null`, die in den letzten 24 h entstanden sind → E-Mail (wenn `alertsEmail`) und Webhook (Timeout 5 s, Fehler nur loggen), danach `alerted_at = now`. Pro Konto und Lauf höchstens 10 Meldungen, der Rest wird zu einer Sammelmeldung „und N weitere“ zusammengefasst.
  - `dueBriefingOwners(now: number): string[]`: Konten mit mindestens einem Agent, deren lokale Stunde (`Europe/Berlin`) ≥ `briefing_hour` ist und deren `briefing_last_day` ≠ heute.
- `scripts/agents-cron.ts`: `applyStatus()` → `sendAlerts()` → für jedes fällige Konto Briefing über den Zeitraum seit dem letzten Briefing (höchstens 36 h) senden und dann `briefing_last_day` setzen. Ausgabe einer Zeile pro Schritt.
- `scripts/agents-cron.sh`: Muster wie `scripts/tracking-cron.sh` (flock, `_cron-env.sh`, Log `.data/agents-cron.log`). Crontab-Zeile im Kopfkommentar: `*/15 * * * * /bin/bash /root/agent-tracking/scripts/agents-cron.sh`.

- [ ] **Step 1: Failing tests:** `"telegram preset builds sendMessage request"` (URL und Body exakt). `"slack and discord use their field names"`. `"alerts are sent once"` (`fetch` mocken, zweimal `sendAlerts` → ein Request). `"more than 10 alerts are summarized"`. `"briefing is due once per day after the hour"` (06:59 → nicht fällig, 07:00 → fällig, nach dem Setzen → nicht fällig).
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS. `npm run cron:agents` gegen eine leere lokale DB läuft fehlerfrei durch.
- [ ] **Step 5: Commit** `feat(agents): alerts, webhook presets and 15-minute job`

### Task 8: CLI-Gerüst, Config, Spool, Hook und Flush

**Files:**
- Create: `cli/package.json` (`name: "agenttracking"`, `bin: {"agenttracking": "dist/cli.js"}`, `type: "module"`, `engines.node: ">=22.13"`, `files: ["dist"]`, Script `build: tsc -p .`), `cli/tsconfig.json` (`outDir dist`, `module nodenext`), `cli/src/cli.ts` (Befehls-Router), `cli/src/config.ts`, `cli/src/spool.ts`, `cli/src/hook.ts`, `cli/src/flush.ts`
- Test: `cli/src/hook.test.ts`, `cli/src/spool.test.ts`

**Interfaces:**
- Consumes: Event-Format `AgentEvent` (Task 3). Das CLI dupliziert den Typ in `cli/src/event.ts`, ohne Import aus `lib/`.
- Produces:
  - `config.ts`: `configDir(): string` (`AGENTTRACKING_HOME` oder `~/.agenttracking`), `readConfig(): Config | null`, `writeConfig(c: Config)` (Modus 0600, Ordner 0700). `type Config = { origin: string; token: string; secret: string; host: string }`. `secret` = 32 Byte hex, beim ersten `login` erzeugt.
  - `spool.ts`: `appendEvent(e: AgentEvent): void` (sync append an `spool.jsonl`; liegt die Datei über 2 MB oder 5.000 Zeilen, wird die älteste Hälfte verworfen), `takeBatch(max = 100): { events: AgentEvent[]; commit(): void }` (mit Lock-Datei, damit parallele Flushes nicht doppelt senden)
  - `hook.ts`: `eventFromHook(hookEvent: string, input: unknown, cfg: Config, now: number): AgentEvent | null`. Mapping: `SessionStart→session_start`, `PreToolUse→tool_start`, `PostToolUse→tool_end`, `Stop→turn_end`, `SubagentStop→subagent_end`, `Notification→notification`, `SessionEnd→session_end`. `run = hmac(secret, session_id)` (hex, 64). `agent = {kind:"claude", name: basename(cwd), host: cfg.host}`. `tool = tool_name`. `ok = !(tool_response?.is_error === true || tool_response?.success === false)`; das Feld wird gelesen, aber nie weitergegeben.
  - `runHook(hookEvent: string): Promise<void>`: liest stdin (Timeout 50 ms), `appendEvent`, startet `flush` abgekoppelt (`spawn(process.execPath, [cliPath, "flush"], {detached:true, stdio:"ignore"}).unref()`), höchstens einmal alle 5 s (Zeitstempel-Datei), fängt jeden Fehler ab, keine Ausgabe, Exit 0.
  - `flush.ts`: `flush(): Promise<{ sent: number; kept: number }>`: sendet Batches an `POST {origin}/api/agents/events`. 2xx oder 422 → commit (422 wird verworfen, damit Müll nicht ewig hängt). 401 → nichts senden, Datei `auth-error` anlegen. Netzwerkfehler oder 5xx → behalten, Ende.
- Befehle in `cli.ts`: `hook <Event>`, `flush`, `status` (zeigt Config ohne Token sowie Spool-Größe), plus die Befehle aus Task 9–11.

- [ ] **Step 1: Failing tests:**
  - `"hook event never carries tool input, response, prompt or paths"`: PostToolUse-Input mit `tool_input:{command:"cat /root/secret"}`, `tool_response:{output:"private", is_error:true}`, `transcript_path:"/root/.claude/x.jsonl"`, `cwd:"/root/kunde-geheim"`, `session_id:"raw-session"`. Erwartet: `ok === false`, `agent.name === "kunde-geheim"`, `JSON.stringify(event)` matcht nicht `/secret|private|transcript|raw-session|\/root/`.
  - `"same session hashes the same, different secrets differ"`.
  - `"spool is bounded"`: 6.000 Events anhängen → Zeilen ≤ 5.000, die neuesten sind erhalten.
  - `"runHook is silent and exits 0 on garbage stdin"`: Kindprozess mit stdin `"not json"` und unerreichbarem `origin` → stdout und stderr leer, Exit 0, Dauer < 300 ms (großzügig für CI, Ziel < 100 ms).
  - `"flush keeps events when offline and drops on 422"` (`fetch` mocken).
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS; `cd cli && npm run build` erzeugt `dist/cli.js` mit Shebang.
- [ ] **Step 5: Commit** `feat(cli): config, bounded spool, silent claude hook and flush`

### Task 9: `connect claude` / `disconnect claude`

**Files:**
- Create: `cli/src/connect-claude.ts`
- Test: `cli/src/connect-claude.test.ts`

**Interfaces:**
- Produces:
  - `installRuntime(): string`: kopiert das eigene `dist/` nach `~/.agenttracking/runtime/<version>/` und gibt den Pfad zu `cli.js` zurück. Der Hook hängt damit nicht am npx-Cache.
  - `mergeHooks(settings: Record<string, unknown>, command: (event: string) => string): Record<string, unknown>`: fügt für jedes der 7 Events in `settings.hooks[Event]` einen Eintrag `{matcher: "*"` (nur Tool-Events) `, hooks: [{type: "command", command, timeout: 5}]}` hinzu. Markierung über einen Command, der `agenttracking` und `hook` enthält. Vorhandene eigene Einträge bleiben erhalten und werden nicht dupliziert (idempotent).
  - `removeHooks(settings): Record<string, unknown>`: entfernt nur die eigenen Einträge, leere Arrays und Keys werden aufgeräumt.
  - `connectClaude(opts: { scope: "user" | "project"; settingsPath?: string }): "connected" | "already" | "invalid_json"`: Pfad `~/.claude/settings.json` bzw. `./.claude/settings.json`. Vor dem Schreiben wird ein Backup `settings.json.agenttracking-backup-<ts>` angelegt. Bei nicht parsbarer Datei: nichts schreiben, `invalid_json` zurückgeben, CLI-Meldung mit Pfad. Command-Form: `"<process.execPath>" "<runtime>/cli.js" hook <Event>`.
  - `disconnectClaude(...)`: Gegenstück.
- Ohne Config (kein Login) startet `connect claude` zuerst den Login aus Task 11.

- [ ] **Step 1: Failing tests:** `"merge keeps foreign hooks"` (vorhandener `PostToolUse`-Hook `"echo mine"` bleibt, eigener kommt dazu). `"merge is idempotent"` (zweimal → gleiche Länge). `"remove only removes ours"`. `"invalid json is never overwritten"` (Datei-Inhalt `{"hooks":` → Datei unverändert, Ergebnis `invalid_json`). `"backup is written before change"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(cli): connect and disconnect claude code hooks safely`

### Task 10: `wrap`

**Files:**
- Create: `cli/src/wrap.ts`, `cli/src/mask.ts`
- Test: `cli/src/wrap.test.ts`, `cli/src/mask.test.ts`

**Interfaces:**
- Produces:
  - `maskSecrets(s: string): string`. Ersetzt durch `[masked]`: `Bearer\s+\S+`, `\b(sk|ghp|gho|ghs|atk|wmt|xox[abp])[-_][A-Za-z0-9_-]{8,}`, Werte nach `(key|token|secret|password|passwd|auth)[=:]\s*`, Hex-Folgen ≥ 32 Zeichen, Base64-Folgen ≥ 40 Zeichen.
  - `wrap(argv: string[]): Promise<number>`. Optionen vor `--`: `--name <n>` (Pflicht), `--every <dauer>` (`30m`, `2h`, `24h`, `7d`), `--tail <N>` (1–50, Standard 0). Ablauf: `cron_start` spoolen (mit `expectEveryMs`), Befehl per `spawn(cmd, args, {stdio: ["inherit","inherit", tail ? "pipe" : "inherit"]})`. Bei `--tail` wird stderr gleichzeitig nach `process.stderr` geschrieben und die letzten N Zeilen gepuffert. Dann `cron_end` mit `exitCode` (Signal → 128 + Nummer), `durationMs` und `tail = maskSecrets(...)`. Danach `flush()` mit insgesamt 3 s Timeout. Rückgabe ist der Exit-Code des Befehls, nie ein eigener Fehlercode wegen Tracking.
  - `run` = zufällige UUID pro Aufruf.
  - Ohne Config: Befehl trotzdem ausführen, eine Warnzeile auf stderr ausgeben, nichts senden.

- [ ] **Step 1: Failing tests:** `"wrap passes exit code and output through"` (`sh -c 'echo out; echo err >&2; exit 3'` → Rückgabe 3, Kind-stdout `out`). `"signal maps to 128+n"` (`sh -c 'kill -TERM $$'` → 143). `"tail is masked and limited"` (stderr mit `Authorization: Bearer abc.def`, `ghp_1234567890abcdef`, `password=hunter2` → kein Klartext im gespoolten `cron_end`, maximal N Zeilen). `"no tail by default"` (`cron_end.tail` undefined). `mask.test.ts` mit je einem Fall pro Muster plus `"normal text survives"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS.
- [ ] **Step 5: Commit** `feat(cli): wrap cron commands with exit code and masked tail`

### Task 11: `login` (Device-Flow im CLI)

**Files:**
- Create: `cli/src/login.ts`
- Test: `cli/src/login.test.ts`

**Interfaces:**
- Consumes: HTTP aus Task 2; `writeConfig` (Task 8).
- Produces: `login(opts: { origin?: string; token?: string; host?: string }): Promise<"ok" | "expired" | "denied">`. `origin` Standard `https://agenttracking.co` (überschreibbar per `AGENTTRACKING_ORIGIN`). `host` Standard `os.hostname()`, gekürzt auf das erlaubte Zeichenset. Ablauf: `POST /api/agents/device`, Ausgabe `"Öffne <verifyUrl> und bestätige den Code XXXX-XXXX"` (EN/DE nach `LANG`), Browser öffnen versuchen (`xdg-open`/`open`, Fehler ignorieren), alle `interval` Sekunden pollen bis zu 10 min. Mit `--token atk_…` wird ohne Device-Flow direkt gespeichert. `secret` nur beim ersten Login erzeugen, danach behalten.

- [ ] **Step 1: Failing tests:** `"login stores token and keeps existing secret"` (Server per `fetch`-Mock: pending, pending, approved). `"--token skips device flow"`. `"expired code returns expired"`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. **Step 4:** PASS. Manuell gegen `npm run dev`: `node cli/dist/cli.js login` → Code im Browser bestätigen → `status` zeigt den Host.
- [ ] **Step 5: Commit** `feat(cli): device login`

### Task 12: Dashboard „Your agents“ und Einstellungen

**Files:**
- Create: `app/(en)/app/fleet/page.tsx`, `app/(en)/app/fleet/[agentId]/page.tsx`, `app/(en)/app/fleet/settings/page.tsx`, `components/FleetList.tsx`
- Modify: `components/DashboardShell.tsx` (Navigationspunkt „Your agents“ / „Deine Agents“), `lib/agents/copy.ts` (Dashboard-Texte)

**Interfaces:**
- Consumes: `requireAccount`, `listAgents`, `agentRuns`, `listAgentTokens`, `revokeAgentToken`, `getNotifySettings`, `saveNotifySettings`.
- Verhalten:
  - `/app/fleet`: Ampel pro Agent (problem rot, running blau, ok grün, idle grau), Name, Host, Typ, letzter Lauf. Leerzustand mit den zwei Befehlen `npx agenttracking connect claude` und `npx agenttracking wrap --name backup --every 24h -- ./backup.sh` (`CopyButton`).
  - `/app/fleet/[agentId]`: Tabelle der letzten 50 Läufe (Start, Dauer, Status, Turns/Tool-Calls bzw. Exit-Code), `tail` als `<pre>` nur bei Problemen. Fremde oder unbekannte ID → `redirect("/app/fleet")`.
  - `/app/fleet/settings`: Briefing-Stunde (0–23), Alerts per E-Mail an/aus, Webhook (Preset-Auswahl, URL bzw. Bot-Token und Chat-ID, Button „Testnachricht senden“), Maschinenliste mit „Widerrufen“. Alles per Server Actions, die `requireAccount` selbst prüfen.
- `metadata.robots` noindex wie bei den bestehenden App-Seiten.

- [ ] **Step 1:** Seiten bauen.
- [ ] **Step 2: Verify:** `npm run typecheck` grün. `npm run dev`, dann mit Playwright: Login, `/app/fleet` leer zeigt die Befehle. Nach dem Einspielen von Test-Events (`curl` mit `atk_`-Token) erscheinen Agents mit richtiger Ampel. Fremde Agent-ID leitet um. Widerrufen → nächster `curl` liefert 401. Screenshot EN und DE.
- [ ] **Step 3: Commit** `feat(agents): fleet dashboard and settings`

### Task 13: Startseite mit zwei Seiten und Doku

**Files:**
- Modify: `app/(en)/page.tsx`, `app/(de)/de/page.tsx`, `lib/home-content.ts`, `app/(en)/docs/page.tsx`, `app/(de)/de/docs/page.tsx`, `app/(en)/privacy/page.tsx`, `app/(de)/de/datenschutz/page.tsx`, `README.md`

**Verhalten:**
- Hero oder direkt darunter zwei gleichwertige Karten: **„Who's coming for you?“** (bestehendes Angebot: welche Agents deine Website und deine Tools besuchen) und **„What's your agent doing?“** (neu: Claude-Loops, Cron-Jobs, eigene Agents; Morgen-Briefing; „Free during beta“). DE: „Wer kommt zu dir?“ / „Was macht dein Agent?“. Jede Karte hat einen eigenen CTA. Der neue CTA führt zu `/login?next=/app/fleet`.
- Doku-Abschnitt „Monitor your own agents“: Login, `connect claude`, `wrap`, Was gesendet wird / was nie (Liste aus den Global Constraints), Retention-Zahlen, `disconnect`.
- Datenschutzerklärung EN und DE: neuer Abschnitt mit genau diesen Feldern und Fristen.
- Copy-Stil der bestehenden Seiten (sachlich, „unbekannt statt erfunden“). Keine Versprechen über nicht gebaute Funktionen (Codex, Hermes, Brücke) außer als „coming later“.

- [ ] **Step 1:** Umsetzen.
- [ ] **Step 2: Verify:** `npm run build` grün. Startseite EN/DE per Playwright bei 375 px und 1280 px ohne horizontales Scrollen, beide CTAs funktionieren. Bestehende Tests (`seo-links.test.ts`, `privacy.test.ts`) grün.
- [ ] **Step 3: Commit** `feat(site): two-sided positioning and agent monitoring docs`

### Task 14: Dogfooding auf Gordens Server

**Vorbedingung:** Tasks 1–13 sind gemerged und deployt. **Deployment, Änderungen an `~/.claude/settings.json` und an der Crontab erst nach ausdrücklicher Freigabe von Gorden zu diesem Zeitpunkt.**

- [ ] **Step 1:** `cd cli && npm run build && npm pack` → `agenttracking-0.1.0.tgz`.
- [ ] **Step 2:** `npx ./cli/agenttracking-0.1.0.tgz login`, Code im Browser bestätigen.
- [ ] **Step 3:** `npx ./cli/agenttracking-0.1.0.tgz connect claude`. Eine Claude-Session starten, die Session erscheint in `/app/fleet`. Vorher und nachher prüfen, dass bestehende Hooks (graphify, remember, superpowers usw.) erhalten sind (`diff` gegen das Backup).
- [ ] **Step 4:** Mindestens 10 Crontab-Zeilen auf `agenttracking wrap --name <x> --every <intervall> --tail 20 -- <bisheriger befehl>` umstellen. Dabei Runtime-Pfad statt npx verwenden: `node ~/.agenttracking/runtime/<v>/cli.js wrap …`. Crontab-Backup vorher anlegen. Bei der Gelegenheit den im Klartext stehenden Admin-Key in eine Env-Datei verschieben, falls Gorden zustimmt.
- [ ] **Step 5:** `scripts/agents-cron.sh` in die Crontab eintragen (`*/15 * * * *`).
- [ ] **Step 6: Verify:** Am nächsten Morgen kommt das Briefing um 07:00 an. Ein absichtlich fehlschlagender Test-Job (`wrap --name canary -- false`) löst innerhalb von 15 min genau eine Sofort-Meldung aus.
