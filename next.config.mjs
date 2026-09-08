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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
