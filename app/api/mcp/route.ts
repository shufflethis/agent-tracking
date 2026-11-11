import { fleetSummaryFor } from "@/lib/agents/fleet-api";
import { bearerFrom, accountForToken } from "@/lib/tracking/api-token";
import { getSite } from "@/lib/tracking/db";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { clampDays, statsFor } from "@/lib/tracking/stats-api";
import { clientIp, take } from "@/lib/ratelimit";
import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { canReadSite } from "@/lib/tracking/site-access";

export const runtime = "nodejs";

/**
 * Minimal MCP server (streamable HTTP, JSON responses only) exposing two
 * read-only tools with the same account API token (wmt_...):
 *   - get_fleet_status: health, recent runs and signals of your own agents
 *   - get_agent_stats: daily AI referral, fetch and tool statistics of a site
 */

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const STATS_TOOL = {
  name: "get_agent_stats",
  description:
    "Daily agent statistics for a site tracked on " +
    SITE_HOST +
    ": AI referrals, AI fetches, observed WebMCP tool calls and unverified legacy goal signals per day, per source, per tool and per page, for the last N days. The JSON includes reporting definitions. Needs the account's API token (bearer header or the token argument).",
  inputSchema: {
    type: "object",
    properties: {
      domain: { type: "string", description: "The tracked site, bare host, for example example.com." },
      days: { type: "integer", minimum: 1, maximum: 365, default: 30, description: "How many days back, up to the plan's window." },
      token: { type: "string", description: "API token from the dashboard's settings page, if not sent as a bearer header." },
    },
    required: ["domain"],
  },
};

const FLEET_TOOL = {
  name: "get_fleet_status",
  description:
    "Read-only status of your own monitored AI agents and cron jobs on " +
    SITE_HOST +
    ": health counts (problem, running, ok, idle), each agent's latest run (exit code, turns, tool errors, suspected stuck or missing runs, task checks) and recent Pro signals (configuration changes, first-time tools, suspected runaway loops). Needs the account's API token (bearer header or the token argument).",
  inputSchema: {
    type: "object",
    properties: {
      problemsOnly: { type: "boolean", default: false, description: "When true, return only agents currently marked as problem or running." },
      token: { type: "string", description: "API token from the dashboard's settings page, if not sent as a bearer header." },
    },
  },
};

const TOOLS = [FLEET_TOOL, STATS_TOOL];

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const result = (id: Rpc["id"], value: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result: value });
const failure = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export async function GET() {
  return json({ name: SITE_HOST, endpoint: `${SITE_ORIGIN}/api/mcp`, transport: "streamable-http", tools: TOOLS.map((t) => t.name) });
}

export async function POST(request: Request) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return json(failure(null, -32000, "Too many requests."), 429);

  let msg: Rpc;
  try {
    const bytes = await readLimitedBody(request, 32 * 1024);
    msg = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as Rpc;
  } catch (err) {
    if (err instanceof BodyLimitError) return json(failure(null, -32600, "Request body too large."), 413);
    return json(failure(null, -32700, "Parse error."), 400);
  }
  if (Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return json(failure(null, -32600, "Invalid request."), 400);

  if (msg.id === undefined && msg.method.startsWith("notifications/")) return new Response(null, { status: 202 });

  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      const version = PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0];
      return json(result(msg.id, { protocolVersion: version, capabilities: { tools: {} }, serverInfo: { name: SITE_HOST, version: "1" } }));
    }
    case "ping":
      return json(result(msg.id, {}));
    case "tools/list":
      return json(result(msg.id, { tools: TOOLS }));
    case "tools/call": {
      const name = msg.params?.name;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      if (name === STATS_TOOL.name) {
        const out = await callStats(args, request.headers);
        return json(result(msg.id, { content: [{ type: "text", text: out.text }], isError: out.isError }));
      }
      if (name === FLEET_TOOL.name) {
        const out = callFleet(args, request.headers);
        return json(result(msg.id, { content: [{ type: "text", text: out.text }], isError: out.isError }));
      }
      return json(failure(msg.id, -32602, `Unknown tool: ${String(name)}`));
    }
    default:
      return json(failure(msg.id, -32601, `Method not found: ${msg.method}`));
  }
}

async function callStats(args: Record<string, unknown>, headers: Headers): Promise<{ text: string; isError: boolean }> {
  const token = bearerFrom(headers) ?? (typeof args.token === "string" ? args.token : null);
  const account = token ? accountForToken(token) : null;
  if (!account) return { text: "No valid API token. Create one under Settings and send it as a bearer header or as the token argument.", isError: true };
  const domain = String(args.domain ?? "").trim().toLowerCase();
  const site = getSite(domain);
  if (!site || !canReadSite(site.domain, account.email)) return { text: `No site ${domain || "(empty)"} on this account.`, isError: true };
  const days = clampDays(args.days ?? 30, account);
  return { text: JSON.stringify(statsFor(site.domain, account, days), null, 2), isError: false };
}

function callFleet(args: Record<string, unknown>, headers: Headers): { text: string; isError: boolean } {
  const token = bearerFrom(headers) ?? (typeof args.token === "string" ? args.token : null);
  const account = token ? accountForToken(token) : null;
  if (!account) return { text: "No valid API token. Create one under Settings and send it as a bearer header or as the token argument.", isError: true };
  const summary = fleetSummaryFor(account);
  const filtered = args.problemsOnly === true
    ? { ...summary, agents: summary.agents.filter((a) => a.health === "problem" || a.health === "running") }
    : summary;
  return { text: JSON.stringify(filtered, null, 2), isError: false };
}
