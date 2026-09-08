# Agent Tracking

Measure what AI agents do on your website. One line of script shows which AI assistants send visitors, which agents fetch your pages, which WebMCP tools they call and whether they finish. No cookies, no personal data, no third-party scripts.

Hosted at **[agenttracking.co](https://agenttracking.co)** (free during the pilot), or run it yourself. Free software under the [AGPL-3.0](LICENSE).

```html
<script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>
```

## What it records

- **AI referrals**: a visit from chatgpt.com, perplexity.ai, claude.ai and a dozen more, attributed from the referrer and `utm_source`.
- **AI fetches**: GPTBot, ClaudeBot, PerplexityBot, Google-Extended and the rest, matched against a [published, versioned list](lib/tracking/ai-sources.json). Crawlers that do not run JavaScript are counted from your server log, verified against the vendors' published address ranges, with fetch bursts (one agent, several pages, a few seconds).
- **WebMCP tool calls**: every tool registered through `navigator.modelContext` or `document.modelContext`, and every declarative `<form toolname>`: calls, duration, success rate, error classes, the tools nobody calls. Mark a goal with `data-agent-goal`.

Never recorded: network addresses, cookies, storage, fingerprints, query strings, input values. The session id is a daily-salted hash. Raw events are deleted after 90 days; daily totals stay. The [docs](https://agenttracking.co/docs) and the [DPA](https://agenttracking.co/dpa) say the same thing formally.

## Self-hosting

Requirements: Node 22.13 or later (for `node:sqlite`), or Docker. One process, one SQLite file, a mail sender for sign-in links.

```sh
git clone https://github.com/shufflethis/agent-tracking.git && cd agent-tracking
cp .env.example .env         # SITE_ORIGIN, UNLOCK_SECRET, BREVO_API_KEY, LEGAL_*
docker compose up -d         # app on 127.0.0.1:3000, data in ./data
```

Put a TLS-terminating proxy in front (Caddy, nginx, Traefik) on the host you set as `SITE_ORIGIN`. Without Docker:

```sh
npm ci && cp .env.example .env.production && npm run build && npm start
```

Cron for a bare install (the compose file has a `cron` service that does the same):

```
40 7 * * *   npm run cron:nightly   # prune, crawler ranges, monthly re-score, manifest alerts
*/15 * * * * npm run cron:logs      # server-log import (LOG_IMPORT_SOURCES)
50 7 * * 1   npm run cron:digest    # weekly digest mail
```

`deploy/` holds the systemd unit, nginx vhost and crontab the cloud installation uses.

### Environment

Everything is in [`.env.example`](.env.example). The ones that matter:

| Variable | What it does |
| --- | --- |
| `SITE_ORIGIN` | Where this installation answers. The snippet posts here; mails link here. |
| `UNLOCK_SECRET` | Signs sessions and sign-in links. 32 random bytes. |
| `BREVO_API_KEY`, `MAIL_FROM_EMAIL` | Sign-in links and digests go through [Brevo](https://www.brevo.com). The sender must be verified there. |
| `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_EMAIL`, ... | The entity on the imprint, privacy notice, terms and DPA. **The legal pages are templates driven by these variables. A self-hoster must fill in their own entity; the defaults name the cloud's operator, and publishing them for your own installation would be a false statement.** |
| `CHECK_ORIGIN` | The agent readiness check shown beside the numbers, from [webmcp-tool.com](https://webmcp-tool.com). Empty disables it. |
| `STRIPE_*` | Only once you sell plans. Absent means every account is Free. |
| `LOG_IMPORT_SOURCES` | `path=domain` pairs for server logs on the same machine. |

Plan limits are in [`lib/tracking/plans.ts`](lib/tracking/plans.ts); change them there for your own installation.

## Stats API and MCP

Every dashboard number is available as JSON and as an MCP tool, with a per-account token from the settings page:

```sh
curl -s https://agenttracking.co/api/stats/example.com?days=30 -H "Authorization: Bearer wmt_..."
```

MCP endpoint: `POST /api/mcp` (streamable HTTP), one tool `get_agent_stats`. Claude Desktop, Cursor and most clients take:

```json
{ "mcpServers": { "agent-tracking": { "url": "https://agenttracking.co/api/mcp", "headers": { "Authorization": "Bearer wmt_..." } } } }
```

## Development

```sh
npm ci
npm run snippet      # snippet/agent.src.js -> public/agent.js (must stay under 5 KB)
npm test             # node:test via tsx
npm run typecheck
npm run dev
```

Layout: `snippet/` the tracker, `lib/tracking/` ingest, classification, storage (`node:sqlite`), dashboard, stats API, log import, crawler ranges, digest; `app/api/` the routes; `app/(en)` and `app/(de)` the pages; `scripts/` the cron jobs; `components/` the dashboard and chrome.

Missing an agent? Open a pull request against `lib/tracking/ai-sources.json` with a source for the user agent or referrer.

## History

Agent Tracking began as a feature of [webmcp-tool.com](https://webmcp-tool.com), the agent readiness check, and was split out so it can be open source and run anywhere. Sites that installed the snippet from the old host stay verified.

## License

AGPL-3.0-only. Copyright (c) 2026 FINAL MASTER LLC and contributors. Running a modified version as a network service means offering its source to its users; the licence text is in [LICENSE](LICENSE).
