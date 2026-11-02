import type { DashLang } from "../tracking/copy";

/** Display helpers for the fleet pages. Times in Europe/Berlin, like the briefing. */
export const when = (at: number | null, lang: DashLang) =>
  at === null ? "" : new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(at));

export function duration(ms: number | null): string {
  if (ms === null || ms < 0) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export function every(ms: number): string {
  if (ms % 86_400_000 === 0) return `${ms / 86_400_000}d`;
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  return `${Math.round(ms / 60_000)}m`;
}

export const HEALTH_CHIP: Record<string, string> = { problem: "chip fail", running: "chip accent", ok: "chip pass", idle: "chip na" };
export const STATUS_CHIP: Record<string, string> = { failed: "chip fail", hung: "chip fail", missed: "chip fail", running: "chip accent", ok: "chip pass" };

export const CONNECT_CLAUDE = "npx agenttracking connect claude";
export const WRAP_EXAMPLE = "npx agenttracking wrap --name backup --every 24h --tail 20 -- ./backup.sh";
