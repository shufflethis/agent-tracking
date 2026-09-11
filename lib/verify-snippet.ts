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

import { assertPublicHost } from "@/lib/public-host";
import { LEGACY_SNIPPET_HOSTS, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { sameSite } from "@/lib/tracking/classify";

export type SnippetResult = { ok: true } | { ok: false; detail: string };

/** How many same-site hops to follow before calling it a loop. */
const MAX_HOPS = 5;

type Options = {
  fetchImpl?: typeof fetch;
  assertHost?: (hostname: string) => Promise<void>;
};

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
    try {
      await checkHost(target.hostname);
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "Host refused." };
    }

    let res: Response;
    try {
      res = await doFetch(url, {
        headers: { "user-agent": `Mozilla/5.0 (compatible; ${SITE_HOST} verify; +${SITE_ORIGIN}/docs)` },
        // Still manual: the loop below decides hop by hop whether the target is
        // one we are allowed to fetch. Handing that to fetch would skip the
        // host check on every hop after the first.
        redirect: "manual",
        signal: deadline,
      });
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "The homepage could not be fetched." };
    }

    if (res.status < 300 || res.status >= 400) {
      if (!res.ok) return { ok: false, detail: `The homepage answered ${res.status}.` };
      html = (await res.text()).slice(0, 600_000);
      break;
    }

    if (hop >= MAX_HOPS - 1) return { ok: false, detail: "The homepage redirects in a loop." };

    const location = res.headers.get("location");
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
