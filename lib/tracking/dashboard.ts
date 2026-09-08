import { verifiable } from "./bot-ranges";
import { AGENT_LABELS, REFERRER_LABELS } from "./classify";
import { dailyRows, recentBursts, sessionsPerDay, toolRows, type BurstRow, type DailyRow } from "./db";

/**
 * The four views, computed from daily counters.
 *
 * Pure over rows so the shapes can be tested from a fixture; the two
 * exported loaders at the bottom are the only thing that touches the store.
 */

export type Series = { day: string; referrals: number; fetches: number; calls: number; conversions: number; views: number };

export type Overview = {
  days: Series[];
  totals: { referrals: number; fetches: number; calls: number; conversions: number; views: number; sessions: number };
  /** Same window one period earlier, for the trend arrows. */
  previous: { referrals: number; fetches: number; calls: number; conversions: number };
};

export type AgentRow = { id: string; label: string; kind: "referral" | "fetch"; count: number; share: number; trend: number; bursts: number; burstPages: number; unverified: number; verifiable: boolean };

export type ToolStat = {
  name: string;
  calls: number;
  errors: number;
  successRate: number | null;
  avgMs: number | null;
  simulated: number;
  declarative: boolean;
  registered: boolean;
  neverCalled: boolean;
  lastSeen: number | null;
  topErrors: { message: string; count: number }[];
};

export type PageRow = { path: string; fetches: number; calls: number };

const listDays = (days: number, now: number) => {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(now - i * 86_400_000)));
  return out;
};

export function overview(rows: DailyRow[], sessions: { day: string; sessions: number }[], days: number, now: number): Overview {
  const dayList = listDays(days, now);
  const cutoff = dayList[0];
  const previousStart = listDays(days * 2, now)[0];
  const blank = () => ({ referrals: 0, fetches: 0, calls: 0, conversions: 0, views: 0 });
  const perDay = new Map(dayList.map((d) => [d, blank()]));
  const previous = { referrals: 0, fetches: 0, calls: 0, conversions: 0 };

  for (const r of rows) {
    const inWindow = r.day >= cutoff;
    const inPrevious = !inWindow && r.day >= previousStart;
    const current = inWindow ? perDay.get(r.day) : undefined;
    const target: { referrals: number; fetches: number; calls: number; conversions: number } | undefined = current ?? (inPrevious ? previous : undefined);
    if (!target) continue;
    if (r.kind === "ai_referral") target.referrals += r.count;
    else if (r.kind === "ai_fetch") target.fetches += r.count;
    else if (r.kind === "tool_call") target.calls += r.count;
    else if (r.kind === "conversion") target.conversions += r.count;
    else if (r.kind === "view" && current) current.views += r.count;
  }
  const series: Series[] = dayList.map((day) => ({ day, ...perDay.get(day)! }));
  const totals = series.reduce(
    (acc, s) => ({ referrals: acc.referrals + s.referrals, fetches: acc.fetches + s.fetches, calls: acc.calls + s.calls, conversions: acc.conversions + s.conversions, views: acc.views + s.views, sessions: acc.sessions }),
    { referrals: 0, fetches: 0, calls: 0, conversions: 0, views: 0, sessions: 0 },
  );
  totals.sessions = sessions.filter((s) => s.day >= cutoff).reduce((n, s) => n + s.sessions, 0);
  return { days: series, totals, previous };
}

export function agents(rows: DailyRow[], days: number, now: number): AgentRow[] {
  const dayList = listDays(days, now);
  const cutoff = dayList[0];
  const previousStart = listDays(days * 2, now)[0];
  const current = new Map<string, number>();
  const before = new Map<string, number>();
  const bursts = new Map<string, { n: number; pages: number }>();
  const unverified = new Map<string, number>();
  for (const r of rows) {
    if (r.kind === "unverified" && r.day >= cutoff) {
      unverified.set(r.name, (unverified.get(r.name) ?? 0) + r.count);
      continue;
    }
    if (r.kind === "burst" && r.day >= cutoff) {
      const b = bursts.get(r.name) ?? { n: 0, pages: 0 };
      b.n += r.count;
      b.pages += r.ms_total;
      bursts.set(r.name, b);
      continue;
    }
    if (r.kind !== "ai_referral" && r.kind !== "ai_fetch") continue;
    const map = r.day >= cutoff ? current : r.day >= previousStart ? before : null;
    if (!map) continue;
    map.set(r.name, (map.get(r.name) ?? 0) + r.count);
  }
  // An agent seen only as unverified still gets a row, so the count is not hidden.
  for (const name of unverified.keys()) if (!current.has(name)) current.set(name, 0);
  const total = [...current.values()].reduce((n, c) => n + c, 0);
  return [...current.entries()]
    .map(([name, count]) => {
      const isFetch = name.startsWith("agent:");
      const id = isFetch ? name.slice(6) : name;
      const prev = before.get(name) ?? 0;
      return {
        id,
        label: (isFetch ? AGENT_LABELS[id] : REFERRER_LABELS[id]) ?? id,
        kind: isFetch ? ("fetch" as const) : ("referral" as const),
        count,
        share: total ? count / total : 0,
        trend: prev === 0 ? (count > 0 ? 1 : 0) : (count - prev) / prev,
        bursts: bursts.get(name)?.n ?? 0,
        burstPages: bursts.get(name)?.pages ?? 0,
        unverified: unverified.get(name) ?? 0,
        verifiable: isFetch && verifiable(id),
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function tools(rows: DailyRow[], registry: ReturnType<typeof toolRows>, days: number, now: number): ToolStat[] {
  const cutoff = listDays(days, now)[0];
  const stats = new Map<string, { calls: number; errors: number; ms: number; simulated: number; errs: Map<string, number> }>();
  const get = (name: string) => {
    const s = stats.get(name) ?? { calls: 0, errors: 0, ms: 0, simulated: 0, errs: new Map<string, number>() };
    stats.set(name, s);
    return s;
  };
  for (const r of rows) {
    if (r.day < cutoff) continue;
    if (r.kind === "tool_call") {
      const s = get(r.name);
      s.calls += r.count;
      s.errors += r.errors;
      s.ms += r.ms_total;
    } else if (r.kind === "tool_call_sim") {
      get(r.name).simulated += r.count;
    } else if (r.kind === "tool_error") {
      const at = r.name.indexOf(" ");
      const tool = at > 0 ? r.name.slice(0, at) : r.name;
      const message = at > 0 ? r.name.slice(at + 1) : "error";
      const s = get(tool);
      s.errs.set(message, (s.errs.get(message) ?? 0) + r.count);
    }
  }
  const names = new Set([...registry.map((t) => t.name), ...stats.keys()]);
  return [...names]
    .map((name) => {
      const s = stats.get(name);
      const reg = registry.find((t) => t.name === name);
      const calls = s?.calls ?? 0;
      return {
        name,
        calls,
        errors: s?.errors ?? 0,
        successRate: calls ? (calls - (s?.errors ?? 0)) / calls : null,
        avgMs: calls && s ? Math.round(s.ms / calls) : null,
        simulated: s?.simulated ?? 0,
        declarative: Boolean(reg?.declarative),
        registered: Boolean(reg),
        neverCalled: Boolean(reg) && calls === 0,
        lastSeen: reg?.last_seen ?? null,
        topErrors: [...(s?.errs.entries() ?? [])].map(([message, count]) => ({ message, count })).sort((a, b) => b.count - a.count).slice(0, 3),
      };
    })
    .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));
}

export function pages(rows: DailyRow[], days: number, now: number, limit = 50): PageRow[] {
  const cutoff = listDays(days, now)[0];
  const map = new Map<string, PageRow>();
  for (const r of rows) {
    if (r.day < cutoff) continue;
    if (r.kind !== "page" && r.kind !== "tool_page") continue;
    const row = map.get(r.name) ?? { path: r.name, fetches: 0, calls: 0 };
    if (r.kind === "page") row.fetches += r.count;
    else row.calls += r.count;
    map.set(r.name, row);
  }
  return [...map.values()].sort((a, b) => b.fetches + b.calls - (a.fetches + a.calls)).slice(0, limit);
}

/* ----------------------------------------------------------------- loaders */

export type Dashboard = { overview: Overview; agents: AgentRow[]; tools: ToolStat[]; pages: PageRow[]; bursts: BurstRow[]; days: number };

export function loadDashboard(domain: string, days: number, now = Date.now()): Dashboard {
  // Twice the window, so the trend comparison has a previous period to read.
  const rows = dailyRows(domain, days * 2, now);
  const sessions = sessionsPerDay(domain, days, now);
  return {
    overview: overview(rows, sessions, days, now),
    agents: agents(rows, days, now),
    tools: tools(rows, toolRows(domain), days, now),
    pages: pages(rows, days, now),
    bursts: recentBursts(domain),
    days,
  };
}

/** The one number the public share page shows: interactions in the window. */
export function interactions(o: Overview): number {
  return o.totals.referrals + o.totals.fetches + o.totals.calls + o.totals.conversions;
}
