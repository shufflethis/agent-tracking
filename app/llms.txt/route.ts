import { GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { guides } from "@/lib/guides";

export const revalidate = 3600;

const BODY = `# ${SITE_HOST}

> Agent Tracking shows what AI agents are doing, on two sides. Your own agents: Claude Code sessions, cron jobs and OpenTelemetry traces on one list, with stuck, missing and failed runs, session timelines, a morning briefing and alerts; no prompts or tool output are sent. Agents on your website: recognized assistant referrals, supported browser WebMCP observations, optional origin-log crawler evidence and site-server outcome receipts; the snippet sets no cookies. Open source (AGPL-3.0), hosted in Germany, self-hostable.

Connect a machine: \`npx --yes https://agenttracking.co/downloads/agenttracking-0.3.0.tgz connect claude\`

## Not to be confused with

The name is shared with other things. Agent Tracking is not an LLM tracing platform for prompts, spans and token cost (AgentOps, LangSmith, Langfuse), not call-centre or support-agent workforce tracking, not field-sales or GPS tracking, not parcel or air-waybill tracking, and not a bot blocker. It is also unrelated to the similarly named Agent Track (agenttrack.io, a CRM for real-estate agents), AgencyTrack (agencytrack.app, insurance agency management), AgenTrak (employee monitoring) and agent-KPI automation services. Category: agent monitoring for your own agents, and AI agent analytics for websites. agenttracking.co is operated by FINAL MASTER LLC and the software is open source at ${GITHUB_URL}.

## Read first

- [Everything on one page](${SITE_ORIGIN}/llms-full.txt): what it does, what it sees, how it differs from analytics and bot managers, plans, API, FAQ, as Markdown.

- [How it works and how to install it](${SITE_ORIGIN}/docs): agent monitoring setup, the snippet, verification, the four views, the stats API and the MCP tool.
- [Changelog](${SITE_ORIGIN}/changelog): what is new, with a copy-paste command or Claude Code prompt for each change.
- [AI agents on your website](${SITE_ORIGIN}/websites): the website analytics side.
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
