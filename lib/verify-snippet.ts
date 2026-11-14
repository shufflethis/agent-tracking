/**
 * Ownership by installation: is agent.js on the site's homepage with this
 * domain in data-domain?
 *
 * Whoever can put a script tag on the site is the site. It is also the one
 * check that matters for the product, since a site without the snippet has no
 * data to show.
 *
 * The homepage is rarely the final URL. A site with locales answers `/` with a
 * redirect to `/en`, and plenty of sites move the apex to `www`. So redirects
 * are followed — but only while they stay on this site, and every hop is put
 * through the private-host rule again. `assertPublicHost` cleared one host, not
 * wherever that host points, and `www.` can resolve to a different address than
 * the apex. A hop to a foreign host is not followed at all: that site is
 * registered under its own host.
 */

import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { createGunzip, createInflate } from "node:zlib";
import { assertPublicHost, resolvePublicHost } from "@/lib/public-host";
import { LEGACY_SNIPPET_HOSTS, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { sameSite } from "@/lib/tracking/classify";

export type SnippetResult = { ok: true } | { ok: false; detail: string };

/** How many same-site hops to follow before calling it a loop. */
const MAX_HOPS = 5;
const MAX_HTML_BYTES = 600_000;

type Options = {
  fetchImpl?: typeof fetch;
  assertHost?: (hostname: string) => Promise<void>;
};

async function readBoundedFetchBody(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const room = maxBytes - total;
      const slice = value.byteLength > room ? value.subarray(0, room) : value;
      chunks.push(slice);
      total += slice.byteLength;
      if (value.byteLength > room) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

function fetchPinnedHttps(
  target: URL,
  resolved: { address: string; family: number },
  userAgent: string,
  signal: AbortSignal,
  maxBytes: number,
): Promise<{ status: number; location: string | null; body: string }> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason ?? new Error("Timed out."));
    const port = target.port ? Number(target.port) : 443;
    const req = httpsRequest(
      {
        method: "GET",
        host: target.hostname,
        servername: isIP(target.hostname) ? undefined : target.hostname,
        port,
        path: `${target.pathname}${target.search}`,
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "accept-encoding": "gzip, deflate",
        },
        lookup: (_host, opts, cb) => {
          const all = typeof opts === "object" && opts !== null && "all" in opts && Boolean((opts as { all?: boolean }).all);
          if (all) (cb as (err: NodeJS.ErrnoException | null, addresses: { address: string; family: number }[]) => void)(null, [{ address: resolved.address, family: resolved.family }]);
          else (cb as (err: NodeJS.ErrnoException | null, address: string, family: number) => void)(null, resolved.address, resolved.family);
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const locHeader = res.headers.location;
        const location = Array.isArray(locHeader) ? locHeader[0] ?? null : locHeader ?? null;
        if (status >= 300 || status < 200) {
          res.resume();
          cleanup();
          resolve({ status, location, body: "" });
          return;
        }
        const encoding = (res.headers["content-encoding"] ?? "").toLowerCase();
        const stream = encoding === "gzip" || encoding === "x-gzip"
          ? res.pipe(createGunzip())
          : encoding === "deflate"
            ? res.pipe(createInflate())
            : res;
        const chunks: Buffer[] = [];
        let total = 0;
        let settled = false;
        const finish = (body: string) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve({ status, location, body });
        };
        stream.on("data", (chunk: Buffer) => {
          const room = maxBytes - total;
          if (room <= 0) {
            req.destroy();
            finish(Buffer.concat(chunks, total).toString("utf8"));
            return;
          }
          const slice = chunk.length > room ? chunk.subarray(0, room) : chunk;
          chunks.push(slice);
          total += slice.length;
          if (total >= maxBytes) {
            req.destroy();
            finish(Buffer.concat(chunks, total).toString("utf8"));
          }
        });
        stream.on("end", () => finish(Buffer.concat(chunks, total).toString("utf8")));
        stream.on("error", (err) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        });
      },
    );
    const onAbort = () => req.destroy(new Error("The homepage took too long to answer."));
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    signal.addEventListener("abort", onAbort, { once: true });
    req.on("error", (err) => {
      cleanup();
      reject(err);
    });
    req.end();
  });
}

/** Is the tag's src one of ours, so the site really loads our script? */
function servedByUs(tag: string): boolean {
  const m = tag.match(/src\s*=\s*["']([^"']+)["']/i);
  if (!m) return false;
  let host: string;
  try {
    host = new URL(m[1], SITE_ORIGIN).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === SITE_HOST || LEGACY_SNIPPET_HOSTS.includes(host);
}

export async function snippetInstalled(domain: string, options: Options = {}): Promise<SnippetResult> {
  const doFetch = options.fetchImpl ?? fetch;
  const checkHost = options.assertHost ?? assertPublicHost;

  let url = `https://${domain}/`;
  let html = "";
  // One budget for the whole chain, not per hop: five hops at their own timeout
  // each would outlast the proxy in front of this route, and the caller would
  // see a gateway error instead of a verdict.
  const deadline = AbortSignal.timeout(15_000);

  for (let hop = 0; ; hop++) {
    const target = new URL(url);
    const userAgent = `Mozilla/5.0 (compatible; ${SITE_HOST} verify; +${SITE_ORIGIN}/docs)`;

    let status: number;
    let location: string | null = null;
    if (!options.fetchImpl && !options.assertHost) {
      let resolved: { address: string; family: number };
      try {
        resolved = await resolvePublicHost(target.hostname);
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : "Host refused." };
      }
      try {
        const resp = await fetchPinnedHttps(target, resolved, userAgent, deadline, MAX_HTML_BYTES);
        status = resp.status;
        location = resp.location;
        if (status >= 200 && status < 300) html = resp.body;
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : "The homepage could not be fetched." };
      }
    } else {
      try {
        await checkHost(target.hostname);
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : "Host refused." };
      }

      let res: Response;
      try {
        res = await doFetch(url, {
          headers: { "user-agent": userAgent },
          // Still manual: the loop below decides hop by hop whether the target is
          // one we are allowed to fetch. Handing that to fetch would skip the
          // host check on every hop after the first.
          redirect: "manual",
          signal: deadline,
        });
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : "The homepage could not be fetched." };
      }
      status = res.status;
      location = res.headers.get("location");
      if (status >= 200 && status < 300) {
        html = await readBoundedFetchBody(res, MAX_HTML_BYTES);
      }
    }

    if (status < 300 || status >= 400) {
      if (status < 200 || status >= 300) return { ok: false, detail: `The homepage answered ${status}.` };
      break;
    }

    if (hop >= MAX_HOPS - 1) return { ok: false, detail: "The homepage redirects in a loop." };

    if (!location) return { ok: false, detail: "The homepage redirects without saying where." };

    let next: URL;
    try {
      next = new URL(location, url);
    } catch {
      return { ok: false, detail: "The homepage redirects somewhere this check cannot read." };
    }
    // Measured against the registered domain, never against the previous hop,
    // so a chain cannot walk off the site one label at a time.
    if (!sameSite(next.hostname, domain)) {
      return { ok: false, detail: `The homepage redirects to ${next.hostname}. Add the site under that host.` };
    }
    if (next.protocol !== "https:") {
      return { ok: false, detail: "The homepage redirects to an address that is not https." };
    }
    url = next.toString();
  }

  const tags = html.match(/<script\b[^>]*agent\.js[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const m = tag.match(/data-domain\s*=\s*["']([^"']+)["']/i);
    if (m && sameSite(m[1], domain) && servedByUs(tag)) return { ok: true };
  }
  return {
    ok: false,
    detail: tags.length
      ? "agent.js is on the page but data-domain does not match this site."
      : "agent.js was not found in the homepage HTML. It has to be in the served markup, not injected later.",
  };
}
