import { DM_Mono, Jost, Open_Sans } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { AUTHOR, CHECK_ORIGIN, GITHUB_URL, LEGAL, LEGAL_ADDRESS_SCHEMA, PLAUSIBLE_SCRIPT, SITE_HOST, SITE_NAME, SITE_ORIGIN, VERIFY } from "@/lib/site";
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

const OG_IMAGE = `${SITE_ORIGIN}/og/home.png`;
const LOGO = `${SITE_ORIGIN}/icons/icon-512.png`;

const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#org`,
      name: LEGAL.name,
      legalName: LEGAL.name,
      url: LEGAL.website,
      email: LEGAL.email,
      address: LEGAL_ADDRESS_SCHEMA,
      logo: { "@type": "ImageObject", url: LOGO, width: 512, height: 512 },
      image: OG_IMAGE,
      sameAs: [GITHUB_URL, ...(CHECK_ORIGIN ? [CHECK_ORIGIN] : [])],
      ...(AUTHOR.name ? { founder: { "@id": `${SITE_ORIGIN}/#author` } } : {}),
    },
    ...(AUTHOR.name
      ? [
          {
            "@type": "Person",
            "@id": `${SITE_ORIGIN}/#author`,
            name: AUTHOR.name,
            ...(AUTHOR.url ? { url: AUTHOR.url } : {}),
            ...(AUTHOR.sameAs.length ? { sameAs: AUTHOR.sameAs } : {}),
            worksFor: { "@id": `${SITE_ORIGIN}/#org` },
          },
        ]
      : []),
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#site`,
      url: SITE_ORIGIN,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      inLanguage: ["en", "de"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#app`,
      name: SITE_NAME,
      description: "Measures what AI agents do on a website: AI referrals, verified crawler fetches, MCP and WebMCP tool calls and agent conversions. One script tag, no cookies, no personal data.",
      url: SITE_ORIGIN,
      image: OG_IMAGE,
      alternateName: ["AI agent analytics for websites", "agent traffic analytics", "agenttracking.co"],
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Web analytics for AI agents",
      disambiguatingDescription:
        "Website analytics for AI agents (ChatGPT, Claude, Perplexity, crawlers, MCP and WebMCP clients) visiting a site. Not LLM observability or tracing of agents a developer builds, not call-centre or field-workforce tracking, not parcel tracking. Unrelated to the similarly named Agent Track (agenttrack.io, real-estate CRM), AgencyTrack (agencytrack.app, insurance agency management) and AgenTrak (employee monitoring).",
      keywords: "AI agent analytics, AI bot traffic, ChatGPT referrals, GPTBot, ClaudeBot, MCP analytics, WebMCP, agent conversions, GDPR analytics",
      operatingSystem: "Web",
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      isAccessibleForFree: true,
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      sameAs: [GITHUB_URL],
      inLanguage: ["en", "de"],
    },
  ],
};


/**
 * This site's own WebMCP tools, registered from an inline script so they are
 * in the served HTML and run after agent.js has wrapped registerTool (deferred
 * scripts execute before DOMContentLoaded). Both are read-only: one orients an
 * agent, one reads the public stats endpoint. They register only where the
 * browser or a polyfill provides modelContext.
 */
const WEBMCP_TOOLS = `addEventListener("DOMContentLoaded",function(){var mc=document.modelContext||navigator.modelContext;if(!mc||typeof mc.registerTool!=="function")return;
var text=function(v){return{content:[{type:"text",text:typeof v==="string"?v:JSON.stringify(v,null,2)}]}};
var origin=${JSON.stringify(SITE_ORIGIN)};
mc.registerTool({name:"get_site_overview",description:"What ${SITE_HOST} is (AI agent analytics for websites) and where its documentation, guides, demo, public stats, MCP server and API live. Read-only. Call this first to orient.",inputSchema:{type:"object",properties:{},required:[]},annotations:{readOnlyHint:true},execute:async function(){return text({name:"Agent Tracking",category:"AI agent analytics for websites",what:"Measures which AI assistants send visitors to a site, which crawlers read its pages (verified against vendor IP ranges), which MCP and WebMCP tools agents call and whether they reach a goal. One script tag, no cookies, no personal data. Open source, AGPL-3.0.",docs:origin+"/docs",guides:origin+"/guides",demo:origin+"/demo",publicStats:origin+"/stats/${SITE_HOST}",mcp:origin+"/api/mcp",openapi:origin+"/openapi.json",llms:origin+"/llms-full.txt",source:${JSON.stringify(GITHUB_URL)}})}});
mc.registerTool({name:"get_public_agent_stats",description:"Published 30-day agent statistics of a site whose owner switched its public stats page on: totals, agents with verification, busiest pages. Defaults to this site. Read-only; returns 404 for sites without a public page.",inputSchema:{type:"object",properties:{domain:{type:"string",description:"Bare host of the tracked site, for example ${SITE_HOST}"}},required:[]},annotations:{readOnlyHint:true},execute:async function(args,ctx){var d=(args&&args.domain)||${JSON.stringify(SITE_HOST)};var r=await fetch("/api/public-stats/"+encodeURIComponent(d),{signal:ctx&&ctx.signal});return text(await r.json())}});
});`;

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
        {VERIFY.bing ? <meta name="msvalidate.01" content={VERIFY.bing} /> : null}
        {VERIFY.google ? <meta name="google-site-verification" content={VERIFY.google} /> : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
        {PLAUSIBLE_SCRIPT ? (
          <>
            {/* Privacy-friendly analytics by Plausible. The queue shim lets the init run before the script arrives; the script itself is appended after the load event so it never competes with the largest paint. */}
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();" +
                  `addEventListener("load",function(){var s=document.createElement("script");s.async=true;s.src=${JSON.stringify(PLAUSIBLE_SCRIPT)};document.head.appendChild(s)})`,
              }}
            />
          </>
        ) : null}
      </head>
      <body>
        <SiteChrome locale={locale}>{children}</SiteChrome>
        {process.env.SELF_TRACK !== "0" ? <script defer data-domain={SITE_HOST} data-demo="" src={`${SITE_ORIGIN}/agent.js`} /> : null}
        <script dangerouslySetInnerHTML={{ __html: WEBMCP_TOOLS }} />
      </body>
    </html>
  );
}
