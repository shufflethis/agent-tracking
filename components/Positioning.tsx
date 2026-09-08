import Link from "next/link";
import { faqSchema, homeContent } from "@/lib/home-content";
import { CHECK_ORIGIN, GITHUB_URL, SITE_ORIGIN } from "@/lib/site";
import type { DashLang } from "@/lib/tracking/copy";

/**
 * The positioning sections of the landing page: definition, layers, the
 * comparison, the European angle, the concrete value and the FAQ. Server
 * rendered from lib/home-content.ts, no script; the FAQ is <details> so it
 * reads without JavaScript and is in the HTML for anything that crawls it.
 */
function Cards({ rows, cols = 3 }: { rows: { k: string; t: string; d: string }[]; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cols === 2 ? "grid2" : cols === 4 ? "grid4" : "grid3"} style={{ marginTop: 22, gap: 18 }}>
      {rows.map((r) => (
        <div className="card" style={{ padding: 22 }} key={r.k}>
          <p className="smallcaps" style={{ marginBottom: 6 }}>{r.k}</p>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{r.t}</h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.d}</p>
        </div>
      ))}
    </div>
  );
}

const MCP_CONFIG = `{
  "mcpServers": {
    "agent-tracking": {
      "url": "${SITE_ORIGIN}/api/mcp",
      "headers": { "Authorization": "Bearer wmt_your_token" }
    }
  }
}`;

export default function Positioning({ lang, part = "top" }: { lang: DashLang; part?: "top" | "faq" }) {
  const c = homeContent(lang);
  const docs = lang === "de" ? "/de/docs" : "/docs";
  const mark = (v: string) => {
    const yes = v === "yes" || v === "ja" || v.startsWith("yes,") || v.startsWith("ja,");
    const no = v === "no" || v === "nein";
    return <span style={{ color: yes ? "var(--cyan)" : no ? "var(--muted)" : "var(--ink-2)", fontWeight: yes ? 600 : 400 }}>{v}</span>;
  };
  if (part === "faq") {
    return (
      <section className="shell section" id="faq">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(c)) }} />
        <h2>{c.faqTitle}</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          {c.faqDek} <Link href={docs}>{lang === "de" ? "Zur Dokumentation" : "Read the documentation"}</Link>.{" "}
          <Link href={lang === "de" ? "/de/guides" : "/guides"}>{lang === "de" ? "Guides mit einer Frage je Seite" : "Guides, one question each"}</Link>.{" "}
          <a href={GITHUB_URL} rel="noopener">
            {lang === "de" ? "Quellcode auf GitHub" : "Source on GitHub"}
          </a>
          .
        </p>
        <div className="faq" style={{ marginTop: 18 }}>
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary>
                <h3>{f.q}</h3>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    );
  }
  return (
    <>
      <section className="shell section" id="what">
        <p className="eyebrow">{c.category}</p>
        <h2>{c.definitionTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch", fontSize: "var(--t-body-lg)", color: "var(--ink)" }}>{c.definition}</p>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.definitionMore}</p>
      </section>

      <section className="shell section" id="not">
        <h2>{c.notTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.notDek}</p>
        <div className="grid3" style={{ marginTop: 22 }}>
          {c.not.map((r) => (
            <div className="card" style={{ padding: 22 }} key={r.k}>
              <p className="smallcaps" style={{ marginBottom: 6 }}>{r.k}</p>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{r.t}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section" id="sees">
        <h2>{c.seesTitle}</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>{c.seesDek}</p>
        <div className="grid3" style={{ marginTop: 22 }}>
          {c.sees.map((r) => (
            <div className="card" style={{ padding: 24 }} key={r.k}>
              <p className="smallcaps" style={{ marginBottom: 6 }}>{r.k}</p>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{r.t}</h3>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.d}</p>
            </div>
          ))}
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps" style={{ marginBottom: 6 }}>Score</p>
            <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {c.seesScore}{" "}
              {CHECK_ORIGIN ? (
                <a href={CHECK_ORIGIN} rel="noopener">
                  webmcp-tool.com
                </a>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <section className="shell section" id="win">
        <h2>{c.fightTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.fightDek}</p>
        <Cards rows={c.fight} cols={4} />
      </section>

      <section className="shell section" id="who">
        <h2>{c.whoTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.whoDek}</p>
        <Cards rows={c.who} cols={4} />
      </section>

      <section className="shell section" id="ask">
        <h2>{c.useTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.useDek}</p>
        <Cards rows={c.use} cols={4} />
        <div className="grid2" style={{ gap: 18, marginTop: 22, alignItems: "start" }}>
          <pre className="code" style={{ margin: 0 }}>{MCP_CONFIG}</pre>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {c.useAsk.map((q) => (
              <li key={q} className="card" style={{ padding: "12px 16px", fontSize: 14.5, color: "var(--ink-2)" }}>
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="shell section" id="why">
        <h2>{c.whyTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.whyDek}</p>
        <div className="tablewrap" style={{ marginTop: 22 }}>
          <table>
            <thead>
              <tr>
                <th>{c.compareHead.feature}</th>
                <th>{c.compareHead.us}</th>
                <th>{c.compareHead.analytics}</th>
                <th>{c.compareHead.cdn}</th>
                <th>{c.compareHead.logs}</th>
                <th>{c.compareHead.saas}</th>
              </tr>
            </thead>
            <tbody>
              {c.compare.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{mark(r.us)}</td>
                  <td>{mark(r.analytics)}</td>
                  <td>{mark(r.cdn)}</td>
                  <td>{mark(r.logs)}</td>
                  <td>{mark(r.saas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 14, fontSize: 14 }}>{c.compareNote}</p>
      </section>

      <section className="shell section" id="europe">
        <h2>{c.euTitle}</h2>
        <p className="dek" style={{ maxWidth: "70ch" }}>{c.euDek}</p>
        <div className="grid2" style={{ gap: 18, marginTop: 22 }}>
          {c.eu.map((r) => (
            <div className="card" style={{ padding: 24 }} key={r.k}>
              <p className="smallcaps" style={{ marginBottom: 6 }}>{r.k}</p>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{r.t}</h3>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="shell section" id="value">
        <h2>{c.valueTitle}</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>{c.valueDek}</p>
        <div className="grid3" style={{ marginTop: 22 }}>
          {c.value.map((r) => (
            <div className="card" style={{ padding: 24 }} key={r.k}>
              <p className="smallcaps" style={{ marginBottom: 6 }}>{r.k}</p>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{r.t}</h3>
              <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{r.d}</p>
            </div>
          ))}
        </div>
      </section>

    </>
  );
}
