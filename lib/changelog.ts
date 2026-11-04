import { CLI_COMMAND, CONNECT_CLAUDE } from "@/lib/agents/format";
import { claudeSetupPrompt } from "@/lib/agents/setup";
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
    title: { en: "Your time zone", de: "Deine Zeitzone" },
    body: { en: "Briefing hour and dashboard times in your own time zone, including US time zones.", de: "Briefing-Stunde und Zeiten im Dashboard in deiner eigenen Zeitzone, auch US-Zeitzonen." },
    today: { en: "Today: times are Central European Time. Pick the briefing hour in the settings accordingly; 13:00 CET is 7 AM Eastern.", de: "Heute: Zeiten sind mitteleuropäische Zeit. Wähl die Briefing-Stunde in den Einstellungen entsprechend." },
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
