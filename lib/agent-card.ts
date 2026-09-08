import { CONTACT_EMAIL, LEGAL, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

/**
 * The documents other agents read to find out what this installation is and
 * what it can do: an MCP server card, an A2A agent card, an RFC 9727 API
 * catalogue and an OpenAPI description. All four describe the one thing
 * the server actually offers, the stats of a tracked site to its owner,
 * and nothing that does not exist.
 */

export const MCP_CARD = {
  $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  name: `${SITE_HOST.split(".").reverse().join(".")}/agent-tracking`,
  description: `Read the AI agent statistics of a site tracked on ${SITE_HOST}: AI referrals, verified crawler fetches, MCP and WebMCP tool calls and agent conversions as daily totals. Needs the site owner's API token.`,
  version: "1.0.0",
  websiteUrl: `${SITE_ORIGIN}/docs#api`,
  remotes: [{ type: "streamable-http", url: `${SITE_ORIGIN}/api/mcp` }],
};

export const AGENT_CARD = {
  protocolVersion: "0.3.0",
  name: SITE_HOST,
  description: `${SITE_NAME}: AI agent analytics for websites. Returns, for a site the caller owns, which AI assistants sent visitors, which crawlers read pages, which MCP and WebMCP tools were called and whether agents reached a goal.`,
  version: "1.0.0",
  url: `${SITE_ORIGIN}/api/mcp`,
  preferredTransport: "JSONRPC",
  provider: { organization: LEGAL.name, url: LEGAL.website },
  documentationUrl: `${SITE_ORIGIN}/docs#api`,
  capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
  defaultInputModes: ["text/plain", "application/json"],
  defaultOutputModes: ["text/plain", "application/json"],
  securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "API token from the site's settings page" } },
  security: [{ bearer: [] }],
  skills: [
    {
      id: "get_agent_stats",
      name: "Get a site's agent statistics",
      description: "Daily totals for the last N days: AI referrals per assistant, AI fetches per crawler with verification, tool calls with success rate and duration, busiest pages, fetch bursts and conversions.",
      tags: ["agent-tracking", "analytics", "webmcp", "mcp"],
      examples: ["Which agents read example.com this week?", "Which of our WebMCP tools failed most in the last 30 days?"],
    },
  ],
};

export const API_CATALOG = {
  linkset: [
    {
      anchor: `${SITE_ORIGIN}/api/stats`,
      "service-desc": [{ href: `${SITE_ORIGIN}/openapi.json`, type: "application/vnd.oai.openapi+json" }],
      "service-doc": [{ href: `${SITE_ORIGIN}/docs#api`, type: "text/html" }],
    },
    {
      anchor: `${SITE_ORIGIN}/api/mcp`,
      "service-desc": [{ href: `${SITE_ORIGIN}/.well-known/mcp.json`, type: "application/json" }],
      "service-doc": [{ href: `${SITE_ORIGIN}/docs#api`, type: "text/html" }],
    },
  ],
};

const bearer = [{ bearerAuth: [] }];
const domainParam = { name: "domain", in: "path", required: true, description: "A site registered on the caller's account, bare host, for example example.com", schema: { type: "string" } };
const daysParam = { name: "days", in: "query", required: false, description: "Window in days, default 30, capped by the plan's history", schema: { type: "integer", minimum: 1, maximum: 365 } };

export const OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: `${SITE_HOST} Stats API`,
    version: "1.0.0",
    summary: "The numbers of a tracked site, for its owner's own scripts and agents.",
    description:
      "Every number the dashboard shows, as JSON. One token per account, created on a site's settings page, read-only, daily totals only. The same data is available through the MCP server at /api/mcp (tool get_agent_stats). Public stats pages a site owner has published are readable without a token at /api/public-stats/{domain}.",
    license: { name: "AGPL-3.0-only", identifier: "AGPL-3.0-only" },
    contact: { name: SITE_NAME, url: `${SITE_ORIGIN}/docs#api`, email: CONTACT_EMAIL },
  },
  servers: [{ url: SITE_ORIGIN }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "API token (wmt_...) from the site's settings page; see /auth.md" } } },
  paths: {
    "/api/stats": {
      get: { operationId: "listSites", summary: "The sites this token can read", security: bearer, responses: { "200": { description: "Plan, history window and the sites with their stats URLs", content: { "application/json": { schema: { type: "object", properties: { plan: { type: "string" }, maxDays: { type: "integer" }, sites: { type: "array", items: { type: "object", properties: { domain: { type: "string" }, verified: { type: "boolean" }, stats: { type: "string", format: "uri" } } } } } } } } }, "401": { description: "No or invalid token" } } },
    },
    "/api/stats/{domain}": {
      get: { operationId: "getAgentStats", summary: "Daily agent statistics of one site", security: bearer, parameters: [domainParam, daysParam], responses: { "200": { description: "Totals, previous period, day series, agents, tools, pages and bursts", content: { "application/json": { schema: { type: "object", required: ["domain", "days", "totals", "agents", "tools", "pages"], properties: { domain: { type: "string" }, days: { type: "integer" }, generatedAt: { type: "string", format: "date-time" }, sourcesVersion: { type: "string" }, verified: { type: "boolean" }, totals: { type: "object" }, previous: { type: "object" }, days_series: { type: "array", items: { type: "object" } }, agents: { type: "array", items: { type: "object" } }, tools: { type: "array", items: { type: "object" } }, pages: { type: "array", items: { type: "object" } }, bursts: { type: "array", items: { type: "object" } } } } } } }, "404": { description: "Not a site on this account" } } },
    },
    "/api/public-stats/{domain}": {
      get: { operationId: "getPublicStats", summary: "Published 30-day totals of a site whose owner switched the public stats page on", parameters: [domainParam], responses: { "200": { description: "Totals, agents and pages, 30 days", content: { "application/json": { schema: { type: "object", properties: { domain: { type: "string" }, days: { type: "integer" }, totals: { type: "object" }, agents: { type: "array", items: { type: "object" } }, pages: { type: "array", items: { type: "object" } }, page: { type: "string", format: "uri" } } } } } }, "404": { description: "No public stats page for that site" } } },
    },
    "/api/export/{domain}": {
      get: { operationId: "exportCsv", summary: "Daily counters as CSV", security: bearer, parameters: [domainParam], responses: { "200": { description: "day,kind,name,count,errors,ms_total", content: { "text/csv": { schema: { type: "string" } } } } } },
    },
    "/api/logs/{domain}": {
      post: { operationId: "importServerLog", summary: "Import a server access log (nginx or Apache combined, plain or gzip)", security: bearer, parameters: [domainParam], requestBody: { required: true, content: { "text/plain": { schema: { type: "string" } }, "application/gzip": { schema: { type: "string", format: "binary" } } } }, responses: { "200": { description: "Lines scanned, agent fetches, unverified lines and bursts" } } },
    },
    "/api/mcp": {
      post: { operationId: "mcp", summary: "MCP server (streamable HTTP, JSON-RPC 2.0) with the tool get_agent_stats", security: bearer, requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "JSON-RPC response" } } },
    },
  },
};
