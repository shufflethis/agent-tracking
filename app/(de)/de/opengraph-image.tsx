import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: see what AI agents do on your website";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("Erkenne KI-Aktivität auf deiner Website.", "Erkennbare KI-Referrals, per Log verifizierte Abrufe und instrumentierte Tool-Aufrufe. Zielversuche und bestätigte Abschlüsse bleiben getrennt.");
}
