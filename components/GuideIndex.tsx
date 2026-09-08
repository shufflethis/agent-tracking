import Link from "next/link";
import { guides } from "@/lib/guides";
import type { DashLang } from "@/lib/tracking/copy";

export default function GuideIndex({ lang }: { lang: DashLang }) {
  const base = lang === "de" ? "/de/guides" : "/guides";
  return (
    <section className="shell section" style={{ paddingTop: 56 }}>
      <div className="pagehead" style={{ marginBottom: 30 }}>
        <p className="eyebrow">Guides</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>{lang === "de" ? "Fragen, die Agenten-Analytics beantwortet" : "Questions agent analytics answers"}</h1>
        <p className="dek" style={{ maxWidth: "62ch", margin: 0 }}>
          {lang === "de"
            ? "Jeder Guide beantwortet eine Frage, so wie man sie in ein Suchfeld tippt oder einem Assistenten stellt: erst die Antwort in einem Absatz, dann die Schritte."
            : "Each guide answers one question the way people type it into a search box or ask an assistant: the answer in one paragraph first, then the steps."}
        </p>
      </div>
      <div className="grid2" style={{ gap: 18 }}>
        {guides(lang).map((g) => (
          <Link key={g.slug} href={`${base}/${g.slug}`} className="card" style={{ padding: 24, display: "block" }}>
            <h2 style={{ fontSize: 19, marginBottom: 8 }}>{g.question}</h2>
            <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{g.summary.length > 220 ? g.summary.slice(0, 217).replace(/\s+\S*$/, "") + "…" : g.summary}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
