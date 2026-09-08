import { genericImage, OG_SIZE } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Agent Tracking: see what AI agents do on your website";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericImage("See what AI agents do on your website.", "AI referrals, verified crawler fetches, MCP and WebMCP tool calls, agent conversions. One script tag, no cookies.");
}
