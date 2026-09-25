import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { alternatesFor } from "@/lib/i18n";
import { SOURCES_VERSION } from "@/lib/tracking/classify";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import sources from "@/lib/tracking/ai-sources.json";
import { CHECK_ORIGIN, CONTACT_EMAIL, GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

// Cached for an hour and re-rendered from the running server's environment after that, so
// the host and the legal entity follow the installation while the page still caches.
export const revalidate = 3600;

const API_CURL = `curl -s ${SITE_ORIGIN}/api/stats/example.com?days=30 \\
  -H "Authorization: Bearer wmt_your_token"`;

const LOG_CURL = `curl -sS -X POST ${SITE_ORIGIN}/api/logs/example.com \\
  -H "Authorization: Bearer wmt_your_token" \\
  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log`;

const API_MCP = `{
  "mcpServers": {
    "agent-tracking": {
      "url": "${SITE_ORIGIN}/api/mcp",
      "headers": { "Authorization": "Bearer wmt_your_token" }
    }
  }
}`;

export const metadata: Metadata = {
  title: "Agent Tracking: what AI agents do on your site",
  description:
    "The snippet observes recognized referrals and supported browser WebMCP actions. Optional logs and site-server receipts add separate evidence. Measurement limits and data selection explained.",
  alternates: alternatesFor("/docs"),
};

const SNIPPET = snippetFor("example.com");

const REGISTER = `await document.modelContext.registerTool({
  name: "search_products",
  description: "Search the catalogue by free text.",
  inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  annotations: { readOnlyHint: true },
  execute: async ({ query }, { signal }) => { /* ... */ },
});
// agent.js observes supported registrations and calls while active:
// technical outcome, duration and safe error class; argument values are not stored.`;

const DECLARATIVE = `<form toolname="book_table" tooldescription="Book a table for a date and party size."
      action="/book" method="post">
  <input name="date" type="date" required>
  <input name="guests" type="number" min="1" required>
  <button type="submit" data-agent-goal="table_booked">Book</button>
</form>`;

const DOCS_LD = [
  { "@context": "https://schema.org", "@type": "WebPage", "@id": `${SITE_ORIGIN}/docs#webpage`, url: `${SITE_ORIGIN}/docs`, name: "Agent Tracking documentation", inLanguage: "en", isPartOf: { "@id": `${SITE_ORIGIN}/#site` }, about: { "@id": `${SITE_ORIGIN}/#app` } },
  { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` }, { "@type": "ListItem", position: 2, name: "Documentation", item: `${SITE_ORIGIN}/docs` }] },
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DOCS_LD) }} />
      <section className="shell section" style={{ paddingTop: 56, paddingBottom: 10 }}>
        <div className="pagehead">
          <p className="eyebrow">Agent Tracking</p>
          <h1>What AI agents do on your site</h1>
          <p className="dek" style={{ maxWidth: "62ch" }}>
            See recognized assistant referrals and supported browser WebMCP actions. Optional origin logs and site-server receipts add separate crawler and outcome evidence. The snippet sets no cookies.
          </p>
          <p style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            <Link className="btn" href="/login">Sign in or create an account</Link>
            <Link className="btn ghost" href="/demo">See the demo page</Link>
          </p>
        </div>
      </section>

      <section className="shell section">
        <h2>Install</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Add your site in the dashboard, then put this line on every page. The domain in <code>data-domain</code> has to be the one you registered; events for any other domain are dropped
          at the door.
        </p>
        <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{SNIPPET}</pre>
        <CopyButton text={SNIPPET} label="Copy" copiedLabel="Copied" />
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Under five kilobytes, plain JavaScript, no framework, no dependencies. It sends small batches to <code>/api/event</code> with <code>sendBeacon</code>, so a click that leaves
          the page still lands. The script has no integrity hash on purpose: it is updated in place when a new agent appears in the list below.
        </p>
      </section>

      <section className="shell section">
        <h2>Three layers</h2>
        <div className="grid3">
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">A. AI referrals</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              A visitor arrives from an assistant: the referrer is matched against a maintained list of assistant hosts, plus <code>utm_source</code> patterns. Recorded as the assistant
              and the landing path.
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">B. AI fetches</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              An assistant loads a page and runs its scripts: the user agent of the request that carries the beacon is matched against the same list. The matching is done on our server
              from the request headers, not in the snippet, so the list stays in one versioned place and the snippet stays small.
            </p>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <p className="smallcaps">C. WebMCP tool calls</p>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              The snippet wraps supported <code>document.modelContext</code> and legacy <code>navigator.modelContext</code> calls while it is active. It records technical outcomes, duration and safe error classes. Declarative forms produce submit attempts. Remote MCP calls require the separate server adapter.
            </p>
          </div>
        </div>
        <div className="callout hot" style={{ marginTop: 24 }}>
          <span className="tag">What this cannot see</span>
          <p style={{ marginBottom: 0 }}>
            A crawler that does not run JavaScript never executes the snippet. GPTBot, ClaudeBot and their kind mostly fetch raw HTML, so they appear here only when they render the page.
            Counting them needs the server log. For {SITE_HOST} itself the collector runs every quarter hour. A fetch burst means at least three distinct relevant paths close together in one import batch; it does not reveal a question or intent. For your site, upload an append-only full log on the settings page or use a collector with stable record identities. Where a vendor publishes address ranges, a claimed agent is checked against them. Missing or stale range data and mismatches stay separate from confirmed counts.
          </p>
        </div>
      </section>

      <section className="shell section">
        <h2>Tools and goals</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>Nothing to change in how you register tools. Register them as the specification says and the snippet sees them:</p>
        <pre className="code">{REGISTER}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Declarative tools are forms with a <code>toolname</code>. Add <code>data-agent-goal</code> to mark a browser goal attempt. A confirmed inquiry or booking needs a separate server receipt:
        </p>
        <pre className="code">{DECLARATIVE}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          If you publish a manifest at <code>/.well-known/webmcp</code>, the snippet hashes it once per visit, on the page the visit enters through. The dashboard shows when it last changed; Pro accounts can be
          alerted.
        </p>
      </section>

      <section className="shell section">
        <h2>What is recorded, and what is not</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Never recorded</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Page path, without query string</td>
                <td>Query strings, fragments, form values</td>
              </tr>
              <tr>
                <td>Referrer host and utm_source, when they name an assistant</td>
                <td>Full referrer URLs</td>
              </tr>
              <tr>
                <td>Observed tool name, duration, technical outcome and sanitized error class</td>
                <td>Input values, output values</td>
              </tr>
              <tr>
                <td>A session id: daily random salt, your domain, a coarse browser class and the address, hashed</td>
                <td>The address itself, cookies, storage, fingerprints, any durable identifier</td>
              </tr>
              <tr>
                <td>Recognized source claim and evidence status (list version {SOURCES_VERSION})</td>
                <td>Full user agent strings</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Raw events are kept for {RAW_RETENTION_DAYS} days and then deleted; daily totals are kept for as long as the site exists. Everything is stored on our own server in
          Germany. Removing a site deletes all of it. Our <Link href="/privacy">privacy notice</Link> has the formal version, and the <Link href="/dpa">data processing agreement</Link> is concluded when you add a site.
        </p>
      </section>

      <section className="shell section">
        <h2>Plans</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          During the pilot every account is on Free, and paid plans are not open yet. Need more while the pilot runs? Write to {CONTACT_EMAIL} and we switch your account by
          hand. The <Link href="/#plans">plans section</Link> has the terms of the pilot. Or run the whole thing yourself: the <a href={GITHUB_URL} rel="noopener">source is on GitHub</a> under AGPL-3.0, with a docker compose file.
        </p>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Sites</th>
                <th>Agent events per month</th>
                <th>History</th>
                <th>Extras</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(PLANS).map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.domains === Infinity ? "unlimited" : p.domains}</td>
                  <td>{p.eventsPerMonth.toLocaleString("en-GB")}</td>
                  <td>{p.windowDays} days</td>
                  <td>{[p.manifestAlerts ? "manifest change alerts" : null, p.whiteLabelBadge ? "white-label badge" : null].filter(Boolean).join(", ") || "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>Prices are shown at checkout in the dashboard. Free needs no card.</p>
      </section>

      <section className="shell section" id="api">
        <h2>Your numbers, in your own tools</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Aggregate site statistics are available as JSON and through an MCP read tool, so authorized scripts and agents can read them. Create the token on a
          site&apos;s settings page; it is shown once and belongs to the account, so it reads owned and explicitly shared sites. Read-only, aggregate data; no raw events.
        </p>
        <pre className="code">{API_CURL}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          The same token sends your server log. Append-only full snapshots can be retried; stable source, generation and record headers are required for rotated or overlapping chunks. Previously accepted positions are skipped, so nothing is counted
          twice:
        </p>
        <pre className="code">{LOG_CURL}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          <code>GET /api/stats</code> with the same header lists the sites the token can read. <code>days</code> is capped by the plan&apos;s history. The answer carries totals,
          the previous period for trends, the day series, the agents with share and trend, the tools with success rate and average duration, and the busiest pages.
        </p>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Over MCP, add our server with the token as a header and ask in words. Claude Desktop, Cursor and most clients take a configuration like this:
        </p>
        <pre className="code">{API_MCP}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Then: &ldquo;Which agents read example.com this week?&rdquo; The client calls <code>get_agent_stats</code> and gets the same JSON. A client that cannot set headers can pass
          the token in the tool&apos;s <code>token</code> argument instead.
        </p>
      </section>

      <section className="shell section" id="server-outcomes">
        <h2>Confirm inquiries and bookings from your server</h2>
        <p className="dek">Create separate site write credentials for outcomes and remote MCP tool calls in the site settings. Keep them on your server. After your application successfully saves an inquiry, POST a stable receipt to <code>/api/outcomes/example.com</code> with <code>Authorization: Bearer atw_...</code>. The account&apos;s stats token cannot write here.</p>
        <pre className="code">{`{"receiptId":"receipt_1234567890123","kind":"inquiry_created","status":"confirmed","occurredAt":${Date.UTC(2026, 8, 25, 12)},"taskId":"task_1234567890123456"}`}</pre>
        <p className="dek">Use a new receipt ID per actual inquiry and retry the same ID after network failure. A repeated receipt returns <code>duplicate</code>; a changed payload for the same ID returns 409. Do not send contact, payment or order content. Optional task and invocation IDs link observations without proving the actor.</p>
        <p className="dek">For external MCP servers, send a separate credential to <code>/api/server-tools/example.com</code> with an invocation ID, optional task ID, tool name, time, technical outcome and actor kind. An agent actor is reported by your server, not independently verified. The browser snippet does not observe every remote MCP call. The runnable TypeScript example is in <code>examples/inquiry-app</code> in the repository.</p>
      </section>

      <section className="shell section" id="private-workflow">
        <h2>Private task checks, fixes and client reports</h2>
        <p className="dek">The public stats page shows selected 30-day aggregates. Sign in to a site you own or have been invited to read for source status and the protected workflow. Owners can run one deterministic Chrome inquiry check against a <code>test.</code> or <code>staging.</code> host. Its synthetic input and result are kept separate from production counters; a third-party model-agent test is not configured without an adapter.</p>
        <p className="dek">A documented correction links a failed run and a later run of the same task with version IDs, sample sizes and unknown outcomes. Findings can reference versioned diagnostic recipes, but recipes are suggestions until a real retest confirms the specific case. The printable site report and JSON export show coverage, findings, corrections, retests and open points.</p>
        <p className="dek">Owners can create a seven-day, email-bound invitation link for a reader; the product does not send the invitation mail. Readers can access only their granted site, and revoked access stops private report and export access. Public stats links do not expose internal findings, task runs or server receipts. Read the <a href={`${GITHUB_URL}/blob/main/docs/task-tests.md`}>task-check contract</a> and <a href={`${GITHUB_URL}/blob/main/docs/agency-workflow.md`}>agency workflow</a> in the open-source repository.</p>
      </section>

      <section className="shell section">
        <h2>The agents on the list</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>
          Version {SOURCES_VERSION}. Referrers: {sources.referrers.map((r) => r.label).join(", ")}. User agents:{" "}
          {sources.agents.map((a) => a.label).join(", ")}. Missing one? Write to {CONTACT_EMAIL}, or open a pull request against <code>lib/tracking/ai-sources.json</code>.
        </p>
      </section>
    </>
  );
}
