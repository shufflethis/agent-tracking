import type { Metadata } from "next";
import MonitoringHome from "@/components/MonitoringHome";
import { alternatesFor } from "@/lib/i18n";
import { AUTHOR, BUILDER, SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

const TITLE = "Agent Tracking: Guardrails, MCP Security & Monitoring for Claude Code, Cursor & Cron";
const DESCRIPTION =
  "Stop runaway agent loops, detect shadow MCP & config drift, and catch stuck or waiting Claude Code, Cursor, Codex, Gemini and cron runs. Local circuit breaker, zero prompts sent, EU-hosted & open source.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: alternatesFor("/"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: {
    title: "Stop runaway agent loops, shadow MCP drift & silent hangs",
    description: DESCRIPTION,
    url: "/",
    type: "website",
    images: [{ url: "/img/agents/guard-architecture.jpg", width: 1200, height: 675, alt: "Agent Tracking local zero-prompt circuit breaker architecture" }],
  },
  twitter: {
    card: "summary_large_image",
    ...(AUTHOR.name && BUILDER.handle ? { creator: `@${BUILDER.handle}` } : {}),
    images: ["/img/agents/guard-architecture.jpg"],
  },
};

const PAGE_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_ORIGIN}/#webpage`,
    url: SITE_ORIGIN,
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "en",
    dateModified: "2026-11-25",
    isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
    about: { "@id": `${SITE_ORIGIN}/#app` },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_ORIGIN}/#software`,
    name: "Agent Tracking",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "macOS, Linux",
    url: SITE_ORIGIN,
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
      <MonitoringHome lang="en" />
    </>
  );
}
