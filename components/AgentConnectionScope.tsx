import type { DashLang } from "@/lib/tracking/copy";

const COPY = {
  de: {
    title: "Was bedeutet „verbunden“?",
    login: "Dein Website-Login öffnet dein Dashboard. Der Login im Terminal erlaubt diesem Rechner, Tracking-Daten an dein Konto zu senden. Er startet keine Überwachung des ganzen Rechners.",
    accessTitle: "Wer kann die Daten sehen?",
    access: "Deine Agent-Daten sind im Dashboard nur über dein Konto zugänglich, nicht für andere Kunden. Wir als Betreiber können mit entsprechendem Serverzugriff die gespeicherten Tracking-Daten technisch einsehen. Sie sind derzeit nicht Ende-zu-Ende-verschlüsselt.",
    details: "Was wird erfasst, und wie schalte ich es ab?",
    sources: [
      ["Claude Code", "Nach dem Verbinden werden Sessions dieses Betriebssystem-Benutzers auch in anderen Projekten erfasst. Mit --project gelten die Hooks nur für das ausgewählte Projekt. Andere Programme oder Benutzer werden dadurch nicht erfasst."],
      ["Cron-Jobs", "Nur Befehle, die du ausdrücklich mit agenttracking wrap startest."],
      ["OpenTelemetry", "Nur Anwendungen, deren Telemetrie-Export du für Agent Tracking einrichtest."],
      ["Linux / eBPF", "Nur nach manuellem Start: der ausgewählte Prozess und während der Beobachtung neu erfasste Unterprozesse, zeitlich begrenzt."],
    ],
    data: "Gespeichert werden unter anderem Status, Zeitpunkte, Tool-Namen, Rechner- und Projektnamen sowie Konfigurationsfingerabdrücke und Zähler. Die Claude-Code-Anbindung sendet keine Prompts, Antworten, Tool-Inhalte oder Dateiinhalte. Bei OpenTelemetry speichern wir nur ausgewählte Metadaten.",
    tail: "Ausnahme bei Cron: Mit --tail sendest du zusätzlich letzte Fehlerausgaben. Erkannte Geheimnisse werden maskiert; das entfernt nicht zuverlässig alle sensiblen Inhalte.",
    off: "„Widerrufen“ in den Agent-Einstellungen sperrt weitere Übertragungen mit diesem Rechner-Token. Bereits gespeicherte Daten bleiben erhalten. Lokale Claude-Hooks entfernst du mit agenttracking disconnect claude (bei Projekt-Hooks zusätzlich --project).",
    notifications: "Aktivierte E-Mails und Webhooks erhalten außerdem die dafür vorgesehenen Statusmeldungen.",
  },
  en: {
    title: "What does “connected” mean?",
    login: "Your website login opens your dashboard. Logging in from the terminal allows this machine to send tracking data to your account. It does not start monitoring the whole computer.",
    accessTitle: "Who can see the data?",
    access: "Your agent data is accessible in the dashboard through your account, not to other customers. As the operator, we can technically access stored tracking data with appropriate server access. It is currently not end-to-end encrypted.",
    details: "What is collected, and how do I switch it off?",
    sources: [
      ["Claude Code", "Once connected, sessions for this operating-system user are tracked across projects. With --project, hooks apply only to the selected project. This does not track other applications or users."],
      ["Cron jobs", "Only commands you explicitly run with agenttracking wrap."],
      ["OpenTelemetry", "Only applications whose telemetry export you configure for Agent Tracking."],
      ["Linux / eBPF", "Only when started manually: the selected process and descendants newly observed during the bounded observation period."],
    ],
    data: "Stored data includes status, timestamps, tool names, machine and project names, configuration fingerprints and counts. The Claude Code integration does not send prompts, answers, tool contents or file contents. For OpenTelemetry, we store only selected metadata.",
    tail: "Cron exception: --tail also sends recent error output. Recognised secrets are masked; this does not reliably remove all sensitive content.",
    off: "“Revoke” in agent settings blocks further uploads using that machine token. Previously stored data remains. Remove local Claude hooks with agenttracking disconnect claude (add --project for project hooks).",
    notifications: "Enabled emails and webhooks also receive their configured status notifications.",
  },
};

export default function AgentConnectionScope({ lang }: { lang: DashLang }) {
  const c = COPY[lang];
  return (
    <aside className="card" aria-label={c.title} style={{ padding: 24, margin: "20px 0", fontSize: 14, lineHeight: 1.65 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{c.title}</h3>
      <p style={{ margin: "0 0 16px" }}>{c.login}</p>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{c.accessTitle}</h3>
      <p style={{ margin: "0 0 16px" }}>{c.access}</p>
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>{c.details}</summary>
        <ul style={{ paddingLeft: 20 }}>
          {c.sources.map(([label, description]) => <li key={label} style={{ marginBottom: 10 }}><strong>{label}:</strong> {description}</li>)}
        </ul>
        <p>{c.data}</p>
        <p>{c.tail}</p>
        <p>{c.off}</p>
        <p style={{ marginBottom: 0 }}>{c.notifications}</p>
      </details>
    </aside>
  );
}
