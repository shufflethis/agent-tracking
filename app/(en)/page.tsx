import type { Metadata } from "next";
import Link from "next/link";
import HeroArt from "@/components/HeroArt";
import Positioning from "@/components/Positioning";
import { heroFor } from "@/lib/hero";
import { alternatesFor } from "@/lib/i18n";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import { CHECK_ORIGIN, CONTACT_EMAIL, GITHUB_URL, SITE_ORIGIN } from "@/lib/site";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: { absolute: "Agent Tracking: AI agent analytics for websites" },
  description:
    "Track AI referrals, investigate tool failures, and document fixes with browser retests. Open-source website analytics with optional server-confirmed outcomes.",
  alternates: alternatesFor("/"),
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  openGraph: { title: "Agent Tracking: AI agent analytics for websites", description: "Recognized AI referrals, supported WebMCP observations, optional crawler-log verification and server outcome receipts. Open source.", url: "/", type: "website" },
  twitter: { card: "summary_large_image" },
};

const PAGE_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_ORIGIN}/#webpage`,
  url: SITE_ORIGIN,
  name: "Agent Tracking: AI agent analytics for websites",
  description: "Recognized assistant referrals, browser tool observations, optional crawler logs and server outcome receipts with explicit evidence limits.",
  inLanguage: "en",
  dateModified: "2026-09-25",
  isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
  about: { "@id": `${SITE_ORIGIN}/#app` },
};

const SELF_HOST = `git clone ${GITHUB_URL}.git && cd agent-tracking
cp .env.example .env && docker compose up -d`;

/**
 * The landing page. The docs page explains how it works; this one says why
 * it exists and gets a domain into the sign-in flow. The
 * form is a plain GET to /login, which already takes ?domain= and adds the
 * site after sign-in, so there is no client code on this page at all.
 *
 * The screenshots are from the demo page with test data and say so. Real
 * numbers from real sites go here when there are some; nothing is invented.
 */

const free = PLANS.free;

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_LD) }} />
      <section className="shell pagehead withart" style={{ paddingTop: 64, paddingBottom: 20 }}>
        <HeroArt name={heroFor("home")!} />
        <p className="eyebrow">AI analytics for your website · Free pilot</p>
        <h1 style={{ fontSize: "clamp(30px,5.2vw,58px)", lineHeight: 1.05, maxWidth: "18ch", marginBottom: 20 }}>
          What happens after the AI click?
        </h1>
        <p style={{ fontSize: "clamp(17px,2.1vw,22px)", lineHeight: 1.55, color: "var(--ink)", maxWidth: "52ch", marginTop: 0, marginBottom: 14 }}>
          See which AI assistants send visitors, which tool calls fail, and which inquiries your server confirms. Record the problem, document the fix, and test the path again.
        </p>
        <p style={{ fontSize: "clamp(15px,1.6vw,18px)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "52ch", marginTop: 0, marginBottom: 28 }}>
          Insights brings observed issues and next steps together. Your site history keeps the changes and their actual test results.
        </p>
        <form className="scanform" action="/login" method="get" style={{ maxWidth: 560 }} {...{ toolname: "start_free_pilot", tooldescription: "Start the free Agent Tracking pilot for a domain: opens the sign-in page with the domain prefilled." }}>
          <label htmlFor="domain" className="sr-only">Your domain</label>
          <input id="domain" type="text" name="domain" inputMode="url" autoComplete="url" placeholder="example.com" aria-describedby="pilot-note" required />
          <button className="btn" type="submit">
            Connect your website
          </button>
        </form>
        <p id="pilot-note" className="formnote" style={{ marginTop: 10 }}>
          Open source. Hosted in Germany. No credit card.{" "}
          <Link href="/demo">See the demo page</Link> first if you like.
        </p>
        <p className="formnote"><Link href="/guides/ai-agent-traffic-website-measurement-guide">Read the complete AI traffic measurement guide</Link>.</p>
      </section>

      <Positioning lang="en" />

      <section className="shell section centered">
        <h2>A sample of the measurement views</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Overview, Agents, Tools and Pages show the observed activity. The private workspace also has task tests,
          fixes and reports. These screenshots use demo data; they are not customer results.
        </p>
        <div className="grid2" style={{ gap: 18, marginTop: 22 }}>
          <figure style={{ margin: 0 }}>
            <img
              src="/img/tracking/dashboard-overview.webp"
              alt="The overview: agent interactions per day, referrals, fetches, tool calls and conversions in one chart"
              loading="lazy"
              style={{ width: "100%", aspectRatio: "16 / 11", objectFit: "cover", objectPosition: "top", borderRadius: 12, border: "1px solid var(--line, #e6e3dc)" }}
            />
            <figcaption style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Earlier overview with demo data. Insights adds evidence and next steps.</figcaption>
          </figure>
          <figure style={{ margin: 0 }}>
            <img
              src="/img/tracking/dashboard-tools.webp"
              alt="The tools view: calls, success rate, average duration and top errors per WebMCP tool"
              loading="lazy"
              style={{ width: "100%", aspectRatio: "16 / 11", objectFit: "cover", objectPosition: "top", borderRadius: 12, border: "1px solid var(--line, #e6e3dc)" }}
            />
            <figcaption style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>Tools: which ones are called, which fail, which nobody touches.</figcaption>
          </figure>
        </div>
      </section>

      <section className="shell section centered">
        <h2>Connect your first data source</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Add your site in the dashboard, put this on every page, and press verify. Tools you register through{" "}
          <code>navigator.modelContext</code> are picked up without any change to your code; declarative tools are forms
          with a <code>toolname</code>.
        </p>
        <pre className="code">
          <code>{snippetFor("example.com")}</code>
        </pre>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link className="btn ghost" href="/docs">
            Read the documentation
          </Link>
          {CHECK_ORIGIN ? (
            <a className="btn ghost" href={CHECK_ORIGIN} rel="noopener">
              Check agent readiness first
            </a>
          ) : null}
        </p>
      </section>

      <section className="shell section centered">
        <div className="callout mid" style={{ maxWidth: "var(--measure)", marginLeft: "auto", marginRight: "auto" }}>
          <span className="tag">Documented data selection</span>
          <p>
            The snippet sets no cookies or local storage entries. Raw network addresses and tool argument values are not stored in event records. Daily salted session hashes remain estimates and may require a privacy assessment. Raw events are deleted after {RAW_RETENTION_DAYS}{" "}
            days; daily totals stay as long as the site does. Everything lives on our own server in Germany, and
            the <Link href="/dpa">data processing agreement</Link> is concluded the moment you add a site. Removing the
            site deletes all of it.
          </p>
        </div>
      </section>

      <section className="shell section centered" id="plans">
        <h2>Cloud or your own server</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          The whole product is open source under AGPL-3.0: the snippet, the ingest, the dashboard, the log import, the cron jobs. Run it on your own machine with
          one compose file, or use the hosted version here and let us run it.
        </p>
        <div className="grid3" style={{ marginTop: 22 }}>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Cloud · Free</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Free during the pilot</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {free.domains} site, {free.eventsPerMonth.toLocaleString("en-GB")} agent events a month, {free.windowDays} days of history. Plain page views are not
              counted. No card.
            </p>
          </div>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Cloud · Pro and Agency</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Not open yet</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              {PLANS.pro.domains} sites and {PLANS.pro.eventsPerMonth.toLocaleString("en-GB")} events with manifest alerts, or unlimited sites with a white-label badge.
              Prices follow when the product has earned them; until then write to us and we switch your account by hand.
            </p>
          </div>
          <div className="card tc">
            <p className="smallcaps" style={{ marginBottom: 8 }}>Self-hosted · Free</p>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Your server, your data</h3>
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
              Every plan limit is yours to set. One Node process, one SQLite file, no external service except a mail sender.{" "}
              <a href={GITHUB_URL} rel="noopener">
                Source and instructions on GitHub
              </a>
              .
            </p>
          </div>
        </div>
        <pre className="code" style={{ marginTop: 22 }}>{SELF_HOST}</pre>
      </section>

      <Positioning lang="en" part="faq" />

      <section className="shell section centered" id="pilot">
        <h2>Building with our first users.</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Agent Tracking is new, and the honest way to price something new is to run it first. During the pilot every
          account is on the Free plan: {free.domains} site, {free.eventsPerMonth.toLocaleString("en-GB")} agent events a
          month, {free.windowDays} days of history. Plain page views are not counted.
        </p>
        <p id="pilot-terms" className="dek" style={{ maxWidth: "62ch" }}>
          Need more than that while the pilot runs? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
          and we switch your account by hand. Paid plans follow when the product has earned them, and nothing about
          your account changes without 30 days&apos; notice by email.
        </p>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          What we ask in return: tell us what the dashboard got wrong, which agent it missed, which number you did not
          believe. That is what the pilot is for.
        </p>
        <form className="scanform" action="/login" method="get" style={{ maxWidth: 560, marginTop: 22, marginLeft: "auto", marginRight: "auto" }}>
          <label htmlFor="domain-2" className="sr-only">Your domain</label>
          <input id="domain-2" type="text" name="domain" inputMode="url" autoComplete="url" placeholder="example.com" aria-describedby="pilot-terms" required />
          <button className="btn" type="submit">
            Connect your website
          </button>
        </form>
      </section>
    </>
  );
}
