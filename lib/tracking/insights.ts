import type { ToolStat } from "./dashboard";
import type { DataState } from "./data-state";
import type { LogAttemptSummary } from "./db";
import type { TaskRun } from "./task-runs";
import type { Finding } from "./findings";

export type Insight = {
  id: string;
  priority: "check_first" | "investigate" | "setup";
  title: string;
  evidence: string;
  action: string;
  boundary: string;
  href: string;
  kind: "measurement" | "tool" | "access" | "outcome" | "test" | "finding";
};
export type InsightInput = {
  domain: string; lang: "en" | "de"; days: number; now: number; owner: boolean;
  state: DataState; quotaGaps: number; tools: ToolStat[]; attempts: LogAttemptSummary[];
  outcomes: { reports: number; failed: number }; goalAttempts: number; outcomeConfigured: boolean;
  runs: TaskRun[]; findings: Finding[];
};

/** Evidence rules, not inferred prompts, lost revenue, or an AI-generated diagnosis. */
export function deriveInsights(input: InsightInput): Insight[] {
  const { lang, days } = input;
  const de = lang === "de", base = `/app/${encodeURIComponent(input.domain)}`, docs = de ? "/de/docs" : "/docs";
  const settings = input.owner ? `${base}/settings` : docs;
  const out: Insight[] = [];
  const add = (value: Insight) => out.push(value);
  if (input.quotaGaps > 0 || input.state === "quota_reached") add({
    id: "quota", kind: "measurement", priority: "check_first",
    title: de ? "Die Messung hat Lücken" : "Measurement has gaps",
    evidence: de ? `${input.quotaGaps} Kontingentmeldungen in ${days} Tagen.` : `${input.quotaGaps} quota gap reports in ${days} days.`,
    action: de ? "Kontingent und Messstatus prüfen" : "Check usage and measurement status", href: settings,
    boundary: de ? "Die Meldungen entsprechen nicht der Zahl verlorener Besucher. Vergleiche sind unvollständig." : "Reports are not a count of lost visitors. Comparisons are incomplete.",
  });
  if (input.state !== "active" && input.state !== "quota_reached") add({
    id: "source", kind: "measurement", priority: "setup",
    title: de ? "Zuerst die Datenquelle prüfen" : "Check the data source first",
    evidence: input.state === "source_stale" ? (de ? "Die Quelle liefert keine frischen Beobachtungen." : "The source is not providing fresh observations.") : (de ? "Noch keine aktuelle Browser- oder Log-Abdeckung bestätigt." : "Current browser or log coverage is not confirmed yet."),
    action: de ? "Einrichtung und Eingang prüfen" : "Check setup and incoming data", href: settings,
    boundary: de ? "Fehlende Daten bedeuten nicht, dass keine Agenten aktiv sind." : "Missing data does not mean there is no agent activity.",
  });
  for (const tool of [...input.tools].sort((a, b) => Math.max(b.errors, b.failed + b.timedOut) - Math.max(a.errors, a.failed + a.timedOut) || a.name.localeCompare(b.name))) {
    // Legacy error totals and classified outcomes overlap; never add them together.
    const failures = Math.max(tool.errors, tool.failed + tool.timedOut);
    if (!failures) continue;
    add({ id: `tool:${tool.name}`, kind: "tool", priority: "investigate",
      title: de ? `Tool prüfen: ${tool.name}` : `Check tool: ${tool.name}`,
      evidence: de ? `${failures} Fehler-/Timeout-Signale bei ${tool.calls} beobachteten Browser-Aufrufen in ${days} Tagen.` : `${failures} error/timeout signals across ${tool.calls} observed browser calls in ${days} days.`,
      action: de ? "Fehlerklasse prüfen und Aufruf reproduzieren" : "Inspect the error class and reproduce the call", href: `${base}/tools?days=${days}#tool-${encodeURIComponent(tool.name)}`,
      boundary: de ? "Die Ursache ist noch nicht geprüft. Ein technischer Fehler belegt keinen verlorenen Auftrag." : "The cause has not been checked. A technical failure does not prove a lost order.",
    });
  }
  const blocked = input.attempts.filter((r) => r.identityStatus === "verified" && r.method === "GET" && [403, 429].includes(r.status)).reduce((n, r) => n + r.count, 0);
  if (blocked) add({ id: "access", kind: "access", priority: "investigate",
    title: de ? "Verifizierte Crawler erhalten 403 oder 429" : "Verified crawlers receive 403 or 429",
    evidence: de ? `${blocked} GET-Zugriffe in ${days} Tagen wurden abgewiesen oder begrenzt.` : `${blocked} GET requests in ${days} days were denied or rate-limited.`,
    action: de ? "Zugriffe und beabsichtigte Regeln prüfen" : "Review requests and intended access rules", href: `${base}/pages?days=${days}#access-attempts`,
    boundary: de ? "Die Sperre kann beabsichtigt sein. Erst die betroffenen Ressourcen prüfen; keine automatische Freigabe." : "Blocking may be intentional. Inspect the affected resources before changing access.",
  });
  if (input.outcomes.failed > 0) add({ id: "outcome-failed", kind: "outcome", priority: "investigate",
    title: de ? "Der Server meldet fehlgeschlagene Ergebnisse" : "The server reports failed outcomes",
    evidence: de ? `${input.outcomes.failed} von ${input.outcomes.reports} Serverbelegen in ${days} Tagen melden einen Fehler.` : `${input.outcomes.failed} of ${input.outcomes.reports} server receipts in ${days} days report failure.`,
    action: de ? "Belege im eigenen System untersuchen" : "Investigate receipts in your own system", href: `${base}/report`,
    boundary: de ? "Serverbelege allein beweisen keine Agentenidentität. Browser-Versuche haben einen anderen Nenner." : "Server receipts alone do not prove agent identity. Browser attempts have a different denominator.",
  });
  if (input.goalAttempts > 0 && (!input.outcomeConfigured || input.outcomes.reports === 0)) add({
    id: "outcome-setup", kind: "outcome", priority: "setup",
    title: de ? "Den Ausgang der Anfragen bestätigen" : "Confirm what happened to inquiries",
    evidence: de ? `${input.goalAttempts} Browser-Zielversuche in ${days} Tagen; ${input.outcomeConfigured ? "noch keine Serverbelege im Zeitraum" : "kein aktiver Schreibzugang für Serverbelege"}.` : `${input.goalAttempts} browser goal attempts in ${days} days; ${input.outcomeConfigured ? "no server receipts in this period" : "no active outcome write credential"}.`,
    action: de ? "Serverbestätigung einrichten und prüfen" : "Set up and check server confirmation", href: `${docs}#server-outcomes`,
    boundary: de ? "Der Ausgang ist unbekannt. Diese Versuche werden nicht als verlorene Anfragen gewertet." : "The outcome is unknown. These attempts are not counted as lost inquiries.",
  });
  // Only the latest run of each identical task/target/mode can generate a current test issue.
  const latest = new Map<string, TaskRun>();
  for (const run of [...input.runs].filter(r => r.startedAt <= input.now).sort((a,b) => b.startedAt-a.startedAt)) {
    const key = JSON.stringify([run.taskKind, run.targetUrl, run.mode]);
    if (!latest.has(key)) latest.set(key, run);
  }
  for (const run of latest.values()) {
    if (run.startedAt < input.now - days * 86_400_000 || run.status !== "finished" || !["failed", "timed_out"].includes(run.result ?? "")) continue;
    add({ id: `test:${run.runId}`, kind: "test", priority: "investigate",
      title: de ? "Der letzte Anfrage-Test war nicht erfolgreich" : "The latest inquiry test did not pass",
      evidence: `${run.runId} · ${new Date(run.startedAt).toISOString()} · ${run.errorClass ?? run.result}`,
      action: de ? "Testablauf prüfen und erneut ausführen" : "Review the test flow and run it again", href: `${base}/tests#run-${run.runId}`,
      boundary: de ? "Ein synthetischer Browser-Test. Kein Nachweis für das Verhalten eines fremden KI-Agenten." : "A synthetic browser check. It does not demonstrate a third-party AI agent's behavior.",
    });
  }
  for (const finding of input.findings.filter(f => f.status === "fixed")) add({
    id: `finding:${finding.findingId}`, kind: "finding", priority: "investigate",
    title: de ? "Eine dokumentierte Korrektur braucht einen Nachtest" : "A documented fix needs a retest",
    evidence: finding.description,
    action: de ? "Befund öffnen und Nachtest verknüpfen" : "Open the finding and link a retest", href: `${base}/report#finding-${finding.findingId}`,
    boundary: de ? "Als korrigiert markiert; noch nicht durch einen verknüpften Nachtest bestätigt." : "Marked fixed; not yet confirmed by a linked retest.",
  });
  const rank = { check_first: 0, investigate: 1, setup: 2 };
  return out.sort((a,b) => rank[a.priority]-rank[b.priority]);
}
