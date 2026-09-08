import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";

/**
 * How a machine client authenticates, stated in one place. There is no OAuth
 * server: the API is a bearer-protected resource whose tokens a site owner
 * creates in the dashboard. RFC 9728 lets a resource say exactly that.
 */
export const AUTH_MD = `# Authentication for machine clients on ${SITE_HOST}

Every account-bound endpoint (the stats API, the CSV export, the log import and the MCP server) takes one bearer token per account.

## How to get a token

1. Sign in at ${SITE_ORIGIN}/login (magic link by email, no password).
2. Open a site's settings page and press "Create token". The token starts with \`wmt_\` and is shown once; only its hash is stored.
3. The token reads every site on the account. Creating a new one revokes the old one.

## How to send it

\`\`\`
Authorization: Bearer wmt_your_token
\`\`\`

- Stats API: GET ${SITE_ORIGIN}/api/stats and GET ${SITE_ORIGIN}/api/stats/{domain}?days=30
- CSV export: GET ${SITE_ORIGIN}/api/export/{domain}
- Log import: POST ${SITE_ORIGIN}/api/logs/{domain}
- MCP server: POST ${SITE_ORIGIN}/api/mcp (streamable HTTP); a client that cannot set headers may pass the token as the \`token\` argument of the get_agent_stats tool.

## What needs no token

- The ingest at POST ${SITE_ORIGIN}/api/event: the snippet posts for a registered domain and is checked by Origin, not by a secret.
- Published stats: GET ${SITE_ORIGIN}/api/public-stats/{domain} for sites whose owner switched the public page on.
- Every document under ${SITE_ORIGIN}/.well-known/ and ${SITE_ORIGIN}/openapi.json.

## Scope and limits

Tokens are read-only except for the log import, which only adds counters to the caller's own site. Requests are rate limited per address. There is no OAuth flow and no way to obtain a token without a human signing in; ${SITE_ORIGIN}/.well-known/oauth-protected-resource describes the resource in RFC 9728 terms.

Source: ${SITE_ORIGIN}/docs#api
`;

/** RFC 9728 protected resource metadata. No authorization_servers: tokens are issued in the dashboard, not by an OAuth server. */
export const PROTECTED_RESOURCE = {
  resource: `${SITE_ORIGIN}/api`,
  resource_name: `${SITE_HOST} Stats API and MCP server`,
  bearer_methods_supported: ["header"],
  resource_documentation: `${SITE_ORIGIN}/auth.md`,
  resource_policy_uri: `${SITE_ORIGIN}/terms`,
  scopes_supported: ["stats:read", "logs:write"],
};
