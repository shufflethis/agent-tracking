import Link from "next/link";
import { alternatesFor } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, PLAUSIBLE_HOST, PLAUSIBLE_HOSTING, SITE_HOST } from "@/lib/site";
import { RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Privacy notice",
  description: `What ${SITE_HOST} records about visitors of this site, about account holders, and on customers' sites on their behalf. No cookies, no third-party scripts, no advertising.`,
  alternates: alternatesFor("/privacy"),
};

/**
 * Written from the code, not from a template: every sentence about what is
 * recorded corresponds to a line in lib/tracking or snippet/agent.src.js, and
 * changes there change this page. Where the GDPR is cited, the citation is the
 * one that applies to a controller outside the EU offering a service to
 * people in it (Art. 3 (2)), which is the cloud's situation.
 */
export default function Page() {
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Privacy notice</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          What this site records, why, for how long, and what it refuses to. The <Link href="/de/datenschutz">German version</Link> is a translation; this page is the
          authoritative one.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">The short version</span>
        <p>
          No cookies, no advertising, no ad or social trackers.{PLAUSIBLE_HOST ? " Page views of this site are counted with Plausible, without cookies or identifiers." : ""} Visiting this site leaves a server log line that is deleted after 14 days. An account is an
          email address. On customers&apos; sites our script records what AI agents do, without addresses or identifiers, on the customer&apos;s behalf. Everything is stored on
          one server in {LEGAL.hostingCountry}.
        </p>
      </div>

      <div className="prose terms">
        <h2 id="controller">Controller</h2>
        <p>
          <b>{LEGAL.name}</b>, {LEGAL.addressLines.join(", ")}, <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Questions about this notice go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          {LEGAL.euRepresentative ? <> Our representative in the European Union under Art. 27 GDPR is {LEGAL.euRepresentative}.</> : null}
        </p>
        <p>
          The controller is a company in the United States. The server that stores all data described here stands in {LEGAL.hostingCountry}, and the data stays there. The
          controller reaches it only over an encrypted administrative connection; nothing is copied to the United States apart from what an administrator looks at on screen.
        </p>

        <h2 id="hosting">Visiting this site</h2>
        <p>
          The web server writes one line per request: the requested path, the time, the status, the size of the answer, the referrer if the browser sends one, the user agent string
          and the network address. The lines are used to run the service, to find faults and abuse, and to count how often AI agents fetch our own pages; they are deleted after 14
          days. The legal basis is our legitimate interest in a working and secure service (Art. 6 (1) (f) GDPR).
        </p>
        <p>
          Fonts are served from this server. No font, image or style is loaded from anyone else&apos;s domain. The site carries its own tracking snippet, which records the same
          things on this site as it does on customers&apos; sites, described below.
        </p>
        {PLAUSIBLE_HOST ? (
          <p>
            Page views of this site are counted with Plausible Analytics, loaded from {PLAUSIBLE_HOST}, an instance we operate ourselves on a server in Germany{PLAUSIBLE_HOSTING ? ` provided by ${PLAUSIBLE_HOSTING}` : ""}; nothing goes to Plausible Insights OÜ, the maker of the software. It sets no cookie, stores no network address and
            builds no fingerprint: it records the page, the referrer, the browser family and the country, derived from the address and then discarded, and rolls them into daily
            counts. The legal basis is our legitimate interest in knowing which pages are read (Art. 6 (1) (f) GDPR). It runs only on this site, never on a customer&apos;s.
          </p>
        ) : null}

        <h2 id="account">Accounts and sign-in</h2>
        <p>
          An account consists of an email address, the plan, the language of the dashboard, the sites added to it and, if you create one, a hashed API token. There is no password:
          signing in means receiving a link by email, valid for 30 minutes and for one use, whose page sets a session cookie for 30 days. That cookie (<code>at_session</code>) is
          strictly necessary for the dashboard and needs no consent; it is the only cookie this site ever sets, and only after you sign in. We process this data to perform the
          contract with you (Art. 6 (1) (b) GDPR). Sign-in links are limited per address and day, and an address that receives too many is counted to enforce that limit.
        </p>
        <p>
          Mail is sent through Brevo (Sendinblue GmbH, Köpenicker Straße 126, 10179 Berlin, Germany), which processes the address and the message to deliver it. We send sign-in
          links, and, if you leave it on, a weekly digest of your sites&apos; numbers with an unsubscribe link in every mail; the digest can be switched off in the dashboard at any
          time (Art. 6 (1) (b) and (f) GDPR).
        </p>

        <h2 id="tracking">Agent Tracking on customers&apos; sites</h2>
        <p>
          Site owners place our script <code>agent.js</code> on their pages. For their visitors we then record, on their behalf: the page path without query string, whether the
          visit came from or was made by an AI assistant (matched from the referrer and the user agent against a published list), and for WebMCP tools the tool name, duration,
          success or failure, the error class and the <b>names of the input keys, never their values</b>. Each record carries a session id computed from a random daily salt, the
          site, a coarse browser class and the network address, hashed; the address itself is not stored, no cookie is set and nothing is written to the device. Raw records are
          deleted after {RAW_RETENTION_DAYS} days; daily totals remain as long as the site is in the account.
        </p>
        <p>
          Site owners may also upload their own server log. From each line the day, the agent name and the page path are taken; the network address is used while the upload is
          processed only to group one agent&apos;s fetches and to check the agent against its vendor&apos;s published address ranges, and is discarded when the request ends.
        </p>
        <p>
          The site owner is the controller for these records and we process them as processor on their instruction; we do not use them for our own purposes and do not pass them to
          anyone else. The <Link href="/dpa">data processing agreement</Link> sets this out formally. Questions about the tracking on a particular site go to that site&apos;s
          owner; we help them answer.
        </p>

        <h2 id="stats">Public stats pages</h2>
        <p>
          A site owner can publish a page of daily totals for their site. It shows counts and agent names, never sessions, paths or anything about an individual visitor.
        </p>

        <h2 id="api">Stats API and MCP endpoint</h2>
        <p>
          Requests with an API token are counted per address for rate limiting and answered from the same daily totals the dashboard shows. The token is stored as a hash; we cannot
          show it again.
        </p>

        <h2 id="payment">Payment</h2>
        <p>
          Paid plans, once they open, are billed through Stripe, Inc. (354 Oyster Point Boulevard, South San Francisco, CA 94080, USA). Stripe receives your email address and the
          plan and handles the card itself; we never see card data. Stripe tells us the subscription state and a customer id, which we store with the account (Art. 6 (1) (b)
          GDPR). Stripe&apos;s own notice governs what it does with the payment data.
        </p>

        <h2 id="processors">Recipients and international transfers</h2>
        <ul>
          <li>
            <b>{LEGAL.hostingProvider}</b>: provides and connects the server. No access to the contents of the data in regular operation.
          </li>
          <li>
            <b>Brevo</b>, Berlin: delivers our email.
          </li>
          {PLAUSIBLE_HOSTING ? (
            <li>
              <b>{PLAUSIBLE_HOSTING}</b>: provides the server that runs our own Plausible instance for this site&apos;s page-view counts. No access to the contents in regular operation.
            </li>
          ) : null}
          <li>
            <b>GitHub, Inc.</b>, San Francisco, USA: holds a daily copy of the database, encrypted with AES-256 before it leaves the server. GitHub cannot read it. The transfer
            rests on the EU-US Data Privacy Framework, of which GitHub is a member.
          </li>
          <li>
            <b>Stripe, Inc.</b>, USA: payment, only for paid plans, under the EU-US Data Privacy Framework and Stripe&apos;s standard contractual clauses.
          </li>
          <li>
            <b>The controller itself</b> is in the United States. Administrative access to the server from there is protected by encryption and keys. For customers in the EU
            and EEA the data processing agreement includes the standard contractual clauses of the European Commission.
          </li>
        </ul>
        <p>Nobody else receives data. Nothing is sold, shared for advertising, or used to train models.</p>

        <h2 id="backup">Backups</h2>
        <p>
          Once a day a consistent copy of the database is encrypted on the server and stored in a private repository (see above). Backups are kept for 30 days and are used only
          to restore the service after a fault. A record deleted from the live database can therefore survive in a backup for up to 30 days.
        </p>

        <h2 id="rights">Your rights</h2>
        <p>
          Under the GDPR you have the right to access the data we hold about you, to have it corrected or deleted, to restrict or object to its processing, and to receive it in a
          portable form (Art. 15 to 21). Where processing rests on legitimate interest, you may object for reasons arising from your particular situation. You also have the right
          to complain to a supervisory authority, for example the one of your member state of residence. To exercise any of these, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>; for the account data, removing a site or the account in the dashboard deletes it without asking us.
        </p>
        <p>
          For visitors of customers&apos; sites: the records contain no identifier through which a particular person could be found, and no network address. A request for
          access will therefore, honestly, return nothing that is about you; we say so rather than invent a match.
        </p>
        <p>
          Residents of California and other US states with privacy statutes: we do not sell or share personal information and we do not use it for targeted advertising. The
          rights above apply to you in the same way.
        </p>

        <h2 id="children">Children</h2>
        <p>The service is for businesses and their websites. We do not knowingly create accounts for anyone under 16.</p>

        <h2 id="changes">Changes</h2>
        <p>
          When the service changes, this notice changes with it, with a new date. Account holders are told by email about changes that affect them. Revised {LEGAL.revised}.
        </p>
      </div>
    </article>
  );
}
