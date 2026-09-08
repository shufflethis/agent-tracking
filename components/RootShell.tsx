import { DM_Mono, Jost, Open_Sans } from "next/font/google";
import SiteChrome from "@/components/SiteChrome";
import { HTML_LANG, type Locale } from "@/lib/i18n";
import { LEGAL, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
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
      url: SITE_ORIGIN,
      applicationCategory: "BusinessApplication",
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
 * No third-party script anywhere: the only tag in the body is this site's own
 * agent.js, the same line a customer pastes. It is a plain tag rather than
 * next/script so it is in the served HTML, which is what verification reads.
 * data-demo because /demo needs window.__wmtSimulate.
 */
export default function RootShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <html lang={HTML_LANG[locale]} className={`${jost.variable} ${openSans.variable} ${dmMono.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
      </head>
      <body>
        <SiteChrome locale={locale}>{children}</SiteChrome>
        {process.env.SELF_TRACK !== "0" ? <script defer data-domain={SITE_HOST} data-demo="" src={`${SITE_ORIGIN}/agent.js`} /> : null}
      </body>
    </html>
  );
}
