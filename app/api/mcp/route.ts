import { bearerFrom, accountForToken } from "@/lib/tracking/api-token";
import { getSite } from "@/lib/tracking/db";
import { clampDays, statsFor } from "@/lib/tracking/stats-api";
import { clientIp, take } from "@/lib/ratelimit";
import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";

export const runtime = "nodejs";

/**
 * A minimal MCP server with one tool, so an agent can read a site's numbers
 * with the same token the stats API takes.
 *
 * Streamable HTTP transport, JSON responses only: no sessions, no SSE, no
 * resources. initialize, ping, tools/list and tools/call are all a client
 * needs to call get_agent_stats, and everything else answers "method not
 * found" honestly. The token travels as a bearer header or as the `token`
 * argument, for clients that cannot set headers.
 */

const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const TOOL = {
  name: "get_agent_stats",
  description:
    "Daily agent statistics for a site tracked on " +
    SITE_HOST +
    ": AI referrals, AI fetches, WebMCP tool calls and conversions per day, per agent, per tool and per page, for the last N days. Needs the account's API token (bearer header or the token argument).",
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

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const result = (id: Rpc["id"], value: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result: value });
const failure = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export async function GET() {
  return json({ name: SITE_HOST, endpoint: `${SITE_ORIGIN}/api/mcp`, transport: "streamable-http", tools: [TOOL.name] });
}

export async function POST(request: Request) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return json(failure(null, -32000, "Too many requests."), 429);

  let msg: Rpc;
  try {
    msg = (await request.json()) as Rpc;
  } catch {
    return json(failure(null, -32700, "Parse error."), 400);
  }
  if (Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return json(failure(null, -32600, "Invalid request."), 400);

  // Notifications carry no id and get no body.
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
      return json(result(msg.id, { tools: [TOOL] }));
    case "tools/call": {
      const name = msg.params?.name;
      if (name !== TOOL.name) return json(failure(msg.id, -32602, `Unknown tool: ${String(name)}`));
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const text = await call(args, request.headers);
      return json(result(msg.id, { content: [{ type: "text", text: text.text }], isError: text.isError }));
    }
    default:
      return json(failure(msg.id, -32601, `Method not found: ${msg.method}`));
  }
}

async function call(args: Record<string, unknown>, headers: Headers): Promise<{ text: string; isError: boolean }> {
  const token = bearerFrom(headers) ?? (typeof args.token === "string" ? args.token : null);
  const account = token ? accountForToken(token) : null;
  if (!account) return { text: "No valid API token. Create one on the site's settings page and send it as a bearer header or as the token argument.", isError: true };
  const domain = String(args.domain ?? "").trim().toLowerCase();
  const site = getSite(domain);
  if (!site || site.owner !== account.email) return { text: `No site ${domain || "(empty)"} on this account.`, isError: true };
  const days = clampDays(args.days ?? 30, account);
  return { text: JSON.stringify(statsFor(site.domain, account, days), null, 2), isError: false };
}
