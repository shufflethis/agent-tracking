import Link from "next/link";
import { counterpart, guides, type Guide } from "@/lib/guides";
import { AUTHOR, SITE_ORIGIN } from "@/lib/site";
import type { DashLang } from "@/lib/tracking/copy";

/** One guide: question as h1, summary as the quotable answer, steps, FAQ, related. Article and FAQPage schema in the head. */
export default function GuideView({ lang, guide }: { lang: DashLang; guide: Guide }) {
  const base = lang === "de" ? "/de/guides" : "/guides";
  const other = counterpart(lang, guide.slug);
  const url = `${SITE_ORIGIN}${base}/${guide.slug}`;
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
      datePublished: guide.updated,
      dateModified: guide.updated,
      image: `${SITE_ORIGIN}/og/home.png`,
      author: { "@id": AUTHOR.name ? `${SITE_ORIGIN}/#author` : `${SITE_ORIGIN}/#org` },
      publisher: { "@id": `${SITE_ORIGIN}/#org` },
      isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "de" ? "Start" : "Home", item: `${SITE_ORIGIN}${lang === "de" ? "/de" : "/"}` },
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
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="pagehead" style={{ marginBottom: 30 }}>
        <p className="eyebrow">
          <Link href={base} style={{ color: "inherit" }}>
            {lang === "de" ? "Guides" : "Guides"}
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>{guide.question}</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink)", maxWidth: "64ch", marginTop: 0, marginBottom: 0 }}>{guide.summary}</p>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          {AUTHOR.name ? (
            <>
              {lang === "de" ? "Von" : "By"}{" "}
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
          {lang === "de" ? "Stand" : "Updated"} {guide.updated}
        </p>
        {other ? (
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
            <Link href={`${lang === "de" ? "/guides" : "/de/guides"}/${other.slug}`} hrefLang={lang === "de" ? "en" : "de"}>
              {lang === "de" ? "Read this guide in English" : "Diesen Guide auf Deutsch lesen"}
            </Link>
          </p>
        ) : null}
      </div>
      <div className="prose">
        {guide.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
            {s.code ? <pre className="code">{s.code}</pre> : null}
          </section>
        ))}
        <section>
          <h2>{lang === "de" ? "Kurz gefragt" : "In short"}</h2>
          <div className="faq">
            {guide.faq.map((f) => (
              <details key={f.q}>
                <summary>
                  <h3>{f.q}</h3>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: "0 0 10px", fontSize: 15, color: "var(--ink-2)" }}>{lang === "de" ? "Weiterlesen" : "Read next"}</p>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          {related.map((g) => (
            <Link key={g.slug} href={`${base}/${g.slug}`}>
              {g.question}
            </Link>
          ))}
          <Link href="/login" style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
            {lang === "de" ? "Pilotphase starten →" : "Start the free pilot →"}
          </Link>
        </p>
      </div>
    </article>
  );
}
