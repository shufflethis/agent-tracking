import Link from "next/link";
import CopyBlock from "@/components/CopyBlock";
import { ENTRIES, PLANNED } from "@/lib/changelog";

/** The changelog page body, EN and DE. Every entry ends with how to use it. */

const TAG = {
  en: { agents: "Your agents", websites: "Websites", platform: "Platform" },
  de: { agents: "Deine Agents", websites: "Websites", platform: "Plattform" },
};

export default function Changelog({ lang }: { lang: "en" | "de" }) {
  const de = lang === "de";
  const L = (p: string) => (de ? `/de${p}` : p);
  const date = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(de ? "de-DE" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <section className="shell pagehead" style={{ paddingTop: 64, paddingBottom: 8 }}>
        <p className="eyebrow">Changelog</p>
        <h1 style={{ fontSize: "clamp(30px,4.6vw,50px)", lineHeight: 1.08, marginBottom: 16 }}>{de ? "Was neu ist, und wie du es nutzt" : "What's new, and how to use it"}</h1>
        <p className="dek" style={{ maxWidth: "60ch" }}>
          {de
            ? "Jeder Eintrag endet mit einem Befehl fürs Terminal oder einem Prompt, den du in Claude Code einfügst. Kopieren, einfügen, fertig."
            : "Every entry ends with a command for your terminal or a prompt to paste into Claude Code. Copy, paste, done."}
        </p>
      </section>

      <section className="shell section" id="next" style={{ paddingTop: 24 }}>
        <h2>{de ? "Als Nächstes" : "Next up"}</h2>
        <p className="dek">{de ? "Geplant, noch nicht gebaut. Ohne Termin, bis es läuft." : "Planned, not built yet. No date until it works."}</p>
        <div className="grid3" style={{ gap: 18, marginTop: 18 }}>
          {PLANNED.map((p) => (
            <article key={p.title.en} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <p className="smallcaps">{de ? "Geplant" : "Planned"}</p>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>{p.title[lang]}</h3>
              <p style={{ color: "var(--ink-2)", marginTop: 0 }}>{p.body[lang]}</p>
              <p style={{ fontSize: 14.5, color: "var(--ink-2)" }}>{p.today[lang]}</p>
              {p.command ? <div style={{ marginTop: "auto" }}><CopyBlock label="Terminal" text={p.command} lang={lang} /></div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="shell section" id="entries">
        <h2 className="sr-only">{de ? "Einträge" : "Entries"}</h2>
        <ol className="changelog">
          {ENTRIES.map((e) => {
            const id = `${e.date}-${e.title.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`;
            return (
              <li key={id} id={id} className="changelog-entry">
                <p className="smallcaps" style={{ marginBottom: 6 }}>
                  <time dateTime={e.date}>{date(e.date)}</time> · {TAG[lang][e.tag]}
                </p>
                <h2 style={{ fontSize: "clamp(21px,2.6vw,26px)", marginTop: 0 }}><a href={`#${id}`} style={{ color: "inherit", borderBottom: 0 }}>{e.title[lang]}</a></h2>
                <p style={{ color: "var(--ink-2)" }}>{e.body[lang]}</p>
                {e.points ? <ul>{e.points[lang].map((p) => <li key={p}>{p}</li>)}</ul> : null}
                {e.how && (e.how.terminal || e.how.claude || e.how.note) ? (
                  <div style={{ marginTop: 18 }}>
                    <h3 style={{ fontSize: 17, marginBottom: 12 }}>{de ? "So nutzt du es" : "How to use it"}</h3>
                    <div className={e.how.terminal && e.how.claude ? "grid2" : undefined} style={{ gap: 18 }}>
                      {e.how.terminal ? <CopyBlock label={de ? "Ins Terminal einfügen" : "Paste into your terminal"} text={e.how.terminal} lang={lang} /> : null}
                      {e.how.claude ? <CopyBlock label={de ? "Oder in Claude Code einfügen" : "Or paste into Claude Code"} text={e.how.claude[lang]} lang={lang} /> : null}
                    </div>
                    {e.how.note ? <p className="formnote">{e.how.note[lang]}</p> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        <p>
          <Link href={`${L("/docs")}#agent-monitoring`}>{de ? "Vollständige Anleitung in der Doku" : "Full instructions in the docs"} →</Link>
        </p>
      </section>
    </>
  );
}
