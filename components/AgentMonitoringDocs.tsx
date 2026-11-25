import { CLI_COMMAND, CLI_INSTALL, CLI_SHA256, CLI_VERIFY, DOCTOR_COMMAND } from "@/lib/agents/format";
import { AUDIT_ONE_LINER } from "@/lib/agents/setup";
import AgentConnectionScope from "@/components/AgentConnectionScope";
import { AGENT_PLANS, AGENT_PRO_PRICE, pricingActive } from "@/lib/agents/plans";
import { SITE_ORIGIN } from "@/lib/site";
import { AGENT_EVENT_RETENTION_DAYS, AGENT_TAIL_RETENTION_DAYS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

/** Docs section "Monitor your own agents", EN and DE. Field list matches lib/agents/ingest.ts. */

const CMD = {
  audit: `${AUDIT_ONE_LINER}
${CLI_COMMAND} audit --json`,
  login: `${CLI_INSTALL}
${CLI_COMMAND} login`,
  claude: `${CLI_COMMAND} connect claude
# Also supported on the same machine (Node >= 18):
${CLI_COMMAND} connect agy
${CLI_COMMAND} connect cursor
${CLI_COMMAND} connect codex
${CLI_COMMAND} connect gemini
${CLI_COMMAND} connect all`,
  doctor: DOCTOR_COMMAND,
  wrap: `# crontab: before
0 7 * * * /opt/backup.sh
# after
0 7 * * * ${CLI_COMMAND} wrap --name backup --every 24h --tail 20 -- /opt/backup.sh

# GitHub Actions / headless CI agent run:
AGENTTRACKING_ORIGIN=${SITE_ORIGIN} ${CLI_COMMAND} login --token "$AGENTTRACKING_TOKEN" --host github-actions
${CLI_COMMAND} wrap --kind codex --name nightly-review --tail 20 -- codex exec "check diff"`,
  guard: `${CLI_COMMAND} guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on
${CLI_COMMAND} pause --reason "deploy freeze"
${CLI_COMMAND} resume`,
  off: `${CLI_COMMAND} disconnect all`,
};

const LIVE = () => pricingActive();
const PRICE_EN = () => LIVE()
  ? `Free: ${AGENT_PLANS.free.agents} agents with local offline audit & guardrails, local-timezone morning briefing, instant Telegram, Slack, Discord, webhook & email alerts, and read-only API/MCP. Pro: unlimited agents, alerts on MCP & config drift, first-time tools and runaway error loops, OpenTelemetry and task checks, $${AGENT_PRO_PRICE.month}/month or $${AGENT_PRO_PRICE.year}/year.`
  : `Free during the beta, up to ${AGENT_PLANS.pro.agents} agents and 50,000 events a month.`;
const PRICE_DE = () => LIVE()
  ? `Free: ${AGENT_PLANS.free.agents} Agents mit 100 % Offline-Audit & Guardrails, Morgen-Briefing in deiner Zeitzone, Sofort-Meldungen an Telegram, Slack, Discord, Webhook & E-Mail sowie Lese-API und MCP. Pro: unbegrenzte Agents, Meldungen bei MCP- & Konfigurations-Drift, neuen Tools und Fehlerschleifen, OpenTelemetry und Task-Checks, ${AGENT_PRO_PRICE.month} $/Monat oder ${AGENT_PRO_PRICE.year} $/Jahr.`
  : `Kostenlos während der Beta, bis ${AGENT_PLANS.pro.agents} Agents und 50.000 Events im Monat.`;

const COPY = {
  en: {
    title: "Monitor your own agents",
    get intro() { return `The other side of agent traffic: what your own Claude Code loops and cron jobs did while you were away. ${PRICE_EN()}`; },
    steps: [
      ["0. Optional 100% offline MCP & guardrail audit (no account)", "Scans local Claude Code, Cursor, Codex, Gemini & Antigravity hooks, unpinned npx MCP servers, cleartext http:// endpoints, wildcard permissions, unwrapped crons and missing loop guardrails without sending a single byte.", CMD.audit],
      ["1. Connect this machine", "Shows a code and opens the browser; confirm it while signed in. Each machine gets its own token you can revoke in the settings.", CMD.login],
      ["2. Track Claude Code, Cursor, Codex CLI or Gemini CLI", "Adds non-destructive hooks to ~/.claude/settings.json, ~/.cursor/hooks.json, ~/.codex/config.toml or ~/.gemini/settings.json (a backup is written next to each file, your own hooks stay). Add --project for project-scoped hooks.", CMD.claude],
      ["3. Inspect local hooks and cron jobs", "Scans connection state, Claude hooks, local MCP server counts and unwrapped crontab schedules on this machine without sending data.", CMD.doctor],
      ["4. Wrap cron jobs", "Output and exit code of the job stay exactly as they were. --every tells us when the next run is due, so a missing run is noticed. --tail sends the last stderr lines, with tokens and keys masked.", CMD.wrap],
    ],
    after: "Every morning (07:00 in your configured IANA time zone; Europe/Berlin by default) you get one briefing. Immediate alerts go out when a run fails, is stuck, goes missing, or spins in an error loop: by email, and optionally to Telegram, Slack, Discord or a webhook.",
    sentTitle: "What is sent, and what never is",
    sent: ["Event type: session start and end, tool start and end, turn end, cron start and end", "Tool name (for example Bash or mcp__github__create_issue) and whether it succeeded", "The project folder name (only the last part of the path) and a host label", "A session id, hashed on your machine with a secret that never leaves it", "For cron: exit code, duration, and only with --tail the masked last stderr lines"],
    never: "The Claude Code integration does not send prompts, answers, tool input or output, file contents, full paths or transcripts. Cron --tail optionally sends error output; masking does not guarantee that all sensitive content is removed.",
    retention: `Kept for: events ${AGENT_EVENT_RETENTION_DAYS} days, runs ${RAW_RETENTION_DAYS} days, stderr lines ${AGENT_TAIL_RETENTION_DAYS} days. Daily counts stay.`,
    offTitle: "Switch it off",
  },
  de: {
    title: "Eigene Agents überwachen",
    get intro() { return `Die andere Seite von Agent-Traffic: was deine eigenen Claude-Code-Loops und Cron-Jobs gemacht haben, während du weg warst. ${PRICE_DE()}`; },
    steps: [
      ["0. Optionales 100 % Offline-MCP- & Sicherheits-Audit (kein Konto)", "Prüft lokal Claude Code, Cursor, Codex, Gemini & Antigravity, ungepinnte npx-MCPs, Klartext-http://-Endpunkte, Wildcard-Permissions, ungesicherte Crons und fehlende Loop-Guardrails ohne ein Byte zu senden.", CMD.audit],
      ["1. Maschine verbinden", "Zeigt einen Code und öffnet den Browser; bestätige ihn, während du angemeldet bist. Jede Maschine bekommt ein eigenes Token, das du in den Einstellungen widerrufen kannst.", CMD.login],
      ["2. Claude Code, Cursor, Codex CLI oder Gemini CLI verbinden", "Trägt schonend Hooks in ~/.claude/settings.json, ~/.cursor/hooks.json, ~/.codex/config.toml oder ~/.gemini/settings.json ein (daneben entsteht jeweils ein Backup, eigene Hooks bleiben). Mit --project projektbezogen im aktuellen Ordner.", CMD.claude],
      ["3. Lokale Hooks und Cron-Jobs prüfen", "Prüft Verbindungsstatus, Claude-Hooks, lokale MCP-Anzahl und noch nicht umschlossene Crontab-Einträge rein lokal, ohne Daten zu senden.", CMD.doctor],
      ["4. Cron-Jobs umschließen", "Ausgabe und Exit-Code des Jobs bleiben genau wie vorher. --every sagt uns, wann der nächste Lauf fällig ist, damit ein fehlender Lauf auffällt. --tail schickt die letzten stderr-Zeilen mit, Tokens und Schlüssel maskiert.", CMD.wrap],
    ],
    after: "Jeden Morgen (standardmäßig 07:00 in deiner gewählten IANA-Zeitzone; Vorgabe Europe/Berlin) kommt ein Briefing. Sofort-Meldungen gibt es, wenn ein Lauf fehlschlägt, hängt, fehlt oder in einer Fehlerschleife dreht: per Mail und optional an Telegram, Slack, Discord oder einen Webhook.",
    sentTitle: "Was gesendet wird, und was nie",
    sent: ["Event-Typ: Session-Start und -Ende, Tool-Start und -Ende, Turn-Ende, Cron-Start und -Ende", "Tool-Name (zum Beispiel Bash oder mcp__github__create_issue) und ob er erfolgreich war", "Der Projektordner-Name (nur der letzte Teil des Pfads) und ein Host-Label", "Eine Session-ID, auf deiner Maschine gehasht mit einem Geheimnis, das sie nie verlässt", "Bei Cron: Exit-Code, Dauer und nur mit --tail die maskierten letzten stderr-Zeilen"],
    never: "Die Claude-Code-Anbindung sendet keine Prompts, Antworten, Tool-Eingaben oder -Ausgaben, Dateiinhalte, vollen Pfade oder Transkripte. Cron --tail sendet optional Fehlerausgaben; die Maskierung garantiert nicht, dass alle sensiblen Inhalte entfernt werden.",
    retention: `Aufbewahrt: Events ${AGENT_EVENT_RETENTION_DAYS} Tage, Läufe ${RAW_RETENTION_DAYS} Tage, stderr-Zeilen ${AGENT_TAIL_RETENTION_DAYS} Tage. Tageszähler bleiben.`,
    offTitle: "Abschalten",
  },
};

export default function AgentMonitoringDocs({ lang }: { lang: "en" | "de" }) {
  const c = COPY[lang];
  return (
    <section className="shell section" id="agent-monitoring">
      <h2>{c.title}</h2>
      <p className="dek">{c.intro}</p>
      <AgentConnectionScope lang={lang} />
      {c.steps.map(([title, body, cmd]) => (
        <div key={title} style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h3>
          <p style={{ marginTop: 0 }}>{body}</p>
          <pre className="code">{cmd}</pre>
        </div>
      ))}
      <p>{c.after}</p>
      <h3 style={{ fontSize: 18 }} id="verify">{lang === "de" ? "Erst prüfen, dann ausführen" : "Check before you run it"}</h3>
      <p>{lang === "de"
        ? "npx führt Code aus dem Netz aus. Wer das nicht blind tun will: Datei laden, die SHA-256-Prüfsumme vergleichen, den Inhalt ansehen und dann aus der geprüften Datei starten. Der Quellcode liegt auf GitHub."
        : "npx runs code from the network. If you would rather not do that blindly: download the file, compare its SHA-256 checksum, look inside, then run it from the checked file. The source is on GitHub."}</p>
      <p style={{ fontFamily: "var(--mono)", fontSize: 13, overflowWrap: "anywhere" }}>SHA-256: {CLI_SHA256}</p>
      <pre className="code" style={{ whiteSpace: "pre-wrap" }}>{CLI_VERIFY}</pre>
      <h3 style={{ fontSize: 18 }}>{c.sentTitle}</h3>
      <ul>{c.sent.map((s) => <li key={s}>{s}</li>)}</ul>
      <p>{c.never}</p>
      <p>{c.retention}</p>
      <h3>{lang === "de" ? "Lokale Sicherheits- & Kostenbremse (PreToolUse-Guard)" : "Local safety & spend fuse (PreToolUse guard)"}</h3>
      <p>{lang === "de"
        ? "Optional kannst du in ~/.agenttracking/guard.json rein lokale Schutzregeln setzen: maximale Fehlerserien, maximale Tool-Aufrufe oder Minuten pro autonomem Turn sowie eine lokale Sperre gegen destruktive Befehle (rm -rf, git push --force, git reset --hard, DROP TABLE). Der Check läuft in unter 1 ms im lokalen Arbeitsspeicher, ohne Netzwerkaufruf und ohne Befehle oder Prompts zu speichern oder hochzuladen:"
        : "Optionally configure purely local rules in ~/.agenttracking/guard.json: max consecutive failures, max tool calls or minutes per autonomous turn, and a local fuse against destructive shell commands (rm -rf, git push --force, git reset --hard, DROP TABLE). Checks run in under 1 ms in local RAM with no network round-trip and without storing or uploading commands or prompts:"}</p>
      <pre className="code">{CMD.guard}</pre>
      <h3 id="fleet-api">{lang === "de" ? "Flotten-API und MCP (get_fleet_status)" : "Fleet API and MCP (get_fleet_status)"}</h3>
      <p>{lang === "de"
        ? "Mit einem Lese-Token (wmt_..., erstellbar unter Deine Agents -> Einstellungen) kannst du den Status deiner eigenen Agents per HTTP oder direkt über MCP in Claude Desktop, Claude Code oder Cursor abfragen:"
        : "With an account read token (wmt_..., created under Your agents -> Settings) you can query your monitored agents over HTTP or ask Claude Desktop, Claude Code or Cursor directly via MCP:"}</p>
      <pre className="code" style={{ whiteSpace: "pre-wrap" }}>{`curl -sS -H "Authorization: Bearer wmt_your_token" ${SITE_ORIGIN}/api/agents/fleet\n# MCP (streamable HTTP): POST ${SITE_ORIGIN}/api/mcp -> tool get_fleet_status`}</pre>
      <h3>{lang === "de" ? "Konfiguration, Fehlerschleifen und OpenTelemetry" : "Configuration, error loops and OpenTelemetry"}</h3>
      <p>{lang === "de" ? "CLI 0.4.0 erfasst bei Sessionstart und Konfigurationsänderungen Fingerabdrücke fester Konfigurationsdateien sowie Zähler für MCP-Einträge, Plugins und Berechtigungsregeln. Inhalte und Regeln bleiben lokal. Pro meldet außerdem Fehlerschleifen, wenn fünf Tool-Aufrufe am Stück oder derselbe Tool-Aufruf achtmal in 15 Minuten scheitert. Eine lokale Vorschau der Konfigurations-Metadaten erhältst du mit:" : "CLI 0.4.0 captures fingerprints of fixed configuration files and counts of MCP entries, plugins and permission rules on session start and configuration changes. Contents and rules stay local. Pro also flags runaway error loops when five tool calls fail in a row or the same tool fails eight times in 15 minutes. Preview snapshot metadata locally with:"}</p>
      <pre className="code">{`${CLI_COMMAND} snapshot`}</pre>
      <p><a href="/app/fleet/telemetry">OpenTelemetry</a>: {lang === "de" ? "Geschützter OTLP/HTTP-JSON-Empfänger mit Trace- und Elternbeziehungen, Status, Dienstversionen und ausgewählten Modell-/Tool-Metadaten. Die Einrichtung steht im Dashboard. Protobuf, gRPC, Metriken und Logs werden nicht angenommen." : "Authenticated OTLP/HTTP JSON receiver with trace/parent relationships, status, service versions and selected model/tool metadata. Setup is in the dashboard. Protobuf, gRPC, metrics and logs are not accepted."}</p>
      <h3>{lang === "de" ? "Optionale Linux-Beobachtung" : "Optional Linux observation"}</h3>
      <p>{lang === "de" ? "Mit bpftrace und passenden Kernel-Rechten kannst du einen ausgewählten Prozess und neue Unterprozesse zeitlich begrenzt beobachten. Gesendet werden Programmstarts, Dateiöffnungs- und Verbindungsversuche mit gehashten Prozess-IDs. Keine Dateinamen, Adressen, Befehlsargumente oder Inhalte. Ersetze die PID durch deinen Agent-Prozess:" : "With bpftrace and appropriate kernel privileges, observe one selected process and new descendants for a bounded period. Sends process execs, file-open and connection attempts with hashed process IDs. No filenames, addresses, command arguments or contents. Replace the PID with your agent process:"}</p>
      <pre className="code">{`${CLI_COMMAND} observe --pid 12345 --name linux-agent --seconds 60 --max-events 1000`}</pre>
      <p>{lang === "de" ? "--print-program zeigt die Probe ohne Start. Das Modul setzt keine Sperrregeln durch. Es erfasst nicht alle möglichen Datei- oder Netzwerkzugriffe und beweist keine Datenübertragung. Bereits laufende Unterprozesse sind nicht automatisch eingeschlossen." : "--print-program previews the probe without starting it. This module does not enforce blocking rules. It does not capture every possible file/network operation or prove data transfer. Already-running child processes are not automatically included."}</p>
      <h3 style={{ fontSize: 18 }}>{c.offTitle}</h3>
      <pre className="code">{CMD.off}</pre>
    </section>
  );
}
