import { GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

const BODY = `# ${SITE_HOST}

> Agent Tracking measures what AI agents do on a website: which assistants send visitors, which crawlers fetch pages, which WebMCP tools are called and whether they finish. One line of script, no cookies, no personal data. Open source (AGPL-3.0), hosted in Germany, self-hostable.

## Read first

- [How it works and how to install it](${SITE_ORIGIN}/docs): the snippet, verification, the four views, the stats API and the MCP tool.
- [Demo page](${SITE_ORIGIN}/demo): two WebMCP tools you can call and watch appear in a dashboard.
- [Source code](${GITHUB_URL}): the whole product, including the ingest, the dashboard and the cron jobs.

## For agents with an API token

- Stats API: GET ${SITE_ORIGIN}/api/stats/{domain}?days=30 with Authorization: Bearer <token>.
- MCP endpoint: POST ${SITE_ORIGIN}/api/mcp (streamable HTTP, one tool: get_agent_stats).

## Legal

- [Privacy](${SITE_ORIGIN}/privacy), [Terms](${SITE_ORIGIN}/terms), [Data processing agreement](${SITE_ORIGIN}/dpa), [Imprint](${SITE_ORIGIN}/imprint).
`;

export function GET() {
  return new Response(BODY, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
