import { DM_Mono, Jost, Open_Sans } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { AUTHOR, CHECK_ORIGIN, GITHUB_URL, LEGAL, LEGAL_ADDRESS_SCHEMA, LINKEDIN_URL, PLAUSIBLE_SCRIPT, SITE_HOST, SITE_NAME, SITE_ORIGIN, VERIFY, X_URL } from "@/lib/site";
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

const ORG_SAME_AS = Array.from(
  new Set([
    GITHUB_URL,
    ...(LINKEDIN_URL ? [LINKEDIN_URL] : []),
    ...(X_URL ? [X_URL] : []),
    ...(LEGAL.website && LEGAL.website !== SITE_ORIGIN ? [LEGAL.website] : []),
    ...(CHECK_ORIGIN ? [CHECK_ORIGIN] : []),
  ]),
);

const APP_SAME_AS = Array.from(
  new Set([GITHUB_URL, ...(LINKEDIN_URL ? [LINKEDIN_URL] : []), ...(X_URL ? [X_URL] : [])]),
);

const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#org`,
      name: SITE_NAME,
      legalName: LEGAL.name,
      alternateName: LEGAL.name && LEGAL.name !== SITE_NAME ? [LEGAL.name, SITE_HOST] : [SITE_HOST],
      url: SITE_ORIGIN,
      email: LEGAL.email,
      address: LEGAL_ADDRESS_SCHEMA,
      logo: { "@type": "ImageObject", url: LOGO, width: 512, height: 512 },
      image: OG_IMAGE,
      sameAs: ORG_SAME_AS,
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
      description:
        "Monitor your own Claude Code sessions, cron jobs and OpenTelemetry agents on one fleet list (stuck, missing, failed and looping runs, morning briefings and alerts without sending prompts or tool output), plus cookieless AI referral, crawler and WebMCP analytics for websites.",
      url: SITE_ORIGIN,
      image: OG_IMAGE,
      alternateName: ["Agent monitoring for Claude Code and cron jobs", "AI agent analytics for websites", "agenttracking.co"],
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "AI agent fleet monitoring and website agent analytics",
      disambiguatingDescription:
        "Lightweight operational monitoring for your own AI agents (Claude Code hooks, cron wrappers, local loop circuit breakers, OpenTelemetry run status) and cookieless analytics for external AI agents visiting websites. Never captures prompts, completions or file contents (unlike full prompt-tracing tools such as LangSmith or Langfuse), not call-centre or field-workforce tracking, not parcel tracking. Unrelated to Agent Track (agenttrack.io), AgencyTrack (agencytrack.app) and AgenTrak.",
      keywords: "Claude Code monitoring, AI agent monitoring, cron job monitoring, agent loop guard, OpenTelemetry agents, AI agent analytics, WebMCP, MCP server",
      operatingSystem: "macOS, Linux, Web",
      license: "https://www.gnu.org/licenses/agpl-3.0.html",
      isAccessibleForFree: true,
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", description: "Up to 5 monitored agents, morning briefing and email alerts; website pilot included." },
        { "@type": "Offer", name: "Pro", price: "9", priceCurrency: "USD", description: "Up to 50 monitored agents, Slack/Discord/Telegram/webhook alerts, OpenTelemetry traces, loop/drift signals and task checks ($9/month or $90/year)." },
      ],
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      sameAs: APP_SAME_AS,
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
const WEBMCP_TOOLS = `addEventListener("DOMContentLoaded",function(){var mc=navigator.modelContext||document.modelContext;if(!mc||typeof mc.registerTool!=="function")return;
var text=function(v){return{content:[{type:"text",text:typeof v==="string"?v:JSON.stringify(v,null,2)}]}};
var origin=${JSON.stringify(SITE_ORIGIN)};
mc.registerTool({name:"get_site_overview",description:"What ${SITE_HOST} is (monitoring your own Claude Code sessions, cron jobs and OpenTelemetry agents, plus AI agent analytics for websites) and where its documentation, guides, demo, public stats, MCP server and API live. Read-only. Call this first to orient.",inputSchema:{type:"object",properties:{},required:[]},annotations:{readOnlyHint:true},execute:async function(){return text({name:"Agent Tracking",category:"Developer agent fleet monitoring and AI agent analytics for websites",ownAgents:"Monitors Claude Code sessions, cron jobs and OpenTelemetry traces on one list: stuck, missing, failed and looping runs, local PreToolUse loop guard, morning briefing in your time zone and alerts (email, Slack, Discord, Telegram, webhook). Sends no prompts, tool input/output or file contents.",websites:"Records recognized assistant referrals, supported browser WebMCP actions, optional verified origin-log crawlers and server outcome receipts without cookies.",mcpTools:["get_fleet_status","get_agent_stats"],docs:origin+"/docs",websitesPage:origin+"/websites",guides:origin+"/guides",demo:origin+"/demo",publicStats:origin+"/stats/${SITE_HOST}",mcp:origin+"/api/mcp",openapi:origin+"/openapi.json",llms:origin+"/llms-full.txt",source:${JSON.stringify(GITHUB_URL)}})}});
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
                  // Never on signed-in pages: their paths carry customer domains and agent ids.
                  `/^\\/app(\\/|$)/.test(location.pathname)||addEventListener("load",function(){var s=document.createElement("script");s.async=true;s.src=${JSON.stringify(PLAUSIBLE_SCRIPT)};document.head.appendChild(s)})`,
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
