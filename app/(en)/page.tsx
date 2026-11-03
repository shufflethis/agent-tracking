import type { Metadata } from "next";
import MonitoringHome from "@/components/MonitoringHome";
import { alternatesFor } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

// Cached for an hour and re-rendered from the running server's environment after that.
export const revalidate = 3600;

const TITLE = "Agent Tracking: monitor Claude Code, cron jobs and your own AI agents";
const DESCRIPTION =
  "See which agent run is stuck, missing or failed. Claude Code sessions, cron jobs and OpenTelemetry traces on one list, with a morning briefing and alerts. Open source, no prompts sent.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: alternatesFor("/"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: { title: "What's your agent doing right now?", description: DESCRIPTION, url: "/", type: "website" },
  twitter: { card: "summary_large_image" },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_ORIGIN}/#webpage`,
  url: SITE_ORIGIN,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: "en",
  dateModified: "2026-11-03",
  isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
  about: { "@id": `${SITE_ORIGIN}/#app` },
};

/** The home page: monitoring your own agents. Website analytics live at /websites. */
export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }} />
      <MonitoringHome lang="en" />
    </>
  );
}
