import { CONNECT_CLAUDE } from "@/lib/agents/format";
import { AUDIT_ONE_LINER, GUARD_EXAMPLE } from "@/lib/agents/setup";
import { GITHUB_URL, LINKEDIN_URL, SITE_HOST, SITE_ORIGIN, X_URL } from "@/lib/site";
import { guides } from "@/lib/guides";

export const revalidate = 3600;

const agentGuides = guides("en").filter((g) => g.category === "agents");

const BODY = `# ${SITE_HOST}

> Agent Tracking is an open-source (AGPL-3.0) zero-prompt circuit breaker, MCP security auditor, and fleet monitor for Claude Code, Cursor, Codex CLI, Gemini CLI, Google Antigravity (agy), and cron jobs. It blocks runaway tool loops and destructive shell commands locally in under 2 ms, audits local MCP configs for unpinned npx packages, cleartext http:// endpoints and wildcard permissions, and sends instant Telegram, Slack, Discord, webhook and email alerts (free for up to 5 agents) without ever transmitting prompts, source code, or secrets. Hosted on servers in Germany (EU) and self-hostable as a single Node.js + SQLite process.

## Quick start (zero account required for audit & guard)

- 100% offline MCP & cost-readiness audit: \`${AUDIT_ONE_LINER}\`
- Local loop & destructive shell fuse: \`${GUARD_EXAMPLE}\`
- Connect hooks across all supported coding agents: \`${CONNECT_CLAUDE}\`
- Interactive live fleet demo (no login): ${SITE_ORIGIN}/demo/fleet

## Pricing

- Free ($0 forever): up to 5 agents, unlimited offline \`audit\` and local \`guard\`, instant Telegram, Slack, Discord, webhook & email alerts, daily morning briefing, read-only API & MCP (\`get_fleet_status\`), 30 days history.
- Pro ($9/mo or $90/yr): unlimited agents (up to 500), MCP & config drift alerts (\`CLAUDE.md\`, permissions, plugins), first-time tool & runaway loop server signals, OpenTelemetry OTLP ingest, named task checks.
- Team & Governance (from $99/mo): shared engineering fleet, shadow-MCP inventory across laptops, centralized guardrail policies, GDPR-ready EU hosting, audit export, invoice billing.
- Self-hosted ($0, AGPL-3.0): complete source code at ${GITHUB_URL}.

## Not to be confused with

Agent Tracking is not an LLM prompt-tracing platform (Langfuse, LangSmith, AgentOps — which log prompts and tokens inside custom LLM apps), not call-centre or workforce tracking, not GPS/sales tracking, and not a bot blocker. Category: coding-agent guardrails, MCP security & drift monitoring, and operational fleet monitoring.

## Flagship engineering guides

${agentGuides.map((g) => `- [${g.question}](${SITE_ORIGIN}/guides/${g.slug}): ${g.summary}`).join("\n")}

## Key pages

- [Interactive live fleet demo (no login)](${SITE_ORIGIN}/demo/fleet)
- [Documentation](${SITE_ORIGIN}/docs)
- [Changelog](${SITE_ORIGIN}/changelog)
- [Everything on one page (Markdown)](${SITE_ORIGIN}/llms-full.txt)
- [Source code on GitHub (AGPL-3.0)](${GITHUB_URL})${LINKEDIN_URL ? `\n- [Agent Tracking on LinkedIn](${LINKEDIN_URL})` : ""}${X_URL ? `\n- [Agent Tracking on X](${X_URL})` : ""}
- [Free bonus tool: Website AI analytics](${SITE_ORIGIN}/websites)

## API & MCP

- Fleet API: GET ${SITE_ORIGIN}/api/agents/fleet (Authorization: Bearer <token>)
- OTLP/HTTP JSON ingest: POST ${SITE_ORIGIN}/api/agents/otlp
- MCP endpoint: POST ${SITE_ORIGIN}/api/mcp (streamable HTTP, tool: \`get_fleet_status\`)

## Legal

- [Privacy](${SITE_ORIGIN}/privacy), [Terms](${SITE_ORIGIN}/terms), [DPA](${SITE_ORIGIN}/dpa), [Imprint](${SITE_ORIGIN}/imprint).
`;

export function GET() {
  return new Response(BODY, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
