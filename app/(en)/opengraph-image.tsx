import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: what is your agent doing right now?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("What's your agent doing right now?", "Claude Code sessions, cron jobs and your own agents on one list. Stuck, missing and failed runs, a morning briefing and alerts.");
}
