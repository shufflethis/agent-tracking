import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

/**
 * Written on purpose rather than inherited. The AI crawlers are named so the
 * decision to let them in is visible; the discovery documents and the two
 * public API paths are allowed explicitly because the rest of /api is not;
 * and the content signals say what the text may be used for.
 */
const RULES = `Allow: /
Allow: /.well-known/
Allow: /openapi.json
Allow: /auth.md
Allow: /api/mcp
Allow: /api/stats
Allow: /api/public-stats/
Disallow: /app
Disallow: /app/
Disallow: /login
Disallow: /api/`;

const BODY = `# ${SITE_HOST}
# We measure what agents do on sites, so this file is written on purpose.

User-agent: Googlebot
User-agent: Bingbot
${RULES}

# AI crawlers and live fetchers, named so the decision is visible.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: Claude-User
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
User-agent: cohere-ai
User-agent: Bytespider
${RULES}

User-agent: *
${RULES}

# What this site's text may be used for, stated rather than implied.
Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

export function GET() {
  return new Response(BODY, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
