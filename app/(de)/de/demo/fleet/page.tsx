import type { Metadata } from "next";
import FleetDemo from "@/components/FleetDemo";
import { alternatesForLocale } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live-Flotten-Demo: KI-Agent-Guardrails, MCP-Drift & Monitoring",
  description:
    "Teste das interaktive Agent-Tracking-Dashboard ohne Login: blockierte Endlosschleifen, Shadow-MCP-Drift, hängende Sessions und Zero-Prompt-Timelines live im Browser.",
  alternates: alternatesForLocale("/demo/fleet", "de"),
  robots: { index: true, follow: true },
};

const LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  url: `${SITE_ORIGIN}/de/demo/fleet`,
  name: "Agent Tracking Live-Flotten-Demo",
  inLanguage: "de",
  description: "Interaktive Sandbox für lokale Loop-Schutzbremsen, MCP-Config-Drift und Zero-Prompt-Session-Timelines.",
};

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
      <section className="shell section" style={{ paddingTop: 52 }}>
        <div className="pagehead" style={{ marginBottom: 24 }}>
          <p className="eyebrow">Interaktive Live-Demo</p>
          <h1 style={{ fontSize: "clamp(28px,4.4vw,46px)", marginBottom: 12 }}>
            Erlebe Flotten-Monitoring &amp; lokale Schutzbremse live
          </h1>
          <p className="dek" style={{ maxWidth: "62ch", margin: 0 }}>
            Kein Login, keine E-Mail, kein Script auf deinem Rechner nötig. Prüfe blockierte Endlosschleifen, Shadow-MCP-Drift, Wartezustände und Zero-Prompt-Timelines direkt im Browser.
          </p>
        </div>
        <FleetDemo lang="de" />
      </section>
    </>
  );
}
