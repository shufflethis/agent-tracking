import Image from "next/image";
import Link from "next/link";
import GuideDiagram from "@/components/GuideDiagram";
import WorkflowLinks from "./WorkflowLinks";
import { counterpart, guides, type Guide } from "@/lib/guides";
import { AUTHOR, SITE_ORIGIN } from "@/lib/site";
import type { DashLang } from "@/lib/tracking/copy";

/** Inline formatting for markdown links, bold, and inline code inside editorial guide paragraphs. */
function richText(value: string) {
  const parts = value.split(/(\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)$/.exec(part);
    if (link) {
      return link[2].startsWith("/")
        ? <Link key={i} href={link[2]}>{link[1]}</Link>
        : <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    }
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const code = /^`([^`]+)`$/.exec(part);
    if (code) return <code key={i}>{code[1]}</code>;
    return part;
  });
}

/** One guide: question as h1, summary as the quotable answer, hero visual, diagrams, tables, callouts, FAQ, sources, related. */
export default function GuideView({ lang, guide }: { lang: DashLang; guide: Guide }) {
  const de = lang === "de";
  const base = de ? "/de/guides" : "/guides";
  const other = counterpart(lang, guide.slug);
  const url = `${SITE_ORIGIN}${base}/${guide.slug}`;
  const isAgentGuide = guide.category === "agents";
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: guide.title,
      alternativeHeadline: guide.question,
      description: guide.summary,
      inLanguage: lang,
      url,
      datePublished: guide.published ?? guide.updated,
      dateModified: guide.updated,
      image: guide.heroImage ? `${SITE_ORIGIN}${guide.heroImage.src}` : `${SITE_ORIGIN}/img/agents/guard-architecture.jpg`,
      author: { "@id": AUTHOR.name ? `${SITE_ORIGIN}/#author` : `${SITE_ORIGIN}/#org` },
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: de ? "Start" : "Home", item: `${SITE_ORIGIN}${de ? "/de" : "/"}` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_ORIGIN}${base}` },
        { "@type": "ListItem", position: 3, name: guide.question, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ q: guide.question, a: guide.summary }, ...guide.faq].map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
  const related = guide.related.map((s) => guides(lang).find((g) => g.slug === s)).filter((g): g is Guide => Boolean(g));
  const demoHref = de ? "/de/demo/fleet" : "/demo/fleet";

  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav aria-label={de ? "Brotkrumennavigation" : "Breadcrumb"} style={{ fontSize: 13, marginBottom: 20 }}>
        <Link href={de ? "/de" : "/"}>{de ? "Start" : "Home"}</Link> / <Link href={base}>Guides</Link>
      </nav>
      <div className="pagehead" style={{ marginBottom: 30 }}>
        <p className="eyebrow">
          <Link href={base} style={{ color: "inherit" }}>
            {isAgentGuide ? (de ? "Agent Guardrails & Monitoring · Guide" : "Agent Guardrails & Monitoring · Guide") : "Guides"}
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>{guide.question}</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink)", maxWidth: "64ch", marginTop: 0, marginBottom: 0 }}>{guide.summary}</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          {AUTHOR.name ? (
            <>
              {de ? "Von" : "By"}{" "}
              {AUTHOR.url ? (
                <a href={AUTHOR.url} rel="author">
                  {AUTHOR.name}
                </a>
              ) : (
                AUTHOR.name
              )}
              {" · "}
            </>
          ) : null}
          {de ? "Stand" : "Updated"} {guide.updated}
        </p>
        {other ? (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
            <Link href={`${de ? "/guides" : "/de/guides"}/${other.slug}`} hrefLang={de ? "en" : "de"}>
              {de ? "Read this guide in English" : "Diesen Guide auf Deutsch lesen"}
            </Link>
          </p>
        ) : null}
      </div>

      {guide.heroImage ? (
        <figure className="gimg" style={{ maxWidth: "var(--measure)" }}>
          <Image src={guide.heroImage.src} alt={guide.heroImage.alt} width={1160} height={652} unoptimized />
          <figcaption>{guide.heroImage.caption}</figcaption>
        </figure>
      ) : null}

      <nav aria-label={de ? "Inhaltsverzeichnis" : "On this page"}>
        <ul>
          {guide.sections.map((section, i) => (
            <li key={section.h}><a href={`#step-${i + 1}`}>{section.h}</a></li>
          ))}
        </ul>
      </nav>

      <div className="prose">
        {guide.sections.map((s, i) => (
          <section key={s.h} id={`step-${i + 1}`}>
            <h2>{s.h}</h2>
            {s.p.map((p) => (
              <p key={p.slice(0, 48)}>{richText(p)}</p>
            ))}
            {s.diagram ? <GuideDiagram kind={s.diagram} lang={lang} /> : null}
            {s.table ? (
              <div className="tablewrap gtable">
                <table>
                  <thead>
                    <tr>{s.table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{ci === 0 ? <strong>{richText(cell)}</strong> : richText(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {s.callout ? (
              <div className="callout mid gcallout">
                <span className="tag">{s.callout.tag}</span>
                <p style={{ margin: 0 }}>{richText(s.callout.text)}</p>
              </div>
            ) : null}
            {s.code ? <pre className="code">{s.code}</pre> : null}
          </section>
        ))}

        <section>
          <h2>{de ? "Häufige Fragen" : "Frequently asked questions"}</h2>
          <div className="faq">
            {guide.faq.map((f) => (
              <details key={f.q}>
                <summary>
                  <h3>{f.q}</h3>
                </summary>
                <p>{richText(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        {guide.sources?.length ? (
          <section className="gsources">
            <h2>{de ? "Primärquellen & weiterführende Dokumentation" : "Primary sources & documentation"}</h2>
            <ul>
              {guide.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">{src.label} ↗</a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {!isAgentGuide ? <WorkflowLinks lang={lang} current={`${base}/${guide.slug}`} /> : null}

      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 15, color: "var(--ink-2)" }}>{de ? "Weiterlesen & direkt testen" : "Read next & try live"}</p>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          {related.map((g) => (
            <Link key={g.slug} href={`${base}/${g.slug}`}>
              {g.question}
            </Link>
          ))}
          {isAgentGuide ? (
            <>
              <Link href={demoHref} style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
                {de ? "Interaktive Live-Demo (ohne Login) →" : "Try interactive fleet demo (no login) →"}
              </Link>
              <Link href={de ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet"} style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
                {de ? "Kostenlos starten (inkl. Telegram/Slack) →" : "Start free (incl. Telegram/Slack) →"}
              </Link>
            </>
          ) : (
            <Link href={de ? "/login?lang=de" : "/login"} style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
              {de ? "Kostenloses Website-Tool starten →" : "Start the free website tool →"}
            </Link>
          )}
        </p>
      </div>
    </article>
  );
}
