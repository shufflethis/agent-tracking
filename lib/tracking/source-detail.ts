import { AGENT_LABELS, REFERRER_LABELS } from "./classify";
import { db, dayKey } from "./db";
import { redactPath } from "./privacy";
import { RAW_RETENTION_DAYS } from "./plans";

export type SourceKind = "referral" | "fetch";
export function sourceDetailHref(domain: string, kind: SourceKind, id: string, days = 30) {
  return `/app/${encodeURIComponent(domain)}/agents/${encodeURIComponent(`${kind}:${id}`)}?days=${days}`;
}
export function parseSourceKey(key: string): { kind: SourceKind; id: string } | null {
  let decoded: string;
  try { decoded = decodeURIComponent(key); } catch { return null; }
  const match = /^(referral|fetch):([a-z0-9][a-z0-9._-]{0,127})$/.exec(decoded);
  return match ? { kind: match[1] as SourceKind, id: match[2] } : null;
}

/** Start of a Berlin calendar day, matching the existing daily counters, including DST. */
export function sourceWindowStart(day: string): number {
  const utc = Date.parse(`${day}T00:00:00Z`);
  const zone = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", timeZoneName: "shortOffset" }).formatToParts(new Date(utc)).find(p => p.type === "timeZoneName")?.value ?? "GMT";
  const offset = /GMT([+-])(\d+)(?::(\d+))?/.exec(zone);
  return utc - (offset ? (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * 60_000 : 0);
}

/** Read only after authorizing the site. Source and domain are bound SQL parameters. */
export function sourceDetail(domain: string, key: string, days: number, now = Date.now(), selectedPath?: string) {
  const parsed = parseSourceKey(key);
  if (!parsed) return null;
  const window = Math.max(1, Math.min(365, Math.floor(days) || 30));
  const today = Date.parse(`${dayKey(now)}T12:00:00Z`);
  const dates = Array.from({ length: window }, (_, i) => new Date(today - (window - i - 1) * 86_400_000).toISOString().slice(0, 10));
  const start = sourceWindowStart(dates[0]), until = now;
  const previousStart = new Date(today - (window * 2 - 1) * 86_400_000).toISOString().slice(0, 10);
  const { kind, id } = parsed, source = kind === "fetch" ? `agent:${id}` : id;
  const site = domain.toLowerCase();
  const daily = db().prepare(`select day, kind, count from daily where domain=? and name=? and day>=? and day<=?
    and kind in ('ai_referral','ai_fetch','ai_fetch_verified','unverified','claim_missing','claim_stale','claim_unavailable','claim_unknown') order by day`)
    .all(site, source, dates[0], dates.at(-1)!) as { day: string; kind: string; count: number }[];
  const previousRows = db().prepare(`select kind, sum(count) as count from daily where domain=? and name=? and day>=? and day<?
    and kind in ('ai_referral','ai_fetch','ai_fetch_verified','unverified','claim_missing','claim_stale','claim_unavailable','claim_unknown') group by kind`)
    .all(site, source, previousStart, dates[0]) as { kind: string; count: number }[];
  const previous = {
    referrals: previousRows.filter(r => r.kind === "ai_referral").reduce((n,r) => n+r.count,0),
    verified: previousRows.filter(r => r.kind === "ai_fetch_verified").reduce((n,r) => n+r.count,0),
    legacy: previousRows.filter(r => r.kind === "ai_fetch").reduce((n,r) => n+r.count,0),
  };
  const matches = kind === "referral" ? "source = ?" : "(source = ? or actor_claim = ?)";
  const args = kind === "referral" ? [site, start, until, source] : [site, start, until, source, id];
  const where = `domain=? and t>=? and t<=? and kind='view' and simulated=0 and ${matches}`;
  const raw = db().prepare(`select path, count(*) as count, min(t) as firstAt, max(t) as lastAt from events where ${where} group by path`).all(...args) as { path: string; count: number; firstAt: number; lastAt: number }[];
  const recent = db().prepare(`select t, path, transport, identity_status as identityStatus, measurement_version as version from events where ${where} order by t desc, id desc limit 50`).all(...args) as { t: number; path: string; transport: string | null; identityStatus: string | null; version: number }[];
  const logs = kind === "fetch" ? db().prepare(`select path, status, method, identity_status as identityStatus, sum(count) as count from log_attempts
    where domain=? and agent=? and day>=? and day<=? group by path,status,method,identity_status order by count desc`).all(site, id, dates[0], dates.at(-1)!) as { path: string; status: number; method: string; identityStatus: string; count: number }[] : [];
  if (!daily.length && !raw.length && !logs.length) {
    // A shorter selected period can be empty without making a previously observed source disappear.
    const known = db().prepare("select 1 from daily where domain=? and name=? limit 1").get(site, source);
    if (!known) return null;
  }
  // Legacy paths are redacted again on output. Merge paths that collapse to the same safe label.
  const pages = new Map<string, typeof raw[number]>();
  for (const row of raw) {
    const path = redactPath(row.path), previous = pages.get(path);
    pages.set(path, { path, count: row.count + (previous?.count ?? 0), firstAt: Math.min(row.firstAt, previous?.firstAt ?? row.firstAt), lastAt: Math.max(row.lastAt, previous?.lastAt ?? row.lastAt) });
  }
  // Match the displayed, sanitized group, never a caller-supplied raw path.
  // JSON binding avoids a variable per path for a group containing many redacted URLs.
  const selected = selectedPath ? pages.get(selectedPath) : undefined;
  const selectedArgs = selected ? [...args, JSON.stringify(raw.filter(r => redactPath(r.path) === selected.path).map(r => r.path))] : [];
  const selectedWhere = `${where} and path in (select value from json_each(?))`;
  const selectedRecent = selected ? db().prepare(`select t, path, transport, identity_status as identityStatus, measurement_version as version from events where ${selectedWhere} order by t desc, id desc limit 50`).all(...selectedArgs) as typeof recent : [];
  // Group in UTC hours, then map to Berlin days so DST changes remain correct.
  const hours = selected ? db().prepare(`select cast(t / 3600000 as integer) as hour, count(*) as count from events where ${selectedWhere} group by hour`).all(...selectedArgs) as { hour: number; count: number }[] : [];
  const selectedDays = new Map<string, number>();
  for (const row of hours) {
    const day = dayKey(row.hour * 3_600_000);
    selectedDays.set(day, (selectedDays.get(day) ?? 0) + row.count);
  }
  const transports = selected ? db().prepare(`select transport, count(*) as count from events where ${selectedWhere} group by transport`).all(...selectedArgs) as { transport: string | null; count: number }[] : [];
  const logPages = new Map<string, typeof logs[number]>();
  for (const row of logs) {
    const path = redactPath(row.path), group = JSON.stringify([path,row.status,row.method,row.identityStatus]);
    logPages.set(group, { ...row, path, count: row.count + (logPages.get(group)?.count ?? 0) });
  }
  const timeline = dates.map(day => {
    const rows = daily.filter(r => r.day === day);
    return { day, referrals: rows.filter(r => r.kind === "ai_referral").reduce((n,r) => n+r.count,0), verified: rows.filter(r => r.kind === "ai_fetch_verified").reduce((n,r) => n+r.count,0), legacy: rows.filter(r => r.kind === "ai_fetch").reduce((n,r) => n+r.count,0), unverified: rows.filter(r => r.kind.startsWith("claim_") || r.kind === "unverified").reduce((n,r) => n+r.count,0) };
  });
  const totals = timeline.reduce((a,r) => ({ referrals:a.referrals+r.referrals, verified:a.verified+r.verified, legacy:a.legacy+r.legacy, unverified:a.unverified+r.unverified }),{referrals:0,verified:0,legacy:0,unverified:0});
  return { kind, id, label: (kind === "fetch" ? AGENT_LABELS[id] : REFERRER_LABELS[id]) ?? id, days: window,
    currentlyRecognized: Boolean((kind === "fetch" ? AGENT_LABELS[id] : REFERRER_LABELS[id])),
    totals, previous, timeline, rawCount: raw.reduce((n,r) => n+r.count,0), rawRetentionDays: RAW_RETENTION_DAYS,
    selected: selected ? { ...selected, activeDays: selectedDays.size, timeline: dates.map(day => ({ day, count: selectedDays.get(day) ?? 0 })),
      transports: transports.map(r => ({ transport: r.transport === "browser" || r.transport === "log" || r.transport === "server" ? r.transport : "unknown", count: r.count })),
      recent: selectedRecent.map(r => ({ ...r, path: redactPath(r.path) })),
    } : null,
    pages: [...pages.values()].sort((a,b) => b.count-a.count || a.path.localeCompare(b.path)),
    recent: recent.map(r => ({ ...r, path: redactPath(r.path) })),
    logPages: [...logPages.values()].sort((a,b) => b.count-a.count),
  };
}
