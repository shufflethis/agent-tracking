import { clientIp, take } from "@/lib/ratelimit";
import { bearerFrom } from "./api-token";
import { normalizeDomain } from "./classify";
import { BodyLimitError, readLimitedBody } from "./request-body";
import { parseServerOutcome, parseServerToolCall, recordServerOutcome, recordServerToolCall, validSiteWriteToken, type WritePurpose } from "./server-ingest";

const problem = (detail: string, status: number) => Response.json({ ok: false, detail }, { status });

export async function ingestServerRequest(request: Request, params: Promise<{ domain: string }>, purpose: WritePurpose): Promise<Response> {
  if (!take(clientIp(request.headers), "requests").ok) return problem("Too many requests.", 429);
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!domain || !validSiteWriteToken(domain, purpose, bearerFrom(request.headers))) return problem("Invalid site write credential.", 401);
  let body: unknown;
  try {
    const bytes = await readLimitedBody(request, 16 * 1024);
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) { return problem(error instanceof BodyLimitError ? "Body too large." : "Invalid JSON.", error instanceof BodyLimitError ? 413 : 400); }
  const parsed = purpose === "outcome" ? parseServerOutcome(body) : parseServerToolCall(body);
  if (!parsed) return problem("Invalid fields. Send only the documented receipt fields; no contact or order data.", 422);
  const result = purpose === "outcome" ? recordServerOutcome(domain, parsed as NonNullable<ReturnType<typeof parseServerOutcome>>) : recordServerToolCall(domain, parsed as NonNullable<ReturnType<typeof parseServerToolCall>>);
  if (result === "conflict") return problem("Identifier already exists with different content.", 409);
  return Response.json({ ok: true, result }, { status: result === "created" ? 201 : 200 });
}
