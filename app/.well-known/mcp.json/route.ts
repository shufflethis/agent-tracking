import { MCP_CARD } from "@/lib/agent-card";

export const revalidate = 3600;

export function GET() {
  return Response.json(MCP_CARD, { headers: { "cache-control": "public, max-age=3600" } });
}
