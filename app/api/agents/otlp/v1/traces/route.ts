import { clientIp, take } from "@/lib/ratelimit";
import { bearerFrom } from "@/lib/tracking/api-token";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";
import { agentTokenOwner } from "@/lib/agents/tokens";
import { parseOtlp, recordSpans } from "@/lib/agents/otlp";
export const runtime = "nodejs";
const problem = (message: string, status: number) => Response.json({ code: status === 401 ? 16 : status === 429 || status === 413 ? 8 : status === 415 ? 12 : 3, message }, { status, ...(status === 429 ? { headers: { "Retry-After": "60" } } : {}) });
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "ingest").ok) return problem("Rate limited", 429);
  const credential = agentTokenOwner(bearerFrom(request.headers));
  if (!credential) return problem("Invalid agent token", 401);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return problem("Use OTLP/HTTP JSON (http/json). Protobuf and gRPC are not supported.", 415);
  if (request.headers.get("content-encoding") && request.headers.get("content-encoding") !== "identity") return problem("Compression is not supported; send uncompressed JSON", 415);
  let body: unknown;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 512 * 1024))); }
  catch (e) { return problem(e instanceof BodyLimitError ? "Body too large" : "Invalid JSON", e instanceof BodyLimitError ? 413 : 400); }
  const parsed = parseOtlp(body, credential.owner);
  if (typeof parsed === "string") return problem(parsed === "too_large" ? "Maximum 100 spans per batch" : "Invalid OTLP trace request", parsed === "too_large" ? 413 : 400);
  const result = recordSpans(credential.owner, parsed.spans);
  if (result.quota) return problem("Monthly telemetry quota reached", 429);
  return Response.json(parsed.rejected ? { partialSuccess: { rejectedSpans: String(parsed.rejected), errorMessage: "Invalid span IDs, timestamps or status; other spans accepted" } } : {});
}
