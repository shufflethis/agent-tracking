import Link from "next/link";
import { alternatesFor } from "@/lib/i18n";
import { LEGAL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Imprint",
  description: `Who operates ${SITE_HOST}: the legal entity, its address and how to reach it.`,
  alternates: alternatesFor("/imprint"),
};

/**
 * Provider identification. The entity comes from the environment (lib/site.ts)
 * because the page is a legal statement about whoever runs this installation:
 * the cloud prints its operator, a self-hosted copy must print its own.
 */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="legal-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function Page() {
  const LD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#legal-entity`,
    name: LEGAL.name,
    legalName: LEGAL.name,
    url: LEGAL.website,
    email: LEGAL.email,
    address: { "@type": "PostalAddress", streetAddress: LEGAL.addressLines[0], addressLocality: LEGAL.addressLines[1], addressCountry: LEGAL.addressLines[2] },
  };
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Imprint</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "54ch", marginTop: 0, marginBottom: 0 }}>
          Who operates {SITE_HOST} and how to reach them. The <Link href="/de/impressum">German version</Link> is a translation; this page is the authoritative one.
        </p>
      </div>

      <dl className="legal">
        <Row label="Operator">
          <b>{LEGAL.name}</b>
          <br />
          {LEGAL.form}
        </Row>
        <Row label="Registered address">
          {LEGAL.addressLines.map((l) => (
            <span key={l}>
              {l}
              <br />
            </span>
          ))}
        </Row>
        <Row label="Contact">
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
          <br />
          <a href={LEGAL.website} rel="noopener">
            {LEGAL.website.replace(/^https?:\/\//, "")}
          </a>
        </Row>
        {LEGAL.euRepresentative ? <Row label="Representative in the EU (Art. 27 GDPR)">{LEGAL.euRepresentative}</Row> : null}
        <Row label="Hosting">
          The service runs on a server in {LEGAL.hostingCountry}, provided by {LEGAL.hostingProvider}. Details are in the <Link href="/privacy">privacy notice</Link> and the{" "}
          <Link href="/dpa">data processing agreement</Link>.
        </Row>
        <Row label="Software">
          Agent Tracking is free software under the GNU Affero General Public License v3.0. The source, including this page, is public. The licence disclaims warranty for the
          software; the <Link href="/terms">terms</Link> govern the hosted service.
        </Row>
      </dl>

      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/dpa">Data processing agreement</Link>
        </p>
      </div>
    </article>
  );
}
