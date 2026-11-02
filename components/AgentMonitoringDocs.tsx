import { AGENT_EVENT_RETENTION_DAYS, AGENT_TAIL_RETENTION_DAYS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

/** Docs section "Monitor your own agents", EN and DE. Field list matches lib/agents/ingest.ts. */

const CMD = {
  login: "npx agenttracking login",
  claude: "npx agenttracking connect claude",
  wrap: `# crontab: before
0 7 * * * /opt/backup.sh
# after
0 7 * * * npx agenttracking wrap --name backup --every 24h --tail 20 -- /opt/backup.sh`,
  off: "npx agenttracking disconnect claude",
};

const COPY = {
  en: {
    title: "Monitor your own agents",
    intro: "The other side of agent traffic: what your own Claude Code loops and cron jobs did while you were away. Free during the beta, up to 50 agents and 50,000 events a month.",
    steps: [
      ["1. Connect this machine", "Shows a code and opens the browser; confirm it while signed in. Each machine gets its own token you can revoke in the settings.", CMD.login],
      ["2. Track Claude Code", "Adds hooks to ~/.claude/settings.json (a backup is written next to it, your own hooks stay). Use --project for .claude/settings.json in the current folder.", CMD.claude],
      ["3. Wrap cron jobs", "Output and exit code of the job stay exactly as they were. --every tells us when the next run is due, so a missing run is noticed. --tail sends the last stderr lines, with tokens and passwords masked.", CMD.wrap],
    ],
    after: "Every morning (07:00 Europe/Berlin by default) you get one briefing. Immediate alerts go out when a run fails, is stuck, or goes missing: by email, and optionally to Telegram, Slack, Discord or a webhook.",
    sentTitle: "What is sent, and what never is",
    sent: ["Event type: session start and end, tool start and end, turn end, cron start and end", "Tool name (for example Bash or mcp__github__create_issue) and whether it succeeded", "The project folder name (only the last part of the path) and a host label", "A session id, hashed on your machine with a secret that never leaves it", "For cron: exit code, duration, and only with --tail the masked last stderr lines"],
    never: "Never sent: prompts, answers, tool input or output, file contents, full paths, transcripts.",
    retention: `Kept for: events ${AGENT_EVENT_RETENTION_DAYS} days, runs ${RAW_RETENTION_DAYS} days, stderr lines ${AGENT_TAIL_RETENTION_DAYS} days. Daily counts stay.`,
    offTitle: "Switch it off",
  },
  de: {
    title: "Eigene Agents überwachen",
    intro: "Die andere Seite von Agent-Traffic: was deine eigenen Claude-Code-Loops und Cron-Jobs gemacht haben, während du weg warst. Kostenlos während der Beta, bis 50 Agents und 50.000 Events im Monat.",
    steps: [
      ["1. Maschine verbinden", "Zeigt einen Code und öffnet den Browser; bestätige ihn, während du angemeldet bist. Jede Maschine bekommt ein eigenes Token, das du in den Einstellungen widerrufen kannst.", CMD.login],
      ["2. Claude Code tracken", "Trägt Hooks in ~/.claude/settings.json ein (daneben entsteht ein Backup, deine eigenen Hooks bleiben). Mit --project für .claude/settings.json im aktuellen Ordner.", CMD.claude],
      ["3. Cron-Jobs umschließen", "Ausgabe und Exit-Code des Jobs bleiben genau wie vorher. --every sagt uns, wann der nächste Lauf fällig ist, damit ein fehlender Lauf auffällt. --tail schickt die letzten stderr-Zeilen mit, Tokens und Passwörter maskiert.", CMD.wrap],
    ],
    after: "Jeden Morgen (standardmäßig 07:00 Europe/Berlin) kommt ein Briefing. Sofort-Meldungen gibt es, wenn ein Lauf fehlschlägt, hängt oder fehlt: per Mail und optional an Telegram, Slack, Discord oder einen Webhook.",
    sentTitle: "Was gesendet wird, und was nie",
    sent: ["Event-Typ: Session-Start und -Ende, Tool-Start und -Ende, Turn-Ende, Cron-Start und -Ende", "Tool-Name (zum Beispiel Bash oder mcp__github__create_issue) und ob er erfolgreich war", "Der Projektordner-Name (nur der letzte Teil des Pfads) und ein Host-Label", "Eine Session-ID, auf deiner Maschine gehasht mit einem Geheimnis, das sie nie verlässt", "Bei Cron: Exit-Code, Dauer und nur mit --tail die maskierten letzten stderr-Zeilen"],
    never: "Nie gesendet: Prompts, Antworten, Tool-Eingaben oder -Ausgaben, Dateiinhalte, volle Pfade, Transkripte.",
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
      {c.steps.map(([title, body, cmd]) => (
        <div key={title} style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h3>
          <p style={{ marginTop: 0 }}>{body}</p>
          <pre className="code">{cmd}</pre>
        </div>
      ))}
      <p>{c.after}</p>
      <h3 style={{ fontSize: 18 }}>{c.sentTitle}</h3>
      <ul>{c.sent.map((s) => <li key={s}>{s}</li>)}</ul>
      <p>{c.never}</p>
      <p>{c.retention}</p>
      <h3 style={{ fontSize: 18 }}>{c.offTitle}</h3>
      <pre className="code">{CMD.off}</pre>
    </section>
  );
}
