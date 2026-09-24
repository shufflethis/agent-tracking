# Agent Tracking

[Website](https://agenttracking.co) · [Documentation](https://agenttracking.co/docs) · [Demo](https://agenttracking.co/demo) · [Deutsch](https://agenttracking.co/de)

Agent Tracking combines **recognized assistant referrals**, **browser-visible WebMCP activity**, **optional origin-log evidence for crawlers**, and **site-server receipts for completed inquiries or bookings**. Each measurement keeps its source and evidence status. A browser goal marker is an attempt; it does not confirm a business result or an agent actor.

```html
<script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>
```

The snippet sets no cookies or local storage entries. It does not store raw network addresses or tool argument values. Daily salted session hashes and other telemetry still warrant a privacy assessment for each deployment; see the [documentation](https://agenttracking.co/docs) and [privacy notice](https://agenttracking.co/privacy).

## Measurement sources

| Source | What it can support | What it cannot prove |
| --- | --- | --- |
| Assistant referrer and exact `utm_source` rules | Recognized source and landing path | A citation, model answer or agent identity |
| Browser snippet | Supported WebMCP calls, technical outcomes, form and goal attempts | Every external MCP call or a completed business outcome |
| Origin server log | HTTP access attempts; successful HTML fetches when status, method, resource and fresh published IP range match | What a crawler understood, a user query or intent |
| Site-server integration | A stable receipt for a successfully created inquiry or booking, or a remote MCP invocation | Independent verification of a site-reported agent actor |
| Deterministic Chrome task check | A reproducible test-only inquiry run with steps, versions and result | A third-party model-agent run or production conversion |

Browser and server tool-call sources can overlap. They are displayed separately; summing them does not yield distinct agents or invocations. Historical browser goal signals remain explicitly unconfirmed.

## Confirm a real inquiry

Create a site-bound, revocable **outcome** write credential in site settings. After your backend durably creates an inquiry, send a stable receipt to `POST /api/outcomes/{domain}`. Retry with the same receipt ID after a network failure; duplicates count once. A separate **tool telemetry** credential sends remote MCP invocations to `POST /api/server-tools/{domain}`. The account's Stats token is read-only for these endpoints. Keep write credentials on your server, never in the browser. See the [local TypeScript example](examples/inquiry-app/README.md).

Task and invocation IDs can link a browser observation to a server receipt within one site. A browser-provided ID alone never promotes an unknown actor to a confirmed agent. Agent attribution from a remote tool report is labeled as the site server's claim.

## Test, fix and report

Site owners can run a deterministic inquiry check against a `test.` or `staging.` subdomain. The check uses fixed synthetic values, a twelve-second limit and explicit success marker. It is separate from production counters. Model-driven agent tests are **not configured** without a real provider adapter. A documented fix can link a failed run to a new run of the same task with version IDs, conditions, sample sizes and unknown share; this does not establish causal revenue gain.

Site owners can create seven-day, email-bound read links without sending invitation mail. A reader sees only the granted site and its internal report. Findings link evidence, category, responsible person, correction and retest. The printable HTML report and protected JSON export show coverage, findings, retests and open points. Public stats pages do not expose internal findings. Generic diagnostic recipes are suggestions; only an actual site retest can confirm a specific case.

## API and MCP

The authenticated Stats API, CSV export and read-only MCP tool expose site summaries. A reader can access only explicitly shared sites. For details, see [API documentation](https://agenttracking.co/docs#api), [measurement contract](docs/measurement.md), [source classification](docs/source-classification.md), [task tests](docs/task-tests.md) and [agency workflow](docs/agency-workflow.md).

## Scope and limits

A missing or stale crawler range stays unverified. Legacy fetch counts are not silently upgraded. Fetch bursts mean at least three distinct relevant paths in one import batch; they reveal no prompt or intent. Browser-only traffic cannot identify every agent. The product does not record full referrer URLs, tool arguments or form values in its event schema. Deployment, additional scripts and legal requirements still need an individual privacy review.

## Installation

**Cloud, about a minute.** Sign in with an email address at [agenttracking.co](https://agenttracking.co), add your domain, paste the line above on every page, press verify. The first agent shows up in the dashboard when it arrives. Tools you register through `navigator.modelContext` are picked up automatically; declarative tools are forms with a `toolname`:

```html
<form toolname="book_table" tooldescription="Book a table for a date and party size." action="/book" method="post">
  <input name="date" type="date" required>
  <input name="guests" type="number" min="1" required>
  <button type="submit" data-agent-goal="table_booked">Book</button>
</form>
```

**Crawlers that do not run JavaScript** (most of them) come from your server log: upload an append-only full snapshot on the settings page, or use a collector with stable source, generation and record positions. Retried positions are skipped; late requests still count. Rotated or overlapping chunks require source metadata (see [log collector](docs/log-collector.md)).

```sh
curl -sS -X POST https://agenttracking.co/api/logs/example.com \
  -H "Authorization: Bearer wmt_your_token" \
  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log
```

Free during the pilot: 1 site, 10,000 agent events a month, 30 days of history, no card. Plain page views are never counted. Paid plans (more sites, a year of history, manifest alerts, white-label badge) open when the product has earned them; nothing about an account changes without 30 days' notice.

## Self-hosting

Requirements: Node 22.13 or later (for `node:sqlite`) or Docker, and a [Brevo](https://www.brevo.com) API key for sign-in mails. One process, one SQLite file, no other service.

```sh
git clone https://github.com/shufflethis/agent-tracking.git && cd agent-tracking
cp .env.example .env          # SITE_ORIGIN, UNLOCK_SECRET, BREVO_API_KEY, LEGAL_*
docker compose up -d          # app on 127.0.0.1:3000, data in ./data, cron service included
```

Put a TLS-terminating proxy (Caddy, nginx, Traefik) in front on the host you set as `SITE_ORIGIN`. Without Docker:

```sh
npm ci && cp .env.example .env.production && npm run build && npm start
# cron: npm run cron:nightly (daily), npm run cron:logs (every 15 min), npm run cron:digest (weekly)
```

Everything is configured through the environment; see [`.env.example`](.env.example). The ones that matter:

| Variable | What it does |
| --- | --- |
| `SITE_ORIGIN` | Where this installation answers. The snippet posts here; mails link here. |
| `UNLOCK_SECRET` | Signs sessions and sign-in links. 32 random bytes. |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL` | Sign-in links and digests. The sender must be verified in Brevo. |
| `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, ... | The entity on the imprint, privacy notice, terms and DPA. **These pages are templates. Set your own entity; once `LEGAL_NAME` is set, none of the cloud operator's details are used.** |
| `CHECK_ORIGIN` | The readiness score beside the numbers, from webmcp-tool.com. Empty disables it. |
| `LOG_IMPORT_SOURCES` | `path=domain` pairs for server logs on the same machine. |
| `TYPESAFE_API_KEY` | Enables the nightly triage of unplaced user agents (below). Empty means the tally still builds and nothing is sent. |
| `AGENT_TRIAGE_LIMIT` | How many unplaced strings one night may ask about. Default 40. |
| `STRIPE_*` | Only if you sell plans. Absent means every account is Free. |

Plan limits live in [`lib/tracking/plans.ts`](lib/tracking/plans.ts). `deploy/` holds the systemd unit, nginx vhost and crontab the cloud uses.

## Stats API and MCP server

Every number in the dashboard is available as JSON, read-only, daily totals only, with one token per account from the settings page:

```sh
curl -s "https://agenttracking.co/api/stats/example.com?days=30" -H "Authorization: Bearer wmt_your_token"
```

The answer carries totals, the previous period for trends, the day series, agents with share and trend and verification, tools with success rate and average duration, the busiest pages, and recent bursts. `GET /api/stats` lists the sites the token can read; `GET /api/export/{domain}` gives CSV.

The same data as an MCP tool, for the agents you already use:

```json
{ "mcpServers": { "agent-tracking": { "url": "https://agenttracking.co/api/mcp", "headers": { "Authorization": "Bearer wmt_your_token" } } } }
```

Then ask: "Which verified crawler fetches and observed tool failures did example.com have this week?" The client calls `get_agent_stats`. A client that cannot set headers passes the token as the tool's `token` argument.

## How it works

```
browser on your site ──agent.js (4.5 KB)──▶ POST /api/event ──▶ classify (referrer, UA, list v2026-09-08)
server log ──upload or cron──▶ POST /api/logs ──▶ verify against vendor IP ranges, detect bursts
                                                        │
                                            SQLite: raw events (90 days) + daily totals
                                                        │
                        dashboard · /api/stats · MCP get_agent_stats · weekly digest · CSV export
```

- `snippet/agent.src.js`: the tracker. Batches events, sends them with `sendBeacon`, wraps the model context API, watches forms and goals. Built to `public/agent.js`; a test keeps it under 5 KB.
- `lib/tracking/`: classification, storage (`node:sqlite`, aggregation at write time), the four views, the stats API, log import, crawler IP ranges, digest.
- `app/api/`: ingest, sign-in by magic link, sites, tokens, logs, stats, export, MCP, billing.
- `scripts/`: the nightly run (prune, refresh IP ranges, monthly re-score, manifest alerts, triage of unplaced user agents), log import, weekly digest, encrypted backup.

Classification is server-side and versioned in one file. Missing an agent? Open a pull request against [`lib/tracking/ai-sources.json`](lib/tracking/ai-sources.json) with a link to the vendor's documentation of the user agent or referrer. Contributions welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

### Finding the agents nobody has added yet

That list only works if somebody notices a new bot, and the log import used to
drop every user agent it could not place — a vendor could ship a fetcher, hit
your pages for a month, and the dashboard would report that the web went quiet.

So the import now keeps a tally of the strings it could not place, and the
nightly run asks a System One model (TypeSafe's Jev) two questions about each:
whether it is an AI agent at all, and which of the three kinds it is. The
answers land in `.data/agent-suggestions.json` as **proposed entries** for
`ai-sources.json`, busiest first, for a person to accept or ignore.

What that costs in privacy is bounded on purpose, and by code rather than by
intention:

- Only strings carrying an explicit bot marker are eligible — a name ending in
  `Bot` or `Crawler`, an HTTP library, or the `+https://…` a crawler uses to
  point at its own documentation. A browser's user agent contains none of these
  and is never sent. See `botShaped` in [`lib/tracking/agent-triage.ts`](lib/tracking/agent-triage.ts).
- Deduplicated, so a million fetches are one string, and nothing travels with
  it: no address, no path, no time, no site, no visitor.
- Nothing suggested is ever counted. `lib/tracking/bot-ranges.ts` refuses to
  count a vendor claim it cannot verify against published address ranges, and a
  probability is a weaker thing than a claim. Only what a person puts into
  `ai-sources.json` moves a number.
- Without `TYPESAFE_API_KEY` the tally still builds and nothing is sent, which
  is how a self-hosted installation runs until somebody decides otherwise.

## Development

```sh
npm ci
npm run snippet      # snippet/agent.src.js -> public/agent.js
npm test             # node:test via tsx, includes the size check
npm run typecheck
npm run dev
```

## History and licence

Agent Tracking began as a feature of [webmcp-tool.com](https://webmcp-tool.com), the Agent Readiness Score, and was split out in September 2026 so it can be open source and run anywhere. Sites that installed the snippet from the old host stay verified.

AGPL-3.0-only. Copyright (c) 2026 FINAL MASTER LLC and contributors. Running a modified version as a network service means offering its source to its users; the full text is in [LICENSE](LICENSE). The hosted service at agenttracking.co is governed by its [terms](https://agenttracking.co/terms).
