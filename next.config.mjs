/**
 * Content-Security-Policy. Next.js hydrates through inline scripts, so 'unsafe-inline' stays
 * for script-src; every other source is this origin plus the optional Plausible host from the
 * environment. Stripe Checkout is a full-page redirect and needs no frame.
 */
const plausibleHost = (process.env.PLAUSIBLE_SCRIPT ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const plausibleOrigin = plausibleHost ? `https://${plausibleHost}` : "";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${plausibleOrigin}`.trim(),
  `connect-src 'self' ${plausibleOrigin}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const markdownAccept = [{ type: "header", key: "accept", value: ".*text/markdown.*" }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // Content negotiation in beforeFiles routes directly inside Next.js without
    // constructing an external self-proxy URL behind nginx X-Forwarded-Proto.
    return {
      beforeFiles: [
        { source: "/", destination: "/api/md/home", has: markdownAccept },
        { source: "/de", destination: "/api/md/de", has: markdownAccept },
        { source: "/websites", destination: "/api/md/websites", has: markdownAccept },
        { source: "/de/websites", destination: "/api/md/de/websites", has: markdownAccept },
        { source: "/docs", destination: "/api/md/docs", has: markdownAccept },
        { source: "/de/docs", destination: "/api/md/de/docs", has: markdownAccept },
        { source: "/changelog", destination: "/api/md/changelog", has: markdownAccept },
        { source: "/de/changelog", destination: "/api/md/de/changelog", has: markdownAccept },
        { source: "/guides", destination: "/api/md/guides", has: markdownAccept },
        { source: "/de/guides", destination: "/api/md/de/guides", has: markdownAccept },
        { source: "/guides/:slug*", destination: "/api/md/guides/:slug*", has: markdownAccept },
        { source: "/de/guides/:slug*", destination: "/api/md/de/guides/:slug*", has: markdownAccept },
      ],
    };
  },
  async headers() {
    return [
      {
        // The snippet sits on strangers' pages: cacheable for a day, revalidated
        // in the background, fetchable from anywhere.
        source: "/agent.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Content-Security-Policy", value: CSP },
          { key: "Vary", value: "Accept" },
          // Where the machine-readable descriptions are, for clients that read headers before bodies.
          {
            key: "Link",
            value: '</.well-known/mcp.json>; rel="service-desc"; type="application/json", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </llms.txt>; rel="alternate"; type="text/markdown"',
          },
        ],
      },
    ];
  },
};
export default nextConfig;
