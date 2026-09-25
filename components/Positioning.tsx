import Link from "next/link";
import { faqSchema, homeContent, type Row } from "@/lib/home-content";
import type { DashLang } from "@/lib/tracking/copy";

function Cards({ rows }: { rows: Row[] }) {
  return <div className={rows.length === 4 ? "grid4" : "grid3"} style={{ marginTop: 22, gap: 18 }}>
    {rows.map(r => <article className="card" style={{ padding: 24 }} key={r.k}>
      <p className="smallcaps">{r.k}</p><h3 style={{ fontSize: 19 }}>{r.t}</h3><p style={{ color: "var(--ink-2)", marginBottom: 0 }}>{r.d}</p>
    </article>)}
  </div>;
}

export default function Positioning({ lang, part = "top" }: { lang: DashLang; part?: "top" | "faq" }) {
  const c = homeContent(lang), de = lang === "de", docs = de ? "/de/docs" : "/docs";
  if (part === "faq") return <section className="shell section centered" id="faq">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(c)) }} />
    <h2>{c.faqTitle}</h2><p className="dek">{c.faqDek}</p>
    <div className="faq" style={{ marginTop: 18 }}>{c.faq.map(f => <details key={f.q}><summary><h3>{f.q}</h3></summary><p>{f.a}</p></details>)}</div>
    <p><Link href={docs}>{de ? "Einrichtung und Messgrenzen nachlesen" : "Read setup instructions and measurement limits"} →</Link></p>
  </section>;
  return <>
    <section className="shell section centered" id="what"><p className="eyebrow">{c.category}</p><h2>{c.definitionTitle}</h2><p className="dek">{c.definition}</p></section>
    <section className="shell section centered" id="value"><h2>{c.valueTitle}</h2><p className="dek">{c.valueDek}</p><Cards rows={c.value} /></section>
    <section className="shell section centered" id="workflow"><h2>{c.fightTitle}</h2><p className="dek">{c.fightDek}</p><Cards rows={c.fight} />
      <p className="formnote" style={{ marginTop: 20 }}>{de ? "Der aktuelle Nachtest prüft einen vorbereiteten Formularablauf im Browser. Er misst weder selbstständige KI-Aufgabenerfüllung noch Umsatzwirkung." : "The current retest checks a prepared browser form flow. It does not measure independent AI task completion or revenue impact."}</p>
      <p><Link href={de ? "/de/guides/ki-anfrageablauf-testen-und-korrekturen-belegen" : "/guides/test-ai-inquiry-flows-and-verify-fixes"}>{de ? "Anfrageablauf testen und Korrekturen belegen" : "How to test inquiry flows and verify fixes"} →</Link></p>
    </section>
    <section className="shell section centered" id="who"><h2>{c.whoTitle}</h2><p className="dek">{c.whoDek}</p><Cards rows={c.who} /></section>
    <section className="shell section centered" id="setup"><h2>{de ? "Starte mit dem Signal, das du brauchst." : "Start with the signal you need."}</h2>
      <div className="grid3" style={{ marginTop: 22, gap: 18 }}>
        <article className="card" style={{ padding: 24 }}><h3>{de ? "Besucher aus KI-Assistenten" : "Visitors from AI assistants"}</h3><p>{de ? "Installiere das Snippet für erkennbare Referrals und unterstützte Tool-Aktivität im Browser." : "Install the snippet for recognized referrals and supported browser tool activity."}</p><Link href={de ? "/de/guides/chatgpt-referral-traffic-sehen" : "/guides/see-chatgpt-referral-traffic"}>{de ? "ChatGPT-Traffic zuordnen" : "Attribute ChatGPT traffic"} →</Link></article>
        <article className="card" style={{ padding: 24 }}><h3>{de ? "Crawler-Zugriffe" : "Crawler access"}</h3><p>{de ? "Verbinde Serverlogs, um Zugriffsversuche und bestätigte HTML-Abrufe getrennt auszuwerten." : "Connect origin logs to inspect access attempts and confirmed HTML fetches separately."}</p><Link href={de ? "/de/guides/welche-ki-crawler-lesen-meine-seiten" : "/guides/which-ai-crawlers-read-my-pages"}>{de ? "Crawler-Zugriffe prüfen" : "Check crawler access"} →</Link></article>
        <article className="card" style={{ padding: 24 }}><h3>{de ? "Abgeschlossene Anfragen" : "Completed inquiries"}</h3><p>{de ? "Ergänze Serverbelege für erfolgreich angelegte Anfragen oder Buchungen." : "Add server receipts for successfully created inquiries or bookings."}</p><Link href={`${docs}#server-outcomes`}>{de ? "Serverbestätigung einrichten" : "Set up server confirmation"} →</Link></article>
      </div>
      <p style={{ marginTop: 22 }}><Link href={de ? "/de/guides/geo-aeo-messung-playbook" : "/guides/geo-aeo-measurement-playbook"}>{de ? "Das GEO-/AEO-Playbook: vom Signal zur überprüften Änderung" : "The GEO/AEO playbook: from a signal to a checked change"} →</Link></p>
    </section>
  </>;
}
