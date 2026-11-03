import type { RunDetail } from "./store";
import type { DashLang } from "../tracking/copy";

export function runLabel(run: Pick<RunDetail, "status" | "lastEventType" | "toolErrors" | "endReason">, lang: DashLang) {
  const key = run.status === "ok" ? (run.endReason === "idle_timeout" ? "inactive" : run.toolErrors ? "errors" : "completed")
    : run.status === "running" && ["turn_end", "waiting", "session_start"].includes(run.lastEventType) ? "waiting" : run.status;
  const labels: Record<string, [string, string]> = {
    inactive: ["Closed after inactivity", "Nach Inaktivität geschlossen"], errors: ["Completed with tool errors", "Mit Toolfehlern beendet"],
    completed: ["Completed", "Beendet"], waiting: ["Waiting for input", "Wartet auf Eingabe"], running: ["Running", "Läuft"],
    failed: ["Execution failed", "Ausführung fehlgeschlagen"], hung: ["Suspected stuck", "Hängt vermutlich"], missed: ["Expected run missing", "Erwarteter Lauf fehlt"],
  };
  return (labels[key] ?? [key, key])[lang === "de" ? 1 : 0];
}
export function checkLabel(run: Pick<RunDetail, "checkPassed">, lang: DashLang) {
  return run.checkPassed === null ? (lang === "de" ? "Ungeprüft" : "Unchecked")
    : run.checkPassed ? (lang === "de" ? "Prüfung bestanden" : "Check passed") : (lang === "de" ? "Prüfung fehlgeschlagen" : "Check failed");
}
export function eventLabel(type: string, lang: DashLang) {
  const names: Record<string, [string, string]> = {
    session_start: ["Session started", "Session gestartet"], session_end: ["Session ended", "Session beendet"],
    turn_start: ["Turn started", "Durchlauf gestartet"], turn_end: ["Response finished", "Antwort beendet"], turn_error: ["Turn failed", "Durchlauf fehlgeschlagen"],
    tool_start: ["Tool started", "Tool gestartet"], tool_end: ["Tool finished", "Tool beendet"],
    subagent_start: ["Subagent started", "Unteragent gestartet"], subagent_end: ["Subagent finished", "Unteragent beendet"],
    waiting: ["Input requested", "Eingabe angefordert"], notification: ["Notification", "Benachrichtigung"],
    cron_start: ["Job started", "Job gestartet"], cron_end: ["Job finished", "Job beendet"],
  };
  return (names[type] ?? [type, type])[lang === "de" ? 1 : 0];
}
