import type { Metadata } from "next";
import MonitoringHome from "@/components/MonitoringHome";
import { alternatesForLocale } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

const TITLE = "Agent Tracking: Guardrails, MCP-Sicherheit & Monitoring für Claude Code, Cursor & Cron";
const DESCRIPTION =
  "Stoppe Endlosschleifen & Token-Burn lokal, erkenne Shadow-MCP- & Config-Drift und überwache Claude Code, Cursor, Codex, Gemini, Antigravity und Cron-Jobs. Zero-Prompt, Server in Deutschland, Open Source.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: alternatesForLocale("/", "de"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: {
    title: "Stoppe Agent-Endlosschleifen, Shadow-MCP-Drift & stumme Hänger",
    description: DESCRIPTION,
    url: "/de",
    type: "website",
    images: [{ url: "/img/agents/guard-architecture.jpg", width: 1200, height: 675, alt: "Agent Tracking lokale Zero-Prompt-Schutzbremse" }],
  },
  twitter: { card: "summary_large_image", images: ["/img/agents/guard-architecture.jpg"] },
};

const PAGE_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_ORIGIN}/de#webpage`,
    url: `${SITE_ORIGIN}/de`,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "de",
    dateModified: "2026-11-25",
    isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
    about: { "@id": `${SITE_ORIGIN}/#app` },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_ORIGIN}/de#software`,
    name: "Agent Tracking",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux",
    url: `${SITE_ORIGIN}/de`,
    description: DESCRIPTION,
    license: "https://www.gnu.org/licenses/agpl-3.0.en.html",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro", price: "9", priceCurrency: "USD" },
      { "@type": "Offer", name: "Team & Governance", price: "99", priceCurrency: "USD" },
    ],
  },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }} />
      <MonitoringHome lang="de" />
    </>
  );
}
