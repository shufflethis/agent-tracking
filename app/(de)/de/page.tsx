import type { Metadata } from "next";
import MonitoringHome from "@/components/MonitoringHome";
import { alternatesForLocale } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

// Eine Stunde gecacht, danach aus der Umgebung des laufenden Servers neu gerendert.
export const revalidate = 3600;

const TITLE = "Agent Tracking: Claude Code, Cron-Jobs und eigene KI-Agents überwachen";
const DESCRIPTION =
  "Sieh, welcher Agent-Lauf hängt, fehlt oder gescheitert ist. Claude-Code-Sessions, Cron-Jobs und OpenTelemetry-Traces in einer Liste, mit Morgen-Briefing und Meldungen. Open Source, keine Prompts.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: alternatesForLocale("/", "de"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: { title: "Was macht dein Agent gerade?", description: DESCRIPTION, url: "/de", type: "website" },
  twitter: { card: "summary_large_image" },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_ORIGIN}/de#webpage`,
  url: `${SITE_ORIGIN}/de`,
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: "de",
  dateModified: "2026-11-03",
  isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
  about: { "@id": `${SITE_ORIGIN}/#app` },
};

/** Deutsche Startseite: eigene Agents überwachen. Website-Analytics liegen unter /de/websites. */
export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }} />
      <MonitoringHome lang="de" />
    </>
  );
}
