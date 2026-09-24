import type { Site } from "./db";

export type DataState = "active" | "not_configured" | "no_data_yet" | "source_stale" | "quota_reached";

/** Whether zero is an observed zero or the source is missing/incomplete. */
export function dataState(site: Site, input: { acceptedBeacons: number; quotaGaps: number; logFresh: boolean; windowDays: number; now: number }): DataState {
  if (input.quotaGaps > 0) return "quota_reached";
  if (input.logFresh || input.acceptedBeacons > 0 || (site.last_beacon_at !== null && input.now - site.last_beacon_at <= input.windowDays * 86_400_000)) return "active";
  if (site.last_beacon_at && input.now - site.last_beacon_at > input.windowDays * 86_400_000) return "source_stale";
  if (site.log_since && !input.logFresh) return "source_stale";
  if (!site.verified_at && !site.first_beacon_at) return "not_configured";
  return "no_data_yet";
}
