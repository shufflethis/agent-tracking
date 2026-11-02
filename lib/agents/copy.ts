import type { DashLang } from "../tracking/copy";

/** Visible text of the agent-monitoring area, EN and DE. Same tone as lib/tracking/copy.ts: plain, no em dash. */
const en = {
  connect: {
    title: "Connect a machine",
    intro: (host: string) => `A terminal on "${host}" asked to send agent status to this account. Check that the code matches what your terminal shows.`,
    confirm: "Connect this machine",
    sends: "It will send run status only: start, end, exit code, tool names. Never prompts, tool input or output, or file contents.",
    missing: "This code is unknown or has expired. Run the login command again in your terminal.",
    approved: "Connected. Your terminal picks up the token within a few seconds. You can close this tab.",
    expired: "This code has expired or was already used. Run the login command again.",
    unknown: "This code is unknown. Check it against your terminal and run the login command again if needed.",
    toFleet: "Go to your agents",
  },
};
type AgentCopy = typeof en;
const de: AgentCopy = {
  connect: {
    title: "Maschine verbinden",
    intro: (host: string) => `Ein Terminal auf "${host}" möchte Agent-Status an dieses Konto senden. Prüfe, dass der Code mit dem in deinem Terminal übereinstimmt.`,
    confirm: "Diese Maschine verbinden",
    sends: "Gesendet wird nur der Status von Läufen: Start, Ende, Exit-Code, Tool-Namen. Nie Prompts, Tool-Eingaben oder -Ausgaben oder Dateiinhalte.",
    missing: "Dieser Code ist unbekannt oder abgelaufen. Führe den Login-Befehl im Terminal noch einmal aus.",
    approved: "Verbunden. Dein Terminal holt sich das Token in wenigen Sekunden. Du kannst diesen Tab schließen.",
    expired: "Dieser Code ist abgelaufen oder wurde schon benutzt. Führe den Login-Befehl noch einmal aus.",
    unknown: "Dieser Code ist unbekannt. Vergleiche ihn mit deinem Terminal und starte den Login bei Bedarf neu.",
    toFleet: "Zu deinen Agents",
  },
};

export const agentCopy = (lang: DashLang): AgentCopy => (lang === "de" ? de : en);
