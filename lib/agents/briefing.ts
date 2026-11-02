import { escapeHtml } from "../email";
import { button, heading, layout, paragraph } from "../email-layout";
import type { DashLang } from "../tracking/copy";
import { agentCopy } from "./copy";
import { medianDurationMs, runsBetween, type BriefingRun } from "./store";
import type { AgentKind, RunStatus } from "./types";

/**
 * The morning briefing: "what happened while you slept", from rules only.
 * No model call per account, so a free account costs nothing to brief.
 */

const TIME_ZONE = "Europe/Berlin";
const TAIL_LINES = 5;

export type BriefingAgent = {
  name: string; host: string; kind: AgentKind;
  runs: number; ok: number; failed: number; hung: number; missed: number; turns: number; toolCalls: number;
  lastProblem: { status: RunStatus; at: number; exitCode: number | null; tail: string | null } | null;
  durationVsMedian: number | null;
};
export type Briefing = { problems: BriefingAgent[]; quiet: BriefingAgent[] };

export const clock = (at: number) => new Intl.DateTimeFormat("de-DE", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(at));

export function buildBriefing(owner: string, since: number, now: number): Briefing {
  const byAgent = new Map<string, { runs: BriefingRun[] }>();
  for (const run of runsBetween(owner, since, now)) {
    const entry = byAgent.get(run.agentId) ?? { runs: [] };
    entry.runs.push(run);
    byAgent.set(run.agentId, entry);
  }
  const problems: BriefingAgent[] = [];
  const quiet: BriefingAgent[] = [];
  for (const [agentId, { runs }] of byAgent) {
    const first = runs[0];
    const count = (s: RunStatus) => runs.filter((r) => r.status === s).length;
    const problem = [...runs].reverse().find((r) => r.status === "failed" || r.status === "hung" || r.status === "missed");
    const last = [...runs].reverse().find((r) => r.durationMs !== null);
    const median = first.agentKind === "cron" ? medianDurationMs(agentId, 14, now) : null;
    const agent: BriefingAgent = {
      name: first.agentName, host: first.host, kind: first.agentKind,
      runs: runs.filter((r) => r.status !== "missed").length, ok: count("ok"), failed: count("failed"), hung: count("hung"), missed: count("missed"),
      turns: runs.reduce((n, r) => n + r.turns, 0), toolCalls: runs.reduce((n, r) => n + r.toolCalls, 0),
      lastProblem: problem ? { status: problem.status, at: problem.status === "hung" ? problem.lastEventAt : problem.startedAt, exitCode: problem.exitCode, tail: problem.tail } : null,
      durationVsMedian: median && last?.durationMs ? last.durationMs / median : null,
    };
    (agent.lastProblem ? problems : quiet).push(agent);
  }
  return { problems, quiet };
}

export const briefingWorthSending = (b: Briefing) => b.problems.length + b.quiet.length > 0;

const label = (a: BriefingAgent) => `${a.name} (${a.host})`;
const lastLines = (tail: string) => tail.split("\n").filter((l) => l.trim()).slice(-TAIL_LINES).join("\n");

export function problemLine(a: BriefingAgent, lang: DashLang): string {
  const c = agentCopy(lang).briefing;
  const p = a.lastProblem!;
  const what = p.status === "hung" ? c.hung(clock(p.at)) : p.status === "missed" ? c.missed(clock(p.at)) : c.failed(clock(p.at), p.exitCode);
  return `${label(a)}: ${what}`;
}

function quietLine(a: BriefingAgent, lang: DashLang): string {
  const c = agentCopy(lang).briefing;
  const summary = a.kind === "claude" ? c.sessions(a.runs, a.toolCalls) : c.runsOk(a.ok);
  const slow = a.durationVsMedian && a.durationVsMedian >= 2 ? ` · ${c.slower(a.durationVsMedian)}` : "";
  return `${label(a)} ${summary}${slow}`;
}

export function renderBriefingMail(b: Briefing, lang: DashLang, dashboardUrl: string): { subject: string; text: string; html: string } {
  const c = agentCopy(lang).briefing;
  const subject = c.subject(b.problems.length, b.quiet.length);
  const text: string[] = [subject, ""];
  const html: string[] = [heading(escapeHtml(subject))];
  if (b.problems.length) {
    text.push(c.problemsHeading);
    html.push(paragraph(`<strong>${escapeHtml(c.problemsHeading)}</strong>`));
    for (const a of b.problems) {
      const line = problemLine(a, lang);
      const tail = a.lastProblem?.tail ? lastLines(a.lastProblem.tail) : "";
      text.push(`- ${line}`, ...(tail ? tail.split("\n").map((l) => `    ${l}`) : []));
      html.push(paragraph(escapeHtml(line)));
      if (tail) html.push(`<pre style="font-size:12px;background:#f4f4f4;padding:8px;white-space:pre-wrap;margin:0 0 12px">${escapeHtml(tail)}</pre>`);
    }
    text.push("");
  }
  if (b.quiet.length) {
    text.push(c.quietHeading, ...b.quiet.map((a) => `- ${quietLine(a, lang)}`), "");
    html.push(paragraph(`<strong>${escapeHtml(c.quietHeading)}</strong>`), paragraph(b.quiet.map((a) => escapeHtml(quietLine(a, lang))).join("<br>"), "muted"));
  }
  text.push(`${c.open}: ${dashboardUrl}`, "", c.footer);
  html.push(button(dashboardUrl, c.open), paragraph(escapeHtml(c.footer), "muted"));
  return { subject, text: text.join("\n"), html: layout({ title: subject, preheader: subject, body: html.join("") }) };
}
