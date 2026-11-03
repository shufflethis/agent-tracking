import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: Was macht dein Agent gerade?";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("Was macht dein Agent gerade?", "Claude-Code-Sessions, Cron-Jobs und eigene Agents in einer Liste. Hängende, fehlende und gescheiterte Läufe, Morgen-Briefing und Meldungen.");
}
