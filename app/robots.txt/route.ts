import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";

export const dynamic = "force-dynamic";

const BODY = `# ${SITE_HOST}
# We measure what agents do on sites, so this file is written on purpose.

User-agent: *
Allow: /
Disallow: /app/
Disallow: /login
Disallow: /api/

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

export function GET() {
  return new Response(BODY, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
