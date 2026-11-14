import { GITHUB_URL, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

export function GET() {
  return Response.json(
    {
      name: SITE_NAME,
      origin: SITE_ORIGIN,
      mcp: `${SITE_ORIGIN}/api/mcp`,
      documentation: `${SITE_ORIGIN}/docs`,
      source: GITHUB_URL,
      tools: [
        {
          name: "get_site_overview",
          description: `What ${SITE_HOST} is (monitoring your own Claude Code sessions, cron jobs and OpenTelemetry agents, plus AI agent analytics for websites) and where its docs, guides, MCP server and API live.`,
          readOnly: true,
        },
        {
          name: "get_public_agent_stats",
          description: "Published 30-day agent statistics of a site whose owner switched its public stats page on.",
          readOnly: true,
        },
      ],
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
