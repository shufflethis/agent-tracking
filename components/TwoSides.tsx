import Link from "next/link";
import Image from "next/image";

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
      eyebrow: "From our conversation with Boardy",
      title: "Your own agents, now in view",
      body: "Claude Code sessions, cron jobs and your own agents: follow runs, tool activity and failures. Get a morning briefing and alerts when something needs your attention.",
      postAlt: 'Boardy (@boardyai), replying to @Wuebbe on October 31, 2026: “now point it at their own agents”. Screenshot of the original X post.',
      postLink: "Read the conversation on X ↗",
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
      eyebrow: "Aus unserem Austausch mit Boardy",
      title: "Jetzt auch deine eigenen Agents im Blick",
      body: "Claude-Code-Sessions, Cron-Jobs und eigene Agents: Verfolge Läufe, Tool-Aktivität und Fehler. Mit Morgen-Briefing und Meldungen, wenn etwas deine Aufmerksamkeit braucht.",
      postAlt: 'Boardy (@boardyai), als Antwort an @Wuebbe am 31. Oktober 2026: „now point it at their own agents“. Screenshot des Originalposts auf X.',
      postLink: "Zum Gespräch auf X ↗",
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
              {"postAlt" in side ? (
                <figure style={{ margin: "4px 0 22px" }}>
                  <a href="https://x.com/boardyai/status/2116435532163195363" target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                    <Image src="/images/boardy-own-agents.png" width={1100} height={498} alt={side.postAlt} unoptimized style={{ display: "block", width: "100%", height: "auto", borderRadius: 12 }} />
                    <span style={{ display: "block", fontSize: 13, marginTop: 8 }}>{side.postLink}</span>
                  </a>
                </figure>
              ) : null}
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
