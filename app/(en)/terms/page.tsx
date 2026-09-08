import Link from "next/link";
import { alternatesFor } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, SITE_HOST } from "@/lib/site";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Terms of service",
  description: `The terms for the hosted Agent Tracking service at ${SITE_HOST}: the service, plans, your obligations, availability, liability, term and law.`,
  alternates: alternatesFor("/terms"),
};

function Clause({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="clause">
      <h2 id={`s${n}`}>
        <span className="clause-n">§ {n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <article className="shell doc" style={{ paddingTop: 56, paddingBottom: 20 }}>
      <div className="pagehead" style={{ marginBottom: 34 }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Terms of service</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          For the hosted service at {SITE_HOST}. The software itself is licensed separately under the AGPL-3.0; running your own copy needs none of this. The{" "}
          <Link href="/de/agb">German version</Link> is a translation; this page is the binding one.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">The short version</span>
        <p>
          You get a dashboard of what AI agents do on your site. Free is free and stays free during the pilot; paid plans come later, with 30 days&apos; notice before anything
          about your account changes. You put one line of script on your own site and answer to your visitors for it. We run the service carefully but promise no uptime, and
          our liability is capped at what you paid us in the last twelve months. Florida law, English text.
        </p>
      </div>

      <div className="prose terms">
        <Clause n="1" title="Parties and scope">
          <p>
            These terms are between <b>{LEGAL.name}</b>, {LEGAL.addressLines.join(", ")} (&ldquo;we&rdquo;), and the person or company that creates an account at {SITE_HOST}{" "}
            (&ldquo;you&rdquo;). They govern the hosted service only. The source code is free software under the GNU Affero General Public License v3.0; that licence, not these
            terms, governs the software.
          </p>
          <p>The service is for businesses, organisations and professionals in relation to websites they operate. It is not offered to consumers.</p>
        </Clause>

        <Clause n="2" title="The service">
          <p>
            Agent Tracking records, for a site you register and verify, which AI assistants send visitors, which AI agents fetch pages, which WebMCP tools are called and whether
            marked goals are reached, and shows daily totals in a dashboard, through an API and through an MCP tool. What is recorded and what is not is described in the{" "}
            <Link href="/docs">documentation</Link> and the <Link href="/dpa">data processing agreement</Link>.
          </p>
          <p>
            Agent identification rests on a published, versioned list of referrers and user agents and, for server logs, on address ranges the vendors publish. An agent that does
            not announce itself is not counted. The numbers are a measurement with that limit, not a guarantee of completeness.
          </p>
        </Clause>

        <Clause n="3" title="Account">
          <p>
            An account is an email address. Signing in is by a link sent to it; whoever controls the mailbox controls the account, so keep it safe. You are responsible for
            everything done through your account and for keeping the address current.
          </p>
          <p>You may register a site only if you operate it or the operator has authorised you. Verification checks that the snippet is installed, not who you are.</p>
        </Clause>

        <Clause n="4" title="Plans, pilot and prices">
          <p>
            The plans and their limits are listed in the documentation: Free covers {PLANS.free.domains} site, {PLANS.free.eventsPerMonth.toLocaleString("en-US")} agent events a
            month and {PLANS.free.windowDays} days of history; Pro and Agency extend those limits. Plain page views are never counted against the limit.
          </p>
          <p>
            During the pilot every account is on Free at no charge, and we may raise an account&apos;s limits by hand on request. Paid plans open when we announce prices. Nothing
            about an existing account changes without 30 days&apos; notice by email; if a change is not acceptable to you, remove your sites before it takes effect and nothing is
            owed.
          </p>
          <p>
            Once open, paid plans are billed in advance through Stripe for the chosen period and renew until cancelled from the dashboard. Prices are shown at checkout and exclude
            taxes you may owe. A plan can be cancelled at any time and ends at the end of the paid period; there is no refund for the remainder, except where the law requires one.
          </p>
        </Clause>

        <Clause n="5" title="Your obligations">
          <ul>
            <li>Install the snippet only on sites you are allowed to modify, and tell your visitors about it as the law of your place requires.</li>
            <li>You are the controller for your visitors&apos; data; we process it on your instruction under the data processing agreement.</li>
            <li>Do not send fabricated events, probe or overload the ingest, or use the service to measure a site against its operator&apos;s will.</li>
            <li>Keep the API token secret. Revoke it in the dashboard if it leaks; we cannot show it twice.</li>
            <li>Do not resell the hosted service as your own without our written agreement. Running the software yourself under the AGPL is always allowed.</li>
          </ul>
          <p>If you breach these obligations we may suspend the account after notice, or without notice where the breach endangers the service or others.</p>
        </Clause>

        <Clause n="6" title="Availability and changes">
          <p>
            We run the service with care on a server in {LEGAL.hostingCountry}, keep daily encrypted backups and fix faults as quickly as we can, but we promise no particular
            availability. Maintenance may interrupt the service; we announce planned maintenance of any length in advance where we can.
          </p>
          <p>
            We may change the service, add or remove features and update the agent list. A change that removes a material feature from a paid plan is announced 30 days in
            advance, and you may cancel with a pro-rata refund for the remaining period.
          </p>
          <p>A batch of events the service cannot accept, for example above the plan&apos;s limit or malformed, is dropped silently. The snippet never shows an error on your site.</p>
        </Clause>

        <Clause n="7" title="Warranty and liability">
          <p>
            The service is provided as is. To the extent the law allows, we disclaim all warranties, express or implied, including merchantability and fitness for a particular
            purpose, and we do not warrant that the numbers are complete or that the service is uninterrupted or error-free.
          </p>
          <p>
            To the extent the law allows, we are not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue or data, however
            arising. Our total liability under these terms is limited to the amount you paid us for the service in the twelve months before the claim arose, and for a Free
            account to 100 US dollars. Nothing here limits liability for wilful misconduct or fraud, or any liability that cannot be limited by law.
          </p>
          <p>Between the parties, the data processing agreement governs data protection matters and prevails over this section where the two conflict.</p>
        </Clause>

        <Clause n="8" title="Term and deletion">
          <p>
            The agreement runs until you remove the account or we end it. You may remove any site or the whole account in the dashboard at any time; all data of a removed site,
            raw and aggregated, is deleted at once, and raw data is in any case deleted after {RAW_RETENTION_DAYS} days.
          </p>
          <p>
            We may end the agreement with 30 days&apos; notice by email, or without notice for a material breach. If we discontinue the hosted service we give at least 90 days&apos;
            notice and offer an export of your daily totals; the software remains available under its licence for you to run yourself.
          </p>
        </Clause>

        <Clause n="9" title="Law, venue and final provisions">
          <p>
            These terms are governed by the laws of the State of Florida, USA, without regard to its conflict-of-law rules, and the courts of Pinellas County, Florida have
            exclusive jurisdiction, except that we may seek injunctive relief anywhere. Mandatory law of your place of business that cannot be contracted out of remains
            unaffected. The United Nations Convention on Contracts for the International Sale of Goods does not apply.
          </p>
          <p>
            The English text is binding; translations are for convenience. If a provision is unenforceable, the rest remains in force and the provision is replaced by one that
            comes closest to its purpose. We may amend these terms with 30 days&apos; notice by email; continued use after that date is acceptance, and removing your sites before
            it is rejection without cost.
          </p>
          <p>
            Questions go to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Clause>

        <p className="terms-date">Revised {LEGAL.revised}.</p>
      </div>
    </article>
  );
}
