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

Tools registered through navigator.modelContext or document.modelContext are recorded automatically. Declarative tools are forms with a toolname attribute; data-agent-goal on any element marks a conversion. Crawlers that do not run JavaScript are counted from the server log: upload on the settings page or POST ${SITE_ORIGIN}/api/logs/{domain} with the API token (nginx or Apache combined format, plain or gzipped).

## What is recorded, and what is not

Recorded: page path without query string; referrer host and utm_source only when they name an assistant; tool name, duration, success, error class, input key names; a session id (daily random salt + domain + coarse browser class + address, hashed, address not stored); which agent, from list version ${SOURCES_VERSION}. Never: network address, cookies, storage, fingerprints, query strings, input values, full user agent strings. Raw events are deleted after ${RAW_RETENTION_DAYS} days; daily totals stay as long as the site does. Removing a site deletes everything.

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
