import { homeContent } from "@/lib/home-content";
import { GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { snippetFor } from "@/lib/tracking/snippet";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { SOURCES_VERSION } from "@/lib/tracking/classify";

export const revalidate = 3600;

/** The whole positioning and the essentials of the docs as one Markdown file, for agents that read rather than browse. */
export function GET() {
  const c = homeContent("en");
  const rows = (r: { k: string; t: string; d: string }[]) => r.map((x) => `- **${x.k}: ${x.t}.** ${x.d}`).join("\n");
  const table = [
    `| | ${c.compareHead.us} | ${c.compareHead.analytics} | ${c.compareHead.cdn} | ${c.compareHead.logs} | ${c.compareHead.saas} |`,
    "| --- | --- | --- | --- | --- | --- |",
    ...c.compare.map((r) => `| ${r.label} | ${r.us} | ${r.analytics} | ${r.cdn} | ${r.logs} | ${r.saas} |`),
  ].join("\n");
  const body = `# Agent Tracking (${SITE_HOST})

Category: ${c.category}.

> ${c.definition}

${c.definitionMore}

## ${c.notTitle}

${c.notDek}

${rows(c.not)}

${c.notNamesTitle}: ${c.notNames.map((n) => `${n.name}, ${n.what}`).join("; ")}.

Site: ${SITE_ORIGIN} · Docs: ${SITE_ORIGIN}/docs · Demo: ${SITE_ORIGIN}/demo · Source: ${GITHUB_URL} (AGPL-3.0) · German: ${SITE_ORIGIN}/de

## ${c.seesTitle}

${rows(c.sees)}

${c.seesScore}

## ${c.fightTitle}

${c.fightDek}

${rows(c.fight)}

## ${c.whoTitle}

${rows(c.who)}

## ${c.useTitle}

${c.useDek}

${rows(c.use)}

Example questions an agent can answer with get_agent_stats: ${c.useAsk.map((q) => `"${q}"`).join(" ")}

## ${c.whyTitle}

${c.whyDek}

${table}

${c.compareNote}

## ${c.euTitle}

${rows(c.eu)}

## ${c.valueTitle}

${rows(c.value)}

## Installation

Sign in by email at ${SITE_ORIGIN}/login, add the domain, put this on every page, press verify:

\`\`\`html
${snippetFor("example.com")}
\`\`\`

Supported browser WebMCP tools registered through navigator.modelContext or document.modelContext can be observed by the snippet. Declarative forms with a toolname attribute yield attempts; data-agent-goal marks a browser goal attempt, not a completed sale. Crawlers that do not run JavaScript require an origin server log: upload on the settings page or POST ${SITE_ORIGIN}/api/logs/{domain} with the API token (nginx or Apache combined format, plain or gzipped). Only supported, successful HTML requests with a fresh matching published IP range enter the verified fetch count.

## What is recorded, and what is not

Recorded: redacted page path without query string; recognized referrer host or source token, never a full referrer URL; tool name, duration, technical outcome and safe error class; a daily salted session hash based on domain, coarse browser class and address (raw address not stored). Browser observations do not prove an agent actor. The event schema excludes cookies, tool argument values, form values and full user-agent strings. Raw events are deleted after ${RAW_RETENTION_DAYS} days; daily totals stay while the site exists. Removing a site deletes its records. The hashed session estimate and deployment context still warrant privacy review. Source list version: ${SOURCES_VERSION}.

## Server outcomes and task tests

POST ${SITE_ORIGIN}/api/outcomes/{domain} with a site-bound outcome write credential only after your backend creates an inquiry or booking. Stable receipt IDs make retries idempotent. A separate site-bound credential reports remote MCP invocations at /api/server-tools/{domain}; browser and server sources may overlap. A browser ID alone never confirms an agent actor. Site owners can run deterministic synthetic Chrome inquiry checks on test/staging hosts. Model-driven provider tests remain not configured without an adapter. Protected site reports link findings, fixes and real retests; public stats do not expose them.

## Public stats and private workspace

An owner may publish /stats/{domain}. It shows selected 30-day aggregates, a chart and short source/page lists. Legacy user-agent fetch counts remain unverified claims; a verified fetch requires a supported, fresh published range and origin-log evidence. The public link does not expose internal source diagnostics, server receipts, task runs, findings, corrections or client reports. Those require the site owner's account or an explicit site-scoped reader grant. See ${SITE_ORIGIN}/docs#private-workflow and the open-source documentation at ${GITHUB_URL}/blob/main/docs/agency-workflow.md.

## Plans

${Object.values(PLANS)
  .map((p) => `- ${p.name}: ${p.domains === Infinity ? "unlimited" : p.domains} site(s), ${p.eventsPerMonth.toLocaleString("en-US")} agent events a month, ${p.windowDays} days of history${p.manifestAlerts ? ", manifest alerts" : ""}${p.whiteLabelBadge ? ", white-label badge" : ""}`)
  .join("\n")}

Free during the pilot; paid plans open with 30 days' notice. Self-hosting is free (Docker compose, one SQLite file).

## Stats API and MCP

- GET ${SITE_ORIGIN}/api/stats/{domain}?days=30 with Authorization: Bearer <token> returns totals, previous period, day series, agents, tools, pages, bursts as JSON.
- GET ${SITE_ORIGIN}/api/stats lists the token's sites; GET ${SITE_ORIGIN}/api/export/{domain} returns CSV.
- MCP: POST ${SITE_ORIGIN}/api/mcp (streamable HTTP), tool get_agent_stats(domain, days, token).

## ${c.faqTitle}

${c.faq.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Legal

Privacy ${SITE_ORIGIN}/privacy · Terms ${SITE_ORIGIN}/terms · Data processing agreement ${SITE_ORIGIN}/dpa · Imprint ${SITE_ORIGIN}/imprint
`;
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
