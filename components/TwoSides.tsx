import Link from "next/link";

/**
 * The two halves of the product, side by side under the hero: who comes to
 * your site, and what your own agents are doing. Copy is plain and promises
 * only what is built; Codex, Hermes and the bridge between both sides are
 * marked as later.
 */

const COPY = {
  en: {
    heading: "Two sides of agent traffic",
    sites: {
      eyebrow: "Who's coming for you?",
      title: "Agents on your website and tools",
      body: "See which AI assistants and agents visit your site, which tool calls fail and which inquiries your server confirms.",
      cta: "Connect your website",
      href: "/login",
    },
    fleet: {
      eyebrow: "What's your agent doing?",
      title: "Your own agents, while you sleep",
      body: "Claude Code loops, cron jobs and your own agents report start, end and failures. Every morning one short briefing: what ran, what broke, what is stuck. Run status only, never prompts or tool content.",
      note: "Free during the beta. Codex and Hermes come later.",
      cta: "Monitor your agents",
      href: "/login?next=/app/fleet",
      docs: "How it works",
      docsHref: "/docs#agent-monitoring",
    },
  },
  de: {
    heading: "Zwei Seiten von Agent-Traffic",
    sites: {
      eyebrow: "Wer kommt zu dir?",
      title: "Agents auf deiner Website und deinen Tools",
      body: "Sieh, welche KI-Assistenten und Agents deine Site besuchen, welche Tool-Aufrufe scheitern und welche Anfragen dein Server bestätigt.",
      cta: "Website verbinden",
      href: "/login?lang=de",
    },
    fleet: {
      eyebrow: "Was macht dein Agent?",
      title: "Deine eigenen Agents, während du schläfst",
      body: "Claude-Code-Loops, Cron-Jobs und eigene Agents melden Start, Ende und Fehler. Jeden Morgen ein kurzes Briefing: was lief, was kaputtging, was hängt. Nur Status, nie Prompts oder Tool-Inhalte.",
      note: "Kostenlos während der Beta. Codex und Hermes folgen später.",
      cta: "Agents überwachen",
      href: "/login?lang=de&next=/app/fleet",
      docs: "So funktioniert es",
      docsHref: "/de/docs#agent-monitoring",
    },
  },
};

export default function TwoSides({ lang }: { lang: "en" | "de" }) {
  const c = COPY[lang];
  return (
    <section className="shell section" id="two-sides" aria-labelledby="two-sides-heading">
      <h2 id="two-sides-heading" className="sr-only">{c.heading}</h2>
      <div className="grid2" style={{ gap: 18 }}>
        {(["sites", "fleet"] as const).map((key) => {
          const side = c[key];
          return (
            <div key={key} className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>{side.eyebrow}</p>
              <h3 style={{ fontSize: 24, margin: "0 0 10px" }}>{side.title}</h3>
              <p style={{ color: "var(--ink-2)", marginTop: 0 }}>{side.body}</p>
              {"note" in side ? <p className="formnote" style={{ marginTop: 0 }}>{side.note}</p> : null}
              <p style={{ marginTop: "auto", marginBottom: 0, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <Link className="btn" href={side.href}>{side.cta}</Link>
                {"docs" in side ? <Link href={side.docsHref}>{side.docs}</Link> : null}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
