import type { Metadata } from "next";
import Link from "next/link";
import HeroArt from "@/components/HeroArt";
import Positioning from "@/components/Positioning";
import { heroFor } from "@/lib/hero";
import { alternatesForLocale } from "@/lib/i18n";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import { CHECK_ORIGIN, CONTACT_EMAIL, GITHUB_URL, LEGAL, SITE_ORIGIN } from "@/lib/site";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Agent Tracking: KI-Agenten-Analytics für deine Website" },
  description:
    "Sieh, welche KI-Assistenten Besucher schicken, welche Crawler deine Seiten lesen, welche MCP- und WebMCP-Tools Agenten aufrufen und ob sie ans Ziel kommen. Ein Script-Tag, keine Cookies.",
  alternates: alternatesForLocale("/", "de"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: { title: "Agent Tracking: sieh, was KI-Agenten auf deiner Website tun", description: "KI-Referrals, verifizierte Crawler-Abrufe, MCP- und WebMCP-Tool-Aufrufe, Agenten-Conversions. Ein Script-Tag, keine Cookies. Open Source, Hosting in Deutschland.", url: "/de", type: "website" },
  twitter: { card: "summary_large_image" },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_ORIGIN}/de#webpage`,
  url: `${SITE_ORIGIN}/de`,
  name: "Agent Tracking: KI-Agenten-Analytics für deine Website",
  description: "Sieh, welche KI-Assistenten Besucher schicken, welche Crawler deine Seiten lesen, welche MCP- und WebMCP-Tools Agenten aufrufen und ob sie ans Ziel kommen.",
  inLanguage: "de",
  dateModified: LEGAL.revised,
  isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
  about: { "@id": `${SITE_ORIGIN}/#app` },
};

const SELF_HOST = `git clone ${GITHUB_URL}.git && cd agent-tracking
cp .env.example .env && docker compose up -d`;

/** Deutsche Startseite. Das Dashboard übersetzt sich über die Kontosprache. */

const free = PLANS.free;

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }} />
      <section className="shell pagehead withart" style={{ paddingTop: 64, paddingBottom: 20 }}>
        <HeroArt name={heroFor("home")!} />
        <p className="eyebrow">Open Source · kostenlose Pilotphase</p>
        <h1 style={{ fontSize: "clamp(30px,5.2vw,58px)", lineHeight: 1.05, maxWidth: "18ch", marginBottom: 20 }}>
          Miss die Agenten auf deiner Site.
        </h1>
        <p style={{ fontSize: "clamp(17px,2.1vw,22px)", lineHeight: 1.55, color: "var(--ink)", maxWidth: "52ch", marginTop: 0, marginBottom: 14 }}>
          Agent Tracking ist KI-Agenten-Analytics für Websites: Es erfasst, welche KI-Assistenten Besucher schicken, welche KI-Crawler deine Seiten lesen, welche MCP- und WebMCP-Tools ein Agent aufruft und ob der Agent ein Ziel erreicht.
        </p>
        <p style={{ fontSize: "clamp(15px,1.6vw,18px)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "52ch", marginTop: 0, marginBottom: 28 }}>
          Deine Analytics zählt Menschen. Sie sieht nicht den Besucher, den ChatGPT geschickt hat, die Seite, die
          ClaudeBot abgerufen hat, oder das WebMCP-Tool, das ein Assistent im Browser aufgerufen hat. Eine Zeile
          Script sieht das und zeigt es in vier Ansichten.
        </p>
        <form className="scanform" action="/login" method="get" style={{ maxWidth: 560 }} {...{ toolname: "start_free_pilot", tooldescription: "Startet die kostenlose Agent-Tracking-Pilotphase für eine Domain: öffnet die Anmeldeseite mit vorausgefüllter Domain." }}>
          <input type="hidden" name="lang" value="de" />
          <label htmlFor="domain" className="sr-only">Deine Domain</label>
          <input id="domain" type="text" name="domain" inputMode="url" autoComplete="url" placeholder="example.com" aria-describedby="pilot-note" required />
          <button className="btn" type="submit">
            Pilotphase starten
          </button>
        </form>
        <p id="pilot-note" className="formnote" style={{ marginTop: 10 }}>
          Anmeldung per E-Mail, eine Zeile einfügen, fertig. Keine Karte, keine Cookies bei deinen Besuchern, keine
          personenbezogenen Daten. Vorher die <Link href="/demo">Demo-Seite</Link> ansehen geht auch.
        </p>
      </section>

      <Positioning lang="de" />
      <Positioning lang="de" part="faq" />

      <section className="shell section">
        <h2>Vier Ansichten, sonst nichts</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Überblick, Agenten, Tools, Seiten. Jede beantwortet eine Frage, die du sonst raten müsstest. Die Screenshots
          stammen von unserer Demo-Seite mit Testdaten, deshalb sind die Zahlen klein; es sind keine Kundendaten.
        </p>
        <div className="grid2" style={{ gap: 18, marginTop: 22 }}>
          <figure style={{ margin: 0 }}>
            <img
              src="/img/tracking/dashboard-overview.webp"
              alt="Der Überblick: Agenten-Interaktionen pro Tag, Referrals, Abrufe, Tool-Aufrufe und Conversions in einem Diagramm"
              loading="lazy"
              style={{ width: "100%", aspectRatio: "16 / 11", objectFit: "cover", objectPosition: "top", borderRadius: 12, border: "1px solid var(--line, #e6e3dc)" }}
            />
            <figcaption style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Überblick: Interaktionen pro Tag, daneben der Check-Score.</figcaption>
          </figure>
          <figure style={{ margin: 0 }}>
            <img
              src="/img/tracking/dashboard-tools.webp"
              alt="Die Tools-Ansicht: Aufrufe, Erfolgsquote, mittlere Dauer und häufigste Fehler je WebMCP-Tool"
              loading="lazy"
              style={{ width: "100%", aspectRatio: "16 / 11", objectFit: "cover", objectPosition: "top", borderRadius: 12, border: "1px solid var(--line, #e6e3dc)" }}
            />
            <figcaption style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Tools: welche aufgerufen werden, welche scheitern, welche niemand anfasst.</figcaption>
          </figure>
        </div>
      </section>

      <section className="shell section">
        <h2>Eine Zeile, dann auf den ersten Agenten warten</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Site im Dashboard anlegen, diese Zeile auf jede Seite, auf Prüfen drücken. Tools, die du über{" "}
          <code>navigator.modelContext</code> registrierst, werden ohne Änderung an deinem Code erkannt; deklarative
          Tools sind Formulare mit einem <code>toolname</code>.
        </p>
        <pre className="code">
          <code>{snippetFor("example.com")}</code>
        </pre>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link className="btn ghost" href="/de/docs">
            Dokumentation lesen
          </Link>
          {CHECK_ORIGIN ? (
            <a className="btn ghost" href={CHECK_ORIGIN} rel="noopener">
              Erst die Agent Readiness prüfen
            </a>
          ) : null}
        </p>
      </section>

      <section className="shell section">
        <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
          <span className="tag">Datenschutz von Anfang an</span>
          <p>
            Keine Cookies, nichts auf dem Endgerät der Besucher, keine gespeicherte Netzwerkadresse, und bei
            Tool-Aufrufen die Namen der Eingabefelder, nie deren Werte. Rohdaten werden nach {RAW_RETENTION_DAYS} Tagen
            gelöscht, Tagessummen bleiben, solange die Site besteht. Alles liegt auf unserem eigenen Server in
            Deutschland, und der <Link href="/de/avv">Auftragsverarbeitungsvertrag</Link> wird in dem Moment
            geschlossen, in dem du eine Site hinzufügst. Site entfernen löscht alles.
          </p>
        </div>
      </section>

      <section className="shell section" id="plans">
        <h2>Cloud oder eigener Server</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Das ganze Produkt ist Open Source unter AGPL-3.0: Snippet, Ingest, Dashboard, Log-Import, Cron-Jobs. Betreib es mit einer Compose-Datei auf deinem
          eigenen Rechner, oder nimm die gehostete Version hier und lass uns das machen.
        </p>
        <div className="grid3" style={{ marginTop: 22 }}>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Cloud · Free</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>In der Pilotphase kostenlos</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {free.domains} Site, {free.eventsPerMonth.toLocaleString("de-DE")} Agenten-Ereignisse im Monat, {free.windowDays} Tage Verlauf. Reine Seitenaufrufe
              zählen nicht. Keine Karte.
            </p>
          </div>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Cloud · Pro und Agency</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Noch nicht offen</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {PLANS.pro.domains} Sites und {PLANS.pro.eventsPerMonth.toLocaleString("de-DE")} Ereignisse mit Manifest-Alarm, oder unbegrenzt Sites mit White-Label-Badge.
              Preise folgen, wenn das Produkt sie verdient hat; bis dahin schreib uns, und wir stellen dein Konto von Hand um.
            </p>
          </div>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Selbst gehostet · Free</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Dein Server, deine Daten</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              Jedes Plan-Limit setzt du selbst. Ein Node-Prozess, eine SQLite-Datei, kein externer Dienst außer einem Mailversand.{" "}
              <a href={GITHUB_URL} rel="noopener">
                Quellcode und Anleitung auf GitHub
              </a>
              .
            </p>
          </div>
        </div>
        <pre className="code" style={{ marginTop: 22 }}>{SELF_HOST}</pre>
      </section>

      <section className="shell section" id="pilot">
        <h2>In der Pilotphase kostenlos</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Agent Tracking ist neu, und der ehrliche Weg, etwas Neues zu bepreisen, ist, es erst laufen zu lassen. In
          der Pilotphase ist jedes Konto im Free-Plan: {free.domains} Site, {free.eventsPerMonth.toLocaleString("de-DE")}{" "}
          Agenten-Ereignisse im Monat, {free.windowDays} Tage Verlauf. Reine Seitenaufrufe zählen nicht.
        </p>
        <p id="pilot-terms" className="dek" style={{ maxWidth: "62ch" }}>
          Brauchst du während der Pilotphase mehr? Schreib an <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
          wir stellen dein Konto von Hand um. Bezahlte Pläne kommen, wenn das Produkt sie verdient hat, und an deinem
          Konto ändert sich nichts ohne 30 Tage Vorlauf per E-Mail.
        </p>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Was wir dafür erbitten: Sag uns, was das Dashboard falsch hatte, welchen Agenten es übersehen hat, welche
          Zahl du nicht geglaubt hast. Dafür ist die Pilotphase da.
        </p>
        <form className="scanform" action="/login" method="get" style={{ maxWidth: 560, marginTop: 22 }}>
          <input type="hidden" name="lang" value="de" />
          <label htmlFor="domain-2" className="sr-only">Deine Domain</label>
          <input id="domain-2" type="text" name="domain" inputMode="url" autoComplete="url" placeholder="example.com" aria-describedby="pilot-terms" required />
          <button className="btn" type="submit">
            Pilotphase starten
          </button>
        </form>
      </section>
    </>
  );
}
