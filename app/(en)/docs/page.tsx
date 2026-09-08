import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { alternatesFor } from "@/lib/i18n";
import { SOURCES_VERSION } from "@/lib/tracking/classify";
import { PLANS, RAW_RETENTION_DAYS } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import sources from "@/lib/tracking/ai-sources.json";
import { CHECK_ORIGIN, CONTACT_EMAIL, GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

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
    "One snippet under five kilobytes records AI referrals, AI fetches, WebMCP tool calls and agent conversions on your site. No cookies, no fingerprints, no personal data, hosted in Germany, open source. How it works, what it records, what it refuses to.",
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
// agent.js wraps registerTool and provideContext before this runs:
// the registration, every call, its duration, success or failure and
// the argument key names are recorded. Values never are.`;

const DECLARATIVE = `<form toolname="book_table" tooldescription="Book a table for a date and party size."
      action="/book" method="post">
  <input name="date" type="date" required>
  <input name="guests" type="number" min="1" required>
  <button type="submit" data-agent-goal="table_booked">Book</button>
</form>`;

export default function Page() {
  return (
    <>
      <section className="shell section" style={{ paddingTop: 56, paddingBottom: 10 }}>
        <div className="pagehead">
          <p className="eyebrow">Agent Tracking</p>
          <h1>What AI agents do on your site</h1>
          <p className="dek" style={{ maxWidth: "62ch" }}>
            Your analytics counts people. This counts agents: who sends them, which pages they fetch, which of your WebMCP tools they call, and
            whether they finish. One snippet, one dashboard, no cookies, no personal data, hosted in Germany.
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
              The part nobody else measures. The snippet wraps <code>document.modelContext</code> (and the deprecated <code>navigator.modelContext</code>), so every registration and
              every call is recorded: tool name, duration, success or failure, error class, and the names of the input keys. Declarative tools on forms are caught on submit.
            </p>
          </div>
        </div>
        <div className="callout hot" style={{ marginTop: 24 }}>
          <span className="tag">What this cannot see</span>
          <p style={{ marginBottom: 0 }}>
            A crawler that does not run JavaScript never executes the snippet. GPTBot, ClaudeBot and their kind mostly fetch raw HTML, so they appear here only when they render the page.
            Counting them needs the server log. For {SITE_HOST} itself that import runs every quarter hour and feeds the same dashboard, including fetch bursts (one agent, several pages, a few seconds: what a query fan-out looks like from your side). For your site, upload the log on the settings page or let a cron send it daily with the API token; nginx or Apache combined format, plain or gzipped, whole files are fine. Where the vendor publishes address ranges (OpenAI, Perplexity, Microsoft, Google, Apple) each line is checked against them, and a claimed agent from elsewhere is shown as unverified rather than counted.
          </p>
        </div>
      </section>

      <section className="shell section">
        <h2>Tools and goals</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>Nothing to change in how you register tools. Register them as the specification says and the snippet sees them:</p>
        <pre className="code">{REGISTER}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          Declarative tools are forms with a <code>toolname</code>. Add <code>data-agent-goal</code> to any element to mark a conversion, such as an order placed or a booking confirmed:
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
                <td>Tool name, duration, success, error class, input key names</td>
                <td>Input values, output values</td>
              </tr>
              <tr>
                <td>A session id: daily random salt, your domain, a coarse browser class and the address, hashed</td>
                <td>The address itself, cookies, storage, fingerprints, any durable identifier</td>
              </tr>
              <tr>
                <td>Which AI agent, from a maintained list (version {SOURCES_VERSION})</td>
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
          Everything the dashboard shows is available as JSON and as an MCP tool, so your own scripts, notebooks and agents can read it. Create the token on a
          site&apos;s settings page; it is shown once and belongs to the account, so it reads every site on it. Read-only, daily totals only, no raw events.
        </p>
        <pre className="code">{API_CURL}</pre>
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 18 }}>
          The same token sends your server log. Whole files are fine, daily from a cron; lines at or before the newest line already imported are skipped, so nothing is counted
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
