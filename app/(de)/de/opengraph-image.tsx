import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: see what AI agents do on your website";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("Sieh, was KI-Agenten auf deiner Website tun.", "KI-Referrals, verifizierte Crawler-Abrufe, MCP- und WebMCP-Tool-Aufrufe, Agenten-Conversions. Ein Script-Tag, keine Cookies.");
}
