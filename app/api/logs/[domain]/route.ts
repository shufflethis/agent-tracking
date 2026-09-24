import { gunzipSync } from "node:zlib";
import { clientIp, take } from "@/lib/ratelimit";
import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { loadRanges } from "@/lib/tracking/bot-ranges";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite, ingestLogSourceBatch } from "@/lib/tracking/db";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/logs/example.com: a server log in, counters out.
 *
 * The body is the access log as text (nginx or Apache "combined"), plain or
 * gzipped, from the dashboard or an authenticated collector. A source,
 * generation and record position identify each request across retries.
 *
 * What is kept from a line is the day, the agent and the page path. The
 * address is used inside the import to group a burst and to check the agent
 * against its vendor's published ranges, and is gone when the request ends.
 */

const MAX_BYTES = 64 * 1024 * 1024;
const GZIP_MAGIC = [0x1f, 0x8b];

const problem = (detail: string, status = 422) => Response.json({ ok: false, detail }, { status });

export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return problem("Too many requests. Try again shortly.", 429);

  const account = accountForToken(bearerFrom(request.headers)) ?? (await currentAccount());
  if (!account) return problem("Sign in, or send the account's API token as a Bearer token.", 401);
  const domain = normalizeDomain(decodeURIComponent((await params).domain));
  if (!domain) return problem("Not a hostname.");
  const site = getSite(domain);
  if (!site || site.owner !== account.email) return problem("No site with that domain on this account.", 404);

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return problem(`The body is over ${MAX_BYTES / 1024 / 1024} MB. Send fewer days at a time.`, 413);
  let bytes: Buffer;
  try {
    bytes = Buffer.from(await readLimitedBody(request, MAX_BYTES));
  } catch (error) {
    if (error instanceof BodyLimitError) return problem(`The body is over ${MAX_BYTES / 1024 / 1024} MB. Send fewer days at a time.`, 413);
    return problem("The body could not be read.");
  }
  if (bytes.length > MAX_BYTES) return problem(`The body is over ${MAX_BYTES / 1024 / 1024} MB. Send fewer days at a time.`, 413);
  if (bytes.length === 0) return problem("The body is empty.");
  if (bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]) {
    try {
      bytes = gunzipSync(bytes, { maxOutputLength: MAX_BYTES });
    } catch {
      return problem("The gzip body could not be decompressed.");
    }
  }
  const text = bytes.toString("utf8");
  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
  const source = request.headers.get("x-log-source-id");
  const generation = request.headers.get("x-log-generation");
  const startRaw = request.headers.get("x-log-start-record");
  if ([source, generation, startRaw].some(Boolean) && ![source, generation, startRaw].every(Boolean)) return problem("Provide X-Log-Source-Id, X-Log-Generation and X-Log-Start-Record together.");
  const start = startRaw === null ? 0 : Number(startRaw);
  if (!Number.isSafeInteger(start) || start < 0 || start + lines.length > Number.MAX_SAFE_INTEGER) return problem("X-Log-Start-Record must be a non-negative safe integer.");
  let imported;
  try {
    imported = ingestLogSourceBatch(site.domain, site.owner, source ?? "legacy-upload", generation ?? "append-only", lines.map((line, i) => ({ id: String(start + i), line })), loadRanges());
  } catch (error) {
    return problem(error instanceof Error ? error.message : "Log import failed.", 409);
  }
  const { result, duplicates } = imported;

  return Response.json({
    ok: true,
    scanned: result.scanned,
    skipped: duplicates,
    duplicates,
    fetches: result.fetches.length,
    unverified: result.unverified.length,
    attempts: result.attempts.length,
    bursts: result.bursts.length,
    newestLine: result.lastT ? new Date(result.lastT).toISOString() : null,
  });
}
