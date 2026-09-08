import { GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { guides } from "@/lib/guides";

export const dynamic = "force-dynamic";

const BODY = `# ${SITE_HOST}

> Agent Tracking is analytics for AI agents on a website: it records which AI assistants send visitors, which AI crawlers and live fetchers read pages (verified against vendor IP ranges), which MCP and WebMCP tools an agent calls inside the browser, and whether the agent reaches a goal. One script tag, no cookies, no personal data. Open source (AGPL-3.0), hosted in Germany, self-hostable.

## Not to be confused with

The name is shared with other things. Agent Tracking is not LLM observability or tracing for agents a developer builds (AgentOps, LangSmith, Langfuse), not call-centre or support-agent workforce tracking, not field-sales or GPS tracking, not parcel or air-waybill tracking, and not a bot blocker. Category: AI agent analytics for websites, measuring agents other people run when they visit a site.

## Read first

- [Everything on one page](${SITE_ORIGIN}/llms-full.txt): what it does, what it sees, how it differs from analytics and bot managers, plans, API, FAQ, as Markdown.

- [How it works and how to install it](${SITE_ORIGIN}/docs): the snippet, verification, the four views, the stats API and the MCP tool.
- [Demo page](${SITE_ORIGIN}/demo): two WebMCP tools you can call and watch appear in a dashboard.
- [Source code](${GITHUB_URL}): the whole product, including the ingest, the dashboard and the cron jobs.

## Guides, one question each

${guides("en").map((g) => `- [${g.question}](${SITE_ORIGIN}/guides/${g.slug}): ${g.summary}`).join("\n")}

## For agents with an API token

- Stats API: GET ${SITE_ORIGIN}/api/stats/{domain}?days=30 with Authorization: Bearer <token>.
- MCP endpoint: POST ${SITE_ORIGIN}/api/mcp (streamable HTTP, one tool: get_agent_stats).

## Legal

- [Privacy](${SITE_ORIGIN}/privacy), [Terms](${SITE_ORIGIN}/terms), [Data processing agreement](${SITE_ORIGIN}/dpa), [Imprint](${SITE_ORIGIN}/imprint).
`;

export function GET() {
  return new Response(BODY, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
