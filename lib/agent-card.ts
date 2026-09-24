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
  description: `Read authorized site statistics on ${SITE_HOST}: recognized referrals, crawler claims and verification, browser tool observations and separate server outcome receipts. Requires a read token for a site the account can access.`,
  version: "1.0.0",
  websiteUrl: `${SITE_ORIGIN}/docs#api`,
  remotes: [{ type: "streamable-http", url: `${SITE_ORIGIN}/api/mcp` }],
};

export const AGENT_CARD = {
  protocolVersion: "0.3.0",
  name: SITE_HOST,
  description: `${SITE_NAME}: recognized referrals, crawler evidence, observed browser tools and separate server outcome receipts for an authorized site. Browser attempts do not confirm an agent actor.`,
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
      description: "Daily site summaries: recognized referrals, crawler claims and verification, browser tool outcomes, separate server receipts, pages and distinct-path bursts. Legacy browser goal signals remain unconfirmed.",
      tags: ["agent-tracking", "analytics", "webmcp", "mcp"],
      examples: ["Which verified crawler fetches did example.com receive this week?", "Which observed WebMCP calls failed most in the last 30 days?"],
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
const domainParam = { name: "domain", in: "path", required: true, description: "A bare-host site owned by or explicitly shared with the caller, for example example.com", schema: { type: "string" } };
const daysParam = { name: "days", in: "query", required: false, description: "Window in days, default 30, capped by the plan's history", schema: { type: "integer", minimum: 1, maximum: 365 } };

export const OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: `${SITE_HOST} Stats API`,
    version: "1.0.0",
    summary: "Evidence-labeled summaries for sites the caller may read.",
    description:
      "Daily counters and separate measurement-status, crawler-verification and server-receipt summaries as JSON. The account read token is created in site settings and can access owned or explicitly shared sites. It does not authorize outcome writes. MCP tool get_agent_stats returns the same site summary. Public stats pages expose only published aggregate fields, never private findings or receipts.",
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
      get: { operationId: "getAgentStats", summary: "Evidence-labeled daily statistics of one authorized site", security: bearer, parameters: [domainParam, daysParam], responses: { "200": { description: "Counters, source status, distinct server receipts, previous period, day series, pages and bursts", content: { "application/json": { schema: { type: "object", required: ["domain", "days", "totals", "agents", "tools", "pages"], properties: { domain: { type: "string" }, days: { type: "integer" }, generatedAt: { type: "string", format: "date-time" }, sourcesVersion: { type: "string" }, verified: { type: "boolean" }, measurementStatus: { type: "object" }, serverOutcomes: { type: "object" }, serverToolCalls: { type: "object" }, totals: { type: "object" }, previous: { type: "object" }, days_series: { type: "array", items: { type: "object" } }, agents: { type: "array", items: { type: "object" } }, tools: { type: "array", items: { type: "object" } }, pages: { type: "array", items: { type: "object" } }, bursts: { type: "array", items: { type: "object" } } } } } } }, "404": { description: "Site not accessible to this account" } } },
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
