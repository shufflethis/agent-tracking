import { gunzipSync } from "node:zlib";
import { clientIp, take } from "@/lib/ratelimit";
import { accountForToken, bearerFrom } from "@/lib/tracking/api-token";
import { currentAccount } from "@/lib/tracking/auth";
import { loadRanges } from "@/lib/tracking/bot-ranges";
import { normalizeDomain } from "@/lib/tracking/classify";
import { getSite, recordBursts, recordLogFetches, setLogSource } from "@/lib/tracking/db";
import { importLines } from "@/lib/tracking/log-import";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/logs/example.com: a server log in, counters out.
 *
 * The body is the access log as text (nginx or Apache "combined"), plain or
 * gzipped, from the dashboard's upload or from a cron on the customer's
 * server with the API token. Whole files may be re-sent: lines at or before
 * the newest line already imported are skipped, so a daily "send the file"
 * needs no bookkeeping on the customer's side.
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
    bytes = Buffer.from(await request.arrayBuffer());
  } catch {
    return problem("The body could not be read.");
  }
  if (bytes.length > MAX_BYTES) return problem(`The body is over ${MAX_BYTES / 1024 / 1024} MB. Send fewer days at a time.`, 413);
  if (bytes.length === 0) return problem("The body is empty.");
  if (bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]) {
    try {
      bytes = gunzipSync(bytes, { maxOutputLength: MAX_BYTES * 4 });
    } catch {
      return problem("The gzip body could not be decompressed.");
    }
  }
  const text = bytes.toString("utf8");
  const lines = text.split("\n");

  const result = importLines(lines, { ranges: loadRanges(), since: site.log_last_t });
  recordLogFetches(site.domain, result.fetches, result.unverified, site.owner);
  recordBursts(site.domain, result.bursts);
  setLogSource(site.domain, Date.now(), result.lastT);

  return Response.json({
    ok: true,
    scanned: result.scanned,
    skipped: result.skipped,
    fetches: result.fetches.length,
    unverified: result.unverified.length,
    bursts: result.bursts.length,
    newestLine: result.lastT ? new Date(result.lastT).toISOString() : null,
  });
}
