import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: see what AI agents do on your website";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("See evidence of AI activity on your site.", "Identifiable AI referrals, log-verified fetches and instrumented tool calls. Goal attempts and confirmed outcomes stay distinct.");
}
