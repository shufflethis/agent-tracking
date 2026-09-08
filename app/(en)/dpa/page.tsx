import Link from "next/link";
import { alternatesFor } from "@/lib/i18n";
import { CONTACT_EMAIL, LEGAL, SITE_HOST } from "@/lib/site";
import { RAW_RETENTION_DAYS } from "@/lib/tracking/plans";

export const metadata = {
  title: "Data Processing Agreement",
  description: `Data processing agreement under Art. 28 GDPR for Agent Tracking at ${SITE_HOST}: subject matter, instructions, sub-processors, international transfer, technical and organisational measures, deletion.`,
  alternates: alternatesFor("/dpa"),
};

/**
 * Annex 1 and Annex 2 describe what the code actually does (lib/tracking,
 * snippet/agent.src.js); when that changes, the date changes with it. The
 * processor is a US company and the server stands in Germany, which is why
 * section 5 carries a transfer clause a German processor would not need.
 */

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
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>Data Processing Agreement</h1>
        <p style={{ fontSize: "var(--t-body-lg)", lineHeight: 1.55, color: "var(--ink-2)", maxWidth: "58ch", marginTop: 0, marginBottom: 0 }}>
          Agreement on the processing of personal data on behalf of a controller under Art. 28 GDPR, for the Agent Tracking service. It is concluded electronically when you add a
          site in the dashboard (Art. 28 (9) GDPR). The <Link href="/de/avv">German version</Link> is a translation; this page is the binding one.
        </p>
      </div>

      <div className="callout mid" style={{ maxWidth: "var(--measure)" }}>
        <span className="tag">The short version</span>
        <p>
          You are the controller for your visitors&apos; data. We process it only on your instruction, on a server in {LEGAL.hostingCountry}, without storing network addresses
          and without purposes of our own. Raw data is gone after {RAW_RETENTION_DAYS} days. Remove the site from the dashboard and everything is gone.
        </p>
      </div>

      <div className="prose terms">
        <Clause n="1" title="Parties, subject matter and duration">
          <p>
            This agreement is between the holder of the account that adds a site to Agent Tracking (the &ldquo;Controller&rdquo;) and <b>{LEGAL.name}</b>,{" "}
            {LEGAL.addressLines.join(", ")} (the &ldquo;Processor&rdquo;). Full details are in the <Link href="/imprint">imprint</Link>.
          </p>
          <p>
            The subject matter is the processing of data that the script <code>agent.js</code> collects on the Controller&apos;s pages and sends to the Processor, of server log
            lines the Controller uploads, and their storage, aggregation and display in the dashboard, the API and the MCP endpoint. Annex 1 describes the processing in detail.
          </p>
          <p>The agreement starts when the site is added and ends when the Controller removes the site from the account or the account is deleted. Section 7 says what happens to the data then.</p>
        </Clause>

        <Clause n="2" title="Nature and purpose of the processing, categories of data and of data subjects">
          <p>
            The purpose is a statistic of whether and how AI assistants and AI agents visit the Controller&apos;s site and use its WebMCP tools. The processing consists of
            collecting, transmitting, storing, aggregating into daily totals, displaying and deleting.
          </p>
          <p>The categories of data are those listed in Annex 1. The data subjects are visitors of the Controller&apos;s site and people who use an AI assistant that visits it.</p>
        </Clause>

        <Clause n="3" title="Instructions">
          <p>
            The Processor processes the data only on documented instructions from the Controller. This agreement and the settings the Controller makes in the dashboard (adding,
            verifying, publishing and removing a site, uploading a log) are those instructions. Further instructions are given in text form to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
          <p>If the Processor considers an instruction unlawful, it informs the Controller without delay and may suspend carrying it out until the Controller confirms or changes it.</p>
          <p>
            The Processor does not process the data for its own purposes. In particular the data is not used for advertising, profiling or the training of models, and is not
            passed to third parties unless a law requires it; in that case the Processor informs the Controller before processing, where the law allows.
          </p>
        </Clause>

        <Clause n="4" title="Obligations of the Processor">
          <p>The Processor ensures that only persons who are bound to confidentiality have access to the data.</p>
          <p>
            It implements the technical and organisational measures in Annex 2 under Art. 32 GDPR and may develop them further as long as the level of protection does not fall.
            Material changes are documented in Annex 2 with a new date.
          </p>
          <p>
            It assists the Controller in responding to requests from data subjects. The stored data contains no identifier through which a particular person could be found; the
            Processor confirms this on request and, on instruction, deletes the records of a named period.
          </p>
          <p>
            It assists the Controller with the obligations under Art. 32 to 36 GDPR as far as the information available to it allows. A personal data breach affecting this
            processing is reported to the Controller at the account address without undue delay after the Processor becomes aware of it, with the details under Art. 33 (3) GDPR
            as far as they are available.
          </p>
          <p>It keeps the record under Art. 30 (2) GDPR and provides the Controller with the details the Controller needs for its own record; Annex 1 contains them.</p>
        </Clause>

        <Clause n="5" title="Sub-processors and international transfer">
          <p>The Controller consents to the use of the following sub-processors:</p>
          <ul>
            <li>
              <b>{LEGAL.hostingProvider}</b>: provision and connectivity of the server on which the data is stored. The hosting provider has no access to the contents of the
              data in regular operation.
            </li>
            <li>
              <b>GitHub, Inc.</b>, 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA: storage of a daily copy of the database, encrypted with AES-256 before it leaves
              the server, in a private repository. The key is held only by the Processor; GitHub cannot read the contents. The transfer rests on the adequacy decision for the
              EU-US Data Privacy Framework, of which GitHub is a member.
            </li>
          </ul>
          <p>
            No other sub-processors are used. In particular the data is not transmitted to providers of email, payment or analytics services; messages to the Controller itself
            contain no data of data subjects.
          </p>
          <p>
            <b>Transfer to the Processor.</b> The Processor is established in the United States. All data under this agreement is stored and processed on the server in{" "}
            {LEGAL.hostingCountry}; the Processor reaches it only over an encrypted administrative connection, and the pseudonymised records described in Annex 1 are the only data
            an administrator can see. For Controllers in the EU or EEA the standard contractual clauses of the European Commission (Decision (EU) 2021/914, Module Two,
            controller to processor) form part of this agreement, with the Controller as data exporter, the Processor as data importer, Annex 1 as their Annex I.B, Annex 2 as
            their Annex II, the optional docking clause selected, the law and courts of Ireland for Clauses 17 and 18, and the supervisory authority of the Controller&apos;s
            member state under Clause 13. Where this agreement and the clauses conflict, the clauses prevail. Controllers in the United Kingdom are covered by the UK
            International Data Transfer Addendum to the same clauses.
          </p>
          <p>
            If the Processor intends to add or replace a sub-processor, it informs the Controller at the account address at least 30 days in advance. The Controller may object
            for a substantial reason related to data protection. If no agreement is reached, the Controller may end this agreement by removing the site.
          </p>
        </Clause>

        <Clause n="6" title="Evidence and audits">
          <p>
            On request, the Processor makes available to the Controller the information necessary to demonstrate compliance with this agreement, as a rule as a description in
            text form of the processing and of the measures in Annex 2. The source code of the service is public and can be inspected at any time.
          </p>
          <p>
            If that is not sufficient, the Controller or an auditor it appoints who is bound to confidentiality may audit compliance: with at least 14 days&apos; notice, during
            usual business hours, without disproportionate disruption of operations and at most once per calendar year unless a specific reason requires a further audit. The
            Controller bears the costs of the audit.
          </p>
        </Clause>

        <Clause n="7" title="Deletion and return">
          <p>Independently of this agreement, raw data is deleted automatically {RAW_RETENTION_DAYS} days after it was collected. Daily totals remain as long as the site is in the account.</p>
          <p>
            When the Controller removes the site from the account, the Processor deletes all raw data, daily totals, the tool registry and the settings belonging to it without
            delay and permanently. The same applies to all sites of an account when the account is deleted. Encrypted backup copies expire within 30 days.
          </p>
          <p>The daily totals of a site can be exported from the dashboard as CSV at any time before removal.</p>
          <p>Statutory retention duties remain unaffected; to the Processor&apos;s knowledge none apply to the data described here.</p>
        </Clause>

        <Clause n="8" title="Liability">
          <p>The liability of the parties towards data subjects is governed by Art. 82 GDPR. Between the parties, section 7 of the <Link href="/terms">terms of service</Link> applies.</p>
        </Clause>

        <Clause n="9" title="Final provisions">
          <p>
            The agreement is concluded when the Controller adds a site in the dashboard. It applies accordingly to every further site. Where it conflicts with the terms of
            service, this agreement prevails in matters of data protection.
          </p>
          <p>
            If the Processor amends this agreement, it publishes the new version with its date at this address and informs the Controller at the account address. The new version
            applies immediately to sites added afterwards, and to existing sites 30 days after the notice unless the Controller removes the site before then.
          </p>
          <p>
            The English text is binding. The agreement is governed by the law that governs the terms of service, except that the standard contractual clauses incorporated in
            section 5 are governed as they themselves provide, and nothing in this agreement limits rights that the GDPR grants data subjects or the Controller.
          </p>
        </Clause>

        <section className="clause">
          <h2 id="annex1">Annex 1: The processing in detail</h2>
          <p>
            <b>Collected and stored</b> per page view: the page path without query string and fragment; the referrer host and the <code>utm_source</code> parameter, only to
            attribute the visit to an AI assistant; the result of that attribution (referrer and user agent matched against a published, versioned list); a session id. For WebMCP
            tools in addition: the tool name, a hash of its description and schema, the duration and outcome of a call (success or failure, error class), the names of the input
            keys; the name of an element marked as a goal when it is clicked or submitted; a hash of the manifest at <code>/.well-known/webmcp</code>.
          </p>
          <p>
            <b>The session id</b> is a SHA-256 hash of a random value generated afresh every day, the domain, a coarse browser class (mobile or desktop, or the id of a known
            agent) and the network address, shortened to 16 characters. The network address is not stored. From the next day on, the hash can no longer be linked to the day
            before.
          </p>
          <p>
            <b>Not collected:</b> the network address as such, cookies or anything else placed on the device, values of input fields or form contents, names, email addresses or
            accounts of visitors, screen or device characteristics. Events with fields other than the intended ones, and batches from a domain other than the registered one, are
            discarded.
          </p>
          <p>
            <b>Server log lines</b> the Controller uploads or sends by script: from a line, the day, the agent name and the page path are taken over. The network address is used
            while the request is processed only to group one agent&apos;s fetches and to check the agent against its vendor&apos;s published address ranges, and is discarded when
            the request ends. The log file itself is not stored.
          </p>
          <p>
            <b>Duration:</b> raw data {RAW_RETENTION_DAYS} days; daily totals, tool registry and manifest hash until the site is removed. <b>Location:</b> a server in{" "}
            {LEGAL.hostingCountry}.
          </p>
        </section>

        <section className="clause">
          <h2 id="annex2">Annex 2: Technical and organisational measures</h2>
          <ul>
            <li>
              <b>Server access:</b> The server is in a data centre in {LEGAL.hostingCountry}. Access is exclusively over SSH with keys; password login is disabled.
            </li>
            <li>
              <b>Access to the data:</b> The dashboard is reachable only after sign-in. Sign-in is by a link sent to the account address, valid for 30 minutes and for one use;
              the session ends after 30 days or on sign-out. Each site is visible only to its account holder. A public stats page appears only when the Controller switches it on
              explicitly, and shows totals only.
            </li>
            <li>
              <b>Pseudonymisation and data minimisation:</b> as in Annex 1. The random value for the session id is regenerated daily and the old one discarded. Batches over 50
              events, fields outside the list, query strings and input values are discarded on receipt.
            </li>
            <li>
              <b>Transmission:</b> The script, the ingest endpoint and the dashboard are served and accept data over TLS only.
            </li>
            <li>
              <b>Separation:</b> Data is stored and queried per domain; ingest is limited per account and per sending address.
            </li>
            <li>
              <b>Deletion:</b> Raw data is deleted automatically every day after {RAW_RETENTION_DAYS} days. Removing a site deletes all of its data in one transaction.
            </li>
            <li>
              <b>Availability:</b> The database writes transactionally. Every day a consistent snapshot is encrypted with AES-256 and stored outside the server (see section 5);
              the key is held only by the Processor.
            </li>
            <li>
              <b>Change control:</b> The service is deployed from public, versioned source code with automated tests. Discarded batches are counted without reference to a person.
            </li>
          </ul>
        </section>

        <p className="terms-date">Revised {LEGAL.revised}.</p>
      </div>

      <div className="card mid" style={{ maxWidth: "var(--measure)", marginTop: 40, padding: "22px 24px" }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, color: "var(--ink-2)" }}>A question about this agreement, or your data protection officer needs a signed copy? An email is enough.</p>
        <p style={{ margin: 0, display: "flex", flexWrap: "wrap", gap: "6px 20px" }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontFamily: "var(--display)", fontWeight: 600 }}>
            {CONTACT_EMAIL}
          </a>
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/docs">Documentation</Link>
        </p>
      </div>
    </article>
  );
}
