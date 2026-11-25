import { CLI_COMMAND, CONNECT_CLAUDE, DOCTOR_COMMAND } from "@/lib/agents/format";
import { AUDIT_ONE_LINER, claudeSetupPrompt, GUARD_EXAMPLE } from "@/lib/agents/setup";
import { SITE_ORIGIN } from "@/lib/site";
import { snippetFor } from "@/lib/tracking/snippet";

/**
 * The public changelog. Dates and contents follow the git history; nothing is
 * listed as shipped that is not on main and live. Every entry says how to use
 * it: a command for the terminal and, where it helps, a prompt to paste into
 * Claude Code. "Next" items carry no dates and no promises about timing.
 */

type L = { en: string; de: string };
export type HowTo = { terminal?: string; claude?: L; note?: L };
export type Entry = { date: string; tag: "agents" | "websites" | "platform"; title: L; body: L; points?: { en: string[]; de: string[] }; how?: HowTo };
export type Planned = { title: L; body: L; today: L; command?: string };

const SNIPPET_PROMPT: L = {
  en: `Add the Agent Tracking snippet to every page of this website.
1. Find the shared layout or template that renders <head> on every page.
2. Add this tag just before </head>, with my domain in place of example.com:
   ${snippetFor("example.com")}
3. Show me the diff before you save it. Do not add cookies, consent code or anything else.`,
  de: `Füge das Agent-Tracking-Snippet auf jeder Seite dieser Website ein.
1. Finde das gemeinsame Layout oder Template, das auf jeder Seite <head> rendert.
2. Füge dieses Tag direkt vor </head> ein, mit meiner Domain statt example.com:
   ${snippetFor("example.com")}
3. Zeig mir den Diff, bevor du speicherst. Keine Cookies, keinen Consent-Code und nichts anderes hinzufügen.`,
};

export const ENTRIES: Entry[] = [
  {
    date: "2026-11-25",
    tag: "agents",
    title: {
      en: "CLI 0.6.1: 100% offline `audit` scanner, Telegram/Slack/Discord unlocked on Free, and interactive `/demo/fleet` sandbox",
      de: "CLI 0.6.1: 100 % Offline-`audit`-Scanner, Telegram/Slack/Discord im Free-Plan freigeschaltet & interaktive `/demo/fleet`-Sandbox",
    },
    body: {
      en: "Run `agenttracking audit` completely offline with zero account to score your machine (0–100) for unpinned npx MCP servers, cleartext http:// remote MCPs, inline JSON secret keys, blanket Bash(*) permissions, unwrapped cron jobs, and missing loop guardrails. Instant Telegram, Slack, Discord and generic webhook alerts are now included in the Free plan (up to 5 agents), and anyone can explore blocked loops, MCP drift and zero-prompt timelines in the browser at `/demo/fleet` with no login.",
      de: "Führe `agenttracking audit` komplett offline und ohne Account aus, um deine Maschine (0–100 Punkte) auf ungepinnte npx-MCP-Server, Klartext-http://-Remote-MCPs, Inline-Secret-Keys, Wildcard-Permissions, ungesicherte Crons und fehlende Loop-Guardrails zu prüfen. Sofort-Alerts an Telegram, Slack, Discord und Webhooks sind ab sofort im Free-Plan (bis 5 Agents) enthalten, und unter `/demo/fleet` lässt sich das Dashboard ohne Login live ausprobieren.",
    },
    points: {
      en: [
        "100% offline security & cost audit: `agenttracking audit` and `agenttracking audit --json`",
        "Telegram, Slack, Discord & webhook alerts unlocked in the Free plan (5 agents)",
        "Zero-login interactive fleet sandbox at `/demo/fleet` + 5 new engineering guides (Hooks, Cost Loops, MCP Security, Stuck Sessions, Cron)",
      ],
      de: [
        "100 % Offline-Sicherheits- & Kosten-Audit: `agenttracking audit` und `agenttracking audit --json`",
        "Telegram-, Slack-, Discord- & Webhook-Alerts im Free-Plan (5 Agents) freigeschaltet",
        "Interaktive Live-Demo ohne Login unter `/demo/fleet` + 5 neue Praxis-Guides (Hooks, Kosten-Loops, MCP-Sicherheit, Hänger, Cron)",
      ],
    },
    how: {
      terminal: `${AUDIT_ONE_LINER}\n${GUARD_EXAMPLE}`,
    },
  },
  {
    date: "2026-11-16",
    tag: "agents",
    title: {
      en: "CLI 0.6.0: Google Antigravity (agy), Cursor, Codex & Gemini hooks, unlimited Pro agents, and local safety fuse",
      de: "CLI 0.6.0: Google Antigravity (agy), Cursor, Codex & Gemini-Hooks, unbegrenzte Pro-Agents und lokale Sicherheitsbremse",
    },
    body: {
      en: "CLI 0.6.0 expands own-agent monitoring across your whole dev-agent stack on Node 18+: connect Google Antigravity (`~/.gemini/config/hooks.json`), Cursor (`~/.cursor/hooks.json`), OpenAI Codex CLI (`~/.codex/config.toml`), Gemini CLI (`~/.gemini/settings.json`) and Claude Code with a single `connect all` command via the SHA-256 verified `/install.sh` installer. Pro now includes unlimited agents, individual agents can be deleted in the dashboard, and the local `guard` circuit breaker adds per-turn call/runtime fuses (`--max-calls`, `--max-minutes`) plus an in-memory destructive-command fuse (`--block-destructive on`).",
      de: "CLI 0.6.0 öffnet das eigene Agent-Monitoring für den gesamten Dev-Agent-Stack ab Node 18+: Verbinde Google Antigravity (`~/.gemini/config/hooks.json`), Cursor (`~/.cursor/hooks.json`), OpenAI Codex CLI (`~/.codex/config.toml`), Gemini CLI (`~/.gemini/settings.json`) und Claude Code mit einem einzigen `connect all`-Befehl über den SHA-256-geprüften `/install.sh`-Installer. Pro enthält jetzt unbegrenzte Agents, einzelne Agents lassen sich im Dashboard löschen, und die lokale `guard`-Schutzbremse erhält Turn-Budgets (`--max-calls`, `--max-minutes`) sowie eine lokale Sperre gegen destruktive Befehle (`--block-destructive on`).",
    },
    points: {
      en: [
        `Connect every supported harness at once: ${CLI_COMMAND} connect all`,
        `Enable local runaway & destructive-command fuse: ${GUARD_EXAMPLE}`,
        `Headless CI / GitHub Actions: ${CLI_COMMAND} wrap --kind codex --name pr-review -- codex exec "check diff"`,
      ],
      de: [
        `Alle unterstützten Agent-Tools verbinden: ${CLI_COMMAND} connect all`,
        `Lokale Schleifen- & Sicherheitsbremse aktivieren: ${GUARD_EXAMPLE}`,
        `Headless CI / GitHub Actions: ${CLI_COMMAND} wrap --kind codex --name pr-review -- codex exec "check diff"`,
      ],
    },
    how: {
      terminal: `${CLI_COMMAND} connect all\n${GUARD_EXAMPLE}`,
    },
  },
  {
    date: "2026-11-11",
    tag: "agents",
    title: {
      en: "CLI 0.4.0, runaway loop alerts, local time zones, and MCP fleet queries",
      de: "CLI 0.4.0, Meldung bei Fehlerschleifen, lokale Zeitzonen und MCP-Flottenabfrage",
    },
    body: {
      en: "Four upgrades across the agent monitor and CLI 0.4.0. First, morning briefings and dashboard timestamps now run in your chosen IANA time zone (US, Europe, UTC or APAC) instead of Europe/Berlin only. Second, Pro detects runaway error loops (five failed tool calls in a row or eight failures of the same tool in 15 minutes) without reading prompts or outputs. Third, CLI 0.4.0 adds `agenttracking doctor` to discover unwrapped crontab jobs locally, an opt-in local `PreToolUse` circuit breaker (`pause`, `resume`, `guard --max-failures 5`), and broader secret masking for `--tail`. Fourth, `GET /api/agents/fleet` and MCP tool `get_fleet_status` let Claude, Cursor or scripts check your monitored agents with a read-only token.",
      de: "Vier Erweiterungen im Agent-Monitoring und in CLI 0.4.0. Erstens laufen Morgen-Briefings und Zeitstempel im Dashboard jetzt in deiner gewählten IANA-Zeitzone (US, Europa, UTC oder APAC) statt nur in Europe/Berlin. Zweitens erkennt Pro Fehlerschleifen (fünf fehlgeschlagene Tool-Aufrufe am Stück oder acht Fehler desselben Tools in 15 Minuten), ohne Prompts oder Ausgaben zu lesen. Drittens bringt CLI 0.4.0 `agenttracking doctor` zur lokalen Erkennung nicht umschlossener Cron-Jobs, eine optionale lokale `PreToolUse`-Bremse (`pause`, `resume`, `guard --max-failures 5`) und breitere Secret-Maskierung für `--tail`. Viertens erlauben `GET /api/agents/fleet` und das MCP-Tool `get_fleet_status` die Abfrage deiner Agents direkt aus Claude, Cursor oder eigenen Skripten.",
    },
    points: {
      en: [
        `Update hooks to CLI 0.4.0: ${CONNECT_CLAUDE}`,
        `Audit local hooks and crontab schedules: ${DOCTOR_COMMAND}`,
        `Optional local loop brake: ${GUARD_EXAMPLE}`,
        `Query your fleet: GET ${SITE_ORIGIN}/api/agents/fleet or POST ${SITE_ORIGIN}/api/mcp (get_fleet_status)`,
      ],
      de: [
        `Hooks auf CLI 0.4.0 aktualisieren: ${CONNECT_CLAUDE}`,
        `Lokale Hooks und Crontab prüfen: ${DOCTOR_COMMAND}`,
        `Optionale lokale Schleifen-Bremse: ${GUARD_EXAMPLE}`,
        `Flotte abfragen: GET ${SITE_ORIGIN}/api/agents/fleet oder POST ${SITE_ORIGIN}/api/mcp (get_fleet_status)`,
      ],
    },
    how: {
      terminal: `${CONNECT_CLAUDE}\n${DOCTOR_COMMAND}`,
      claude: { en: claudeSetupPrompt("en"), de: claudeSetupPrompt("de") },
      note: {
        en: "Pick your time zone and create a read-only API/MCP token under Your agents → Settings.",
        de: "Zeitzone und Lese-Token für API/MCP stellst du unter Deine Agents → Einstellungen ein.",
      },
    },
  },
  {
    date: "2026-11-04",
    tag: "agents",
    title: { en: "Pro: alerts when a configuration changes or an agent uses a new tool", de: "Pro: Meldung, wenn sich die Konfiguration ändert oder ein Agent ein neues Tool nutzt" },
    body: {
      en: "Two new alerts for Pro, through the same channels as failures. Configuration: an MCP server or plugin added or removed, permission rules loosened or tightened, settings, .mcp.json or CLAUDE.md changed. New behavior: an agent uses a tool it has not used before, say a backup job that suddenly calls WebFetch. Both come from data that was already sent: counts, checksums and tool names, never file contents or commands. New agents learn for three days and 20 tool calls before they can trigger a new-tool alert. Each agent's page lists its signals.",
      de: "Zwei neue Meldungen in Pro, über dieselben Kanäle wie Fehler. Konfiguration: ein MCP-Server oder Plugin kommt dazu oder fällt weg, Berechtigungsregeln werden lockerer oder strenger, Einstellungen, .mcp.json oder CLAUDE.md ändern sich. Neues Verhalten: Ein Agent nutzt ein Tool, das er vorher nie genutzt hat, etwa ein Backup-Job, der plötzlich WebFetch aufruft. Beides stammt aus Daten, die ohnehin gesendet werden: Anzahlen, Prüfsummen und Tool-Namen, nie Dateiinhalte oder Befehle. Neue Agents lernen drei Tage und 20 Tool-Aufrufe lang, bevor sie eine Meldung zu neuen Tools auslösen. Auf der Seite jedes Agents stehen seine Auffälligkeiten.",
    },
    how: {
      terminal: CONNECT_CLAUDE,
      note: { en: "Configuration snapshots need CLI 0.3.0: run the command above once more on each machine. Then switch to Pro under Your agents → Settings.", de: "Konfigurations-Snapshots brauchen CLI 0.3.0: Führ den Befehl oben auf jeder Maschine noch einmal aus. Dann unter Deine Agents → Einstellungen auf Pro wechseln." },
    },
  },
  {
    date: "2026-11-04",
    tag: "agents",
    title: { en: "Paid plans: Free and Pro", de: "Bezahlpläne: Free und Pro" },
    body: {
      en: "Agent monitoring now has two plans. Free: 5 agents with the daily briefing and email alerts. Pro: 50 agents, Telegram, Slack, Discord and webhook alerts, OpenTelemetry and task checks, for $9 a month or $90 a year. Agents you already have keep reporting on either plan; only new agents above the limit are refused.",
      de: "Das Agent-Monitoring hat jetzt zwei Pläne. Free: 5 Agents mit täglichem Briefing und E-Mail-Meldungen. Pro: 50 Agents, Meldungen an Telegram, Slack, Discord und Webhooks, OpenTelemetry und Task-Checks, für 9 $ im Monat oder 90 $ im Jahr. Bestehende Agents melden in jedem Plan weiter; nur neue Agents über dem Limit werden abgelehnt.",
    },
    how: { note: { en: "Your plan and the upgrade are in the dashboard under Your agents → Settings.", de: "Deinen Plan und das Upgrade findest du im Dashboard unter Deine Agents → Einstellungen." } },
  },
  {
    date: "2026-11-04",
    tag: "platform",
    title: { en: "A home page about your own agents, and a changelog that tells you how", de: "Eine Startseite für deine eigenen Agents, und ein Changelog, das dir sagt, wie" },
    body: {
      en: "The home page now leads with agent monitoring: why agents fail without crashing, how that compares to checking by hand, exit codes and LLM tracing, and one command to connect. Website analytics moved to their own page. Every changelog entry ends with a command or a Claude Code prompt.",
      de: "Die Startseite stellt jetzt das Agent-Monitoring nach vorn: warum Agents scheitern, ohne abzustürzen, wie das im Vergleich zu Nachsehen von Hand, Exit-Codes und LLM-Tracing aussieht, und ein Befehl zum Verbinden. Website-Analytics haben eine eigene Seite. Jeder Changelog-Eintrag endet mit einem Befehl oder Claude-Code-Prompt.",
    },
    points: {
      en: ["Website analytics: /websites", "Markdown versions for agents: send Accept: text/markdown to / or /websites", "llms.txt and llms-full.txt describe both sides"],
      de: ["Website-Analytics: /de/websites", "Markdown-Versionen für Agents: Accept: text/markdown an / oder /websites senden", "llms.txt und llms-full.txt beschreiben beide Seiten"],
    },
    how: { terminal: CONNECT_CLAUDE, claude: { en: claudeSetupPrompt("en"), de: claudeSetupPrompt("de") } },
  },
  {
    date: "2026-11-03",
    tag: "agents",
    title: { en: "CLI 0.3.0: session timelines, task checks, configuration snapshots, OpenTelemetry and Linux observation", de: "CLI 0.3.0: Session-Timelines, Task-Checks, Konfigurations-Snapshots, OpenTelemetry und Linux-Beobachtung" },
    body: {
      en: "Every Claude Code session now has an event-by-event timeline. Named checks report whether a task actually produced the expected result, by version. Agents that speak OpenTelemetry can send traces directly.",
      de: "Jede Claude-Code-Session hat jetzt eine Timeline, Event für Event. Benannte Checks melden pro Version, ob eine Aufgabe wirklich das erwartete Ergebnis gebracht hat. Agents mit OpenTelemetry können Traces direkt senden.",
    },
    points: {
      en: [
        "Session timeline: start, tool calls, notifications and end, with tool names and results only",
        "Task checks: wrap a check script with --check and --version; its exit code decides passed or failed",
        "Configuration snapshots on session start and config changes: fingerprints and counts, contents stay local",
        "OTLP/HTTP JSON trace receiver with parent relationships, status and service versions",
        "Optional bpftrace observation of one Linux process: operation types and hashed IDs, no filenames or payloads",
      ],
      de: [
        "Session-Timeline: Start, Tool-Aufrufe, Benachrichtigungen und Ende, nur mit Tool-Namen und Ergebnissen",
        "Task-Checks: ein Prüfskript mit --check und --version umschließen; sein Exit-Code entscheidet über bestanden oder gescheitert",
        "Konfigurations-Snapshots bei Sessionstart und Konfigurationsänderung: Fingerabdrücke und Zähler, Inhalte bleiben lokal",
        "OTLP/HTTP-JSON-Empfänger für Traces mit Elternbeziehungen, Status und Dienstversionen",
        "Optionale bpftrace-Beobachtung eines Linux-Prozesses: Operationstypen und gehashte IDs, keine Dateinamen oder Inhalte",
      ],
    },
    how: {
      terminal: `# Update: run connect again, the hooks then point at 0.3.0
${CONNECT_CLAUDE}

# A named check for a task
${CLI_COMMAND} wrap --name evaluation --check booking --version v1 -- ./check-booking.sh

# Preview what the configuration snapshot would send
${CLI_COMMAND} snapshot`,
      claude: {
        en: `Update my agenttracking.co connection to CLI 0.3.0 and add a task check.
1. Run: ${CONNECT_CLAUDE}
2. Run: ${CLI_COMMAND} snapshot and explain in two sentences what it would send.
3. Ask me which task I want to check. Write a small script that exits 0 only if the expected result is really there and nonzero otherwise, then run it with:
   ${CLI_COMMAND} wrap --name <task> --check <check-name> --version v1 -- <script>`,
        de: `Aktualisiere meine agenttracking.co-Verbindung auf CLI 0.3.0 und richte einen Task-Check ein.
1. Führe aus: ${CONNECT_CLAUDE}
2. Führe ${CLI_COMMAND} snapshot aus und erklär mir in zwei Sätzen, was gesendet würde.
3. Frag mich, welche Aufgabe ich prüfen will. Schreib ein kleines Skript, das nur mit 0 endet, wenn das erwartete Ergebnis wirklich da ist, sonst mit einem anderen Code, und führe es so aus:
   ${CLI_COMMAND} wrap --name <aufgabe> --check <check-name> --version v1 -- <skript>`,
      },
      note: { en: "OpenTelemetry setup, with your token, is in the dashboard under Your agents → OpenTelemetry.", de: "Die OpenTelemetry-Einrichtung mit deinem Token findest du im Dashboard unter Deine Agents → OpenTelemetry." },
    },
  },
  {
    date: "2026-11-02",
    tag: "agents",
    title: { en: "Agent monitoring: Claude Code and cron jobs, with a morning briefing and alerts", de: "Agent-Monitoring: Claude Code und Cron-Jobs, mit Morgen-Briefing und Meldungen" },
    body: {
      en: "The other side of agent traffic: what your own agents did while you were away. One command connects a machine; stuck, missing and failed runs are detected by rules, not guesses. Free during the beta, up to 50 agents.",
      de: "Die andere Seite von Agent-Traffic: was deine eigenen Agents gemacht haben, während du weg warst. Ein Befehl verbindet eine Maschine; hängende, fehlende und gescheiterte Läufe werden nach Regeln erkannt, nicht geraten. Kostenlos in der Beta, bis 50 Agents.",
    },
    points: {
      en: [
        "Device login with a per-machine token you can revoke",
        "Claude Code hooks that keep your own hooks and write a backup",
        "wrap for cron jobs: same output and exit code, --every for missing runs, --tail for masked stderr",
        "Morning briefing at 07:00 Europe/Berlin by default; alerts by email, Telegram, Slack, Discord or webhook",
      ],
      de: [
        "Geräte-Login mit eigenem, widerrufbarem Token pro Maschine",
        "Claude-Code-Hooks, die deine eigenen Hooks behalten und ein Backup anlegen",
        "wrap für Cron-Jobs: gleiche Ausgabe und gleicher Exit-Code, --every für fehlende Läufe, --tail für maskierte stderr-Zeilen",
        "Morgen-Briefing standardmäßig um 07:00 Europe/Berlin; Meldungen per Mail, Telegram, Slack, Discord oder Webhook",
      ],
    },
    how: { terminal: CONNECT_CLAUDE, claude: { en: claudeSetupPrompt("en"), de: claudeSetupPrompt("de") } },
  },
  {
    date: "2026-11-02",
    tag: "websites",
    title: { en: "MCP server analytics for ChatGPT apps", de: "MCP-Server-Analytics für ChatGPT-Apps" },
    body: {
      en: "Connect your MCP server and see calls, errors and duration per plugin version, next to server-confirmed outcomes such as created PDFs, inquiries and bookings. Test runs and production stay separate.",
      de: "Verbinde deinen MCP-Server und sieh Aufrufe, Fehler und Laufzeit pro Plugin-Version, neben serverbestätigten Ergebnissen wie erzeugten PDFs, Anfragen und Buchungen. Testläufe und Produktion bleiben getrennt.",
    },
    how: { note: { en: "Setup with the SDK is in the docs under MCP analytics.", de: "Die Einrichtung mit dem SDK steht in der Doku unter MCP-Analytics." } },
  },
  {
    date: "2026-09-25",
    tag: "websites",
    title: { en: "Insights, server receipts and browser retests for websites", de: "Insights, Serverbelege und Browser-Nachtests für Websites" },
    body: {
      en: "Observed problems now link to their evidence and a next step. Your server can confirm real inquiries and bookings, and a documented fix can be checked again with a prepared browser run.",
      de: "Beobachtete Probleme sind jetzt mit ihren Belegen und einem nächsten Schritt verknüpft. Dein Server kann echte Anfragen und Buchungen bestätigen, und eine dokumentierte Korrektur lässt sich mit einem vorbereiteten Browser-Lauf erneut prüfen.",
    },
    how: { claude: SNIPPET_PROMPT, note: { en: "Your exact snippet, with your domain, is in the dashboard after you add the site.", de: "Dein genaues Snippet mit deiner Domain steht im Dashboard, sobald du die Site angelegt hast." } },
  },
  {
    date: "2026-09-18",
    tag: "platform",
    title: { en: "Unknown bots are recorded and reviewed nightly", de: "Unbekannte Bots werden aufgezeichnet und nachts geprüft" },
    body: {
      en: "User agents we cannot place are no longer dropped. A nightly job suggests which ones look like AI agents; only a person adding them to the source list changes a number.",
      de: "User-Agents, die wir nicht zuordnen können, werden nicht mehr verworfen. Ein nächtlicher Job schlägt vor, welche nach KI-Agent aussehen; erst wenn ein Mensch sie in die Quellenliste aufnimmt, ändert sich eine Zahl.",
    },
  },
  {
    date: "2026-09-08",
    tag: "platform",
    title: { en: "Agent Tracking is its own open-source product", de: "Agent Tracking ist ein eigenes Open-Source-Produkt" },
    body: {
      en: "Snippet, ingest, dashboard, log import and cron jobs under AGPL-3.0. Use the hosted version or run it yourself with one compose file.",
      de: "Snippet, Ingest, Dashboard, Log-Import und Cron-Jobs unter AGPL-3.0. Nutze die gehostete Version oder betreibe es selbst mit einer Compose-Datei.",
    },
    how: { terminal: `git clone https://github.com/shufflethis/agent-tracking.git && cd agent-tracking
cp .env.example .env && docker compose up -d` },
  },
];

export const PLANNED: Planned[] = [
  {
    title: { en: "Guardrails: block risky commands before they run", de: "Leitplanken: riskante Befehle blockieren, bevor sie laufen" },
    body: {
      en: "Rules that stop a Claude Code tool call before it runs, such as rm -rf outside the project, a force push to main, reading .env or ~/.ssh, or curl piped into a shell. The rules are checked on your machine; only the verdict is sent (\"blocked: force-push\"), never the command itself. Planned for Pro.",
      de: "Regeln, die einen Tool-Aufruf von Claude Code stoppen, bevor er läuft, etwa rm -rf außerhalb des Projekts, Force-Push auf main, Lesen von .env oder ~/.ssh oder curl direkt in eine Shell. Geprüft wird auf deiner Maschine; gesendet wird nur das Ergebnis („blockiert: force-push“), nie der Befehl selbst. Geplant für Pro.",
    },
    today: {
      en: "Today: every tool call shows up by name and result, and changes to your Claude Code hooks and settings show up as configuration changes. Which rule do you want first? Tell @wuebbe on X.",
      de: "Heute schon: Jeder Tool-Aufruf erscheint mit Name und Ergebnis, und Änderungen an deinen Claude-Code-Hooks und -Einstellungen erscheinen als Konfigurationsänderung. Welche Regel willst du zuerst? Schreib @wuebbe auf X.",
    },
  },
  {
    title: { en: "OpenAI Codex", de: "OpenAI Codex" },
    body: { en: "Sessions and tool calls from the Codex CLI, the same way as Claude Code.", de: "Sessions und Tool-Aufrufe aus der Codex CLI, genauso wie bei Claude Code." },
    today: { en: "Today: wrap a Codex run you start from a script or cron. You get start, end, duration, exit code and missing runs.", de: "Heute schon: einen Codex-Lauf, den du per Skript oder Cron startest, mit wrap umschließen. Du bekommst Start, Ende, Dauer, Exit-Code und fehlende Läufe." },
    command: `${CLI_COMMAND} wrap --name codex-nightly --every 24h -- codex exec "<your task>"`,
  },
  {
    title: { en: "Hermes Agent", de: "Hermes Agent" },
    body: { en: "Runs and tool activity from Hermes, without changes to your agent.", de: "Läufe und Tool-Aktivität aus Hermes, ohne Änderungen an deinem Agent." },
    today: { en: "Today: wrap the command that starts your Hermes job.", de: "Heute schon: den Befehl umschließen, der deinen Hermes-Job startet." },
    command: `${CLI_COMMAND} wrap --name hermes-job --every 1h -- <command that starts your Hermes job>`,
  },
  {
    title: { en: "OpenClaw", de: "OpenClaw" },
    body: { en: "Sessions and tool calls from OpenClaw agents.", de: "Sessions und Tool-Aufrufe aus OpenClaw-Agents." },
    today: { en: "Today: wrap scheduled OpenClaw runs, or send OpenTelemetry traces if your setup exports them.", de: "Heute schon: geplante OpenClaw-Läufe umschließen oder OpenTelemetry-Traces senden, falls dein Setup sie exportiert." },
    command: `${CLI_COMMAND} wrap --name openclaw-run --every 24h -- <command that starts your OpenClaw run>`,
  },
];
