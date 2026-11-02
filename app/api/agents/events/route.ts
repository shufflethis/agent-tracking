import { clientIp, take } from "@/lib/ratelimit";
import { bearerFrom } from "@/lib/tracking/api-token";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { parseAgentBatch, recordAgentEvents } from "@/lib/agents/ingest";
import { agentTokenOwner } from "@/lib/agents/tokens";

export const runtime = "nodejs";

const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });

/** Batches from the agenttracking CLI. Only the documented fields are kept; see lib/agents/ingest.ts. */
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "ingest").ok) return problem("Too many requests.", 429);
  const credential = agentTokenOwner(bearerFrom(request.headers));
  if (!credential) return problem("Invalid agent token.", 401);
  let body: unknown;
  try {
    const bytes = await readLimitedBody(request, 64 * 1024);
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    return error instanceof BodyLimitError ? problem("Body too large.", 413) : problem("Invalid JSON.", 400);
  }
  const parsed = parseAgentBatch(body);
  if (!parsed) return problem("Send {events: [...]} with at most 100 documented events.", 422);
  const result = recordAgentEvents(credential.owner, parsed.events);
  if (result.rejected === "quota") return problem("Monthly agent event limit reached (50,000 during beta).", 429);
  if (result.rejected === "agent_limit" && result.accepted === 0) return problem("Agent limit reached (20 during beta).", 429);
  return Response.json({ ok: true, accepted: result.accepted, duplicates: result.duplicates, dropped: parsed.dropped, agentLimit: result.rejected === "agent_limit" });
}
