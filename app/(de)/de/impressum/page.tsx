import Link from "next/link";
import { alternatesForLocale } from "@/lib/i18n";
import { LEGAL, SITE_HOST } from "@/lib/site";

export const metadata = {
  title: "Impressum",
  description: `Wer ${SITE_HOST} betreibt: Rechtsträger, Anschrift und Kontakt.`,
  alternates: alternatesForLocale("/imprint", "de"),
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="legal-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function Page() {
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Rechtliches</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Impressum</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "54ch", marginTop: 0, marginBottom: 0 }}>
          Wer {SITE_HOST} betreibt und wie man uns erreicht. Die <Link href="/imprint">englische Fassung</Link> ist maßgeblich; diese Seite ist eine Übersetzung.
        </p>
      </div>

      <dl className="legal">
        <Row label="Betreiber">
          <b>{LEGAL.name}</b>
          <br />
          {LEGAL.form}
        </Row>
        <Row label="Anschrift">
          {LEGAL.addressLines.map((l) => (
            <span key={l}>
              {l}
              <br />
            </span>
          ))}
        </Row>
        <Row label="Kontakt">
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
          <br />
          <a href={LEGAL.website} rel="noopener">
            {LEGAL.website.replace(/^https?:\/\//, "")}
          </a>
        </Row>
        {LEGAL.euRepresentative ? <Row label="Vertreter in der EU (Art. 27 DSGVO)">{LEGAL.euRepresentative}</Row> : null}
        <Row label="Hosting">
          Der Dienst läuft auf einem Server in {LEGAL.hostingCountry === "Germany" ? "Deutschland" : LEGAL.hostingCountry}, bereitgestellt von {LEGAL.hostingProvider}. Einzelheiten
          stehen in der <Link href="/de/datenschutz">Datenschutzerklärung</Link> und im <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link>.
        </Row>
        <Row label="Software">
          Agent Tracking ist freie Software unter der GNU Affero General Public License v3.0. Der Quellcode, diese Seite eingeschlossen, ist öffentlich. Die Lizenz schließt
          Gewährleistung für die Software aus; für den gehosteten Dienst gelten die <Link href="/de/agb">AGB</Link>.
        </Row>
      </dl>

      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          <Link href="/de/datenschutz">Datenschutz</Link>
          <Link href="/de/agb">AGB</Link>
          <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link>
        </p>
      </div>
    </article>
  );
}
