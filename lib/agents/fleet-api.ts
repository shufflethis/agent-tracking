import { dashLang } from "../tracking/copy";
import { db, type Account } from "../tracking/db";
import { effectiveAgentPlan } from "./plans";
import { signalText, type SignalKind, type SignalPayload } from "./signals";
import { agentById, agentRuns, getNotifySettings, listAgents } from "./store";

export function fleetSummaryFor(account: Account, now = Date.now()) {
  const lang = dashLang(account.lang);
  const plan = effectiveAgentPlan(account.agent_plan, now);
  const settings = getNotifySettings(account.email);
  const summaries = listAgents(account.email, now);

  const counts = { total: summaries.length, problem: 0, running: 0, ok: 0, idle: 0 };
  for (const s of summaries) counts[s.health]++;

  const agents = summaries.map((s) => {
    const meta = agentById(account.email, s.id);
    const latest = agentRuns(account.email, s.id, 1)?.[0] ?? null;
    return {
      id: s.id,
      name: s.name,
      host: s.host,
      kind: s.kind,
      health: s.health,
      lastSeen: new Date(s.lastSeen).toISOString(),
      expectEveryMs: meta?.expectEveryMs ?? null,
      lastRun: latest
        ? {
            id: latest.id,
            status: latest.status,
            startedAt: new Date(latest.startedAt).toISOString(),
            endedAt: latest.endedAt ? new Date(latest.endedAt).toISOString() : null,
            durationMs: latest.durationMs ?? (latest.endedAt ? latest.endedAt - latest.startedAt : null),
            exitCode: latest.exitCode,
            turns: latest.turns,
            toolCalls: latest.toolCalls,
            toolErrors: latest.toolErrors,
            dataLoss: latest.dataLoss === 1,
            check: latest.checkName
              ? { name: latest.checkName, version: latest.checkVersion, passed: latest.checkPassed === null ? null : latest.checkPassed === 1 }
              : null,
          }
        : null,
    };
  });

  const signalRows = plan.signals
    ? (db()
        .prepare(
          `select s.id, a.name, a.host, s.kind, s.payload, s.at
           from agent_signals s join agents a on a.id = s.agent_id
           where s.owner = ? order by s.at desc limit 20`,
        )
        .all(account.email) as { id: string; name: string; host: string; kind: SignalKind; payload: string; at: number }[])
    : [];

  const recentSignals = signalRows.map((r) => ({
    agent: r.name,
    host: r.host,
    kind: r.kind,
    at: new Date(r.at).toISOString(),
    summary: signalText(r.kind, JSON.parse(r.payload) as SignalPayload, lang),
  }));

  return {
    generatedAt: new Date(now).toISOString(),
    timezone: settings.timezone,
    plan: {
      id: plan.id,
      agentsUsed: summaries.length,
      agentsLimit: plan.agents,
      signalsEnabled: plan.signals,
    },
    counts,
    agents,
    recentSignals,
  };
}
