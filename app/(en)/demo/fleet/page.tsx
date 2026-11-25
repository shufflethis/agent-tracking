import type { Metadata } from "next";
import FleetDemo from "@/components/FleetDemo";
import { alternatesFor } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  title: "Live Fleet Demo: AI Agent Guardrails, MCP Drift & Stall Monitoring",
  description:
    "Explore the interactive Agent Tracking dashboard with zero login: inspect blocked runaway loops, shadow MCP drift, silent permission hangs, and session timelines.",
  alternates: alternatesFor("/demo/fleet"),
  robots: { index: true, follow: true },
};

const LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  url: `${SITE_ORIGIN}/demo/fleet`,
  name: "Agent Tracking Live Fleet Demo",
  description: "Interactive sandbox showing local loop circuit breakers, MCP config drift, and zero-prompt session timelines.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const resolved: "en" | "de" = lang === "de" ? "de" : "en";
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
      <section className="shell section" style={{ paddingTop: 52 }}>
        <div className="pagehead" style={{ marginBottom: 24 }}>
          <p className="eyebrow">{resolved === "de" ? "Interaktive Live-Demo" : "Interactive live demo"}</p>
          <h1 style={{ fontSize: "clamp(28px,4.4vw,46px)", marginBottom: 12 }}>
            {resolved === "de" ? "Erlebe Flotten-Monitoring & lokale Schutzbremse" : "See fleet monitoring & local guardrails in action"}
          </h1>
          <p className="dek" style={{ maxWidth: "62ch", margin: 0 }}>
            {resolved === "de"
              ? "Kein Login, keine E-Mail, kein Script auf deinem Rechner nötig. Prüfe echte Fehlerfälle, MCP-Drift und lokale PreToolUse-Blocks direkt im Browser."
              : "No login, no email, no install required. Inspect runaway loop blocks, shadow MCP drift, permission hangs, and zero-prompt session timelines right in your browser."}
          </p>
        </div>
        <FleetDemo lang={resolved} />
      </section>
    </>
  );
}
