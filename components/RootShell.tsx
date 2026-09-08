import { DM_Mono, Jost, Open_Sans } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { LEGAL, PLAUSIBLE_SCRIPT, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import "@/app/globals.css";

/*
 * Fonts are fetched at build time and served from this origin. A <link> to
 * fonts.googleapis.com would send every visitor's address to Google on every
 * page view, a transfer we would then have to disclose. Self-hosting removes
 * it rather than documenting it.
 */
const jost = Jost({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["300", "400", "600", "700"], variable: "--font-body", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#org`,
      name: LEGAL.name,
      url: LEGAL.website,
      email: LEGAL.email,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#app`,
      name: SITE_NAME,
      description: "Measures what AI agents do on a website: AI referrals, verified crawler fetches, MCP and WebMCP tool calls and agent conversions. One script tag, no cookies, no personal data.",
      url: SITE_ORIGIN,
      alternateName: ["AI agent analytics for websites", "agent traffic analytics", "agenttracking.co"],
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Web analytics for AI agents",
      disambiguatingDescription:
        "Website analytics for AI agents (ChatGPT, Claude, Perplexity, crawlers, MCP and WebMCP clients) visiting a site. Not LLM observability or tracing of agents a developer builds, not call-centre or field-workforce tracking, not parcel tracking.",
      keywords: "AI agent analytics, AI bot traffic, ChatGPT referrals, GPTBot, ClaudeBot, MCP analytics, WebMCP, agent conversions, GDPR analytics",
      operatingSystem: "Web",
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      inLanguage: ["en", "de"],
    },
  ],
};

/**
 * The document shell, shared by both locales' root layouts. Each locale tree
 * has its own root layout so <html lang> is right for a screen reader.
 *
 * The only tag in the body is this site's own agent.js, the same line a
 * customer pastes. The head may carry a Plausible page-view script when the
 * installation sets PLAUSIBLE_SCRIPT: cookieless, no identifiers, and it
 * counts this site's visitors, never a customer's. It is a plain tag rather than
 * next/script so it is in the served HTML, which is what verification reads.
 * data-demo because /demo needs window.__wmtSimulate.
 */
export default function RootShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG[locale]} className={`${jost.variable} ${openSans.variable} ${dmMono.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
        {PLAUSIBLE_SCRIPT ? (
          <>
            {/* Privacy-friendly analytics by Plausible. The queue shim lets the inline init run before the async script arrives. */}
            <script async src={PLAUSIBLE_SCRIPT} />
            <script
              dangerouslySetInnerHTML={{
                __html: "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()",
              }}
            />
          </>
        ) : null}
      </head>
      <body>
        <SiteChrome locale={locale}>{children}</SiteChrome>
        {process.env.SELF_TRACK !== "0" ? <script defer data-domain={SITE_HOST} data-demo="" src={`${SITE_ORIGIN}/agent.js`} /> : null}
      </body>
    </html>
  );
}
