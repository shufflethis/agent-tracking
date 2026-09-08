import { escapeHtml } from "./email";
import { SITE_HOST, SITE_ORIGIN } from "./site";

/**
 * The small standalone pages behind emailed links: a token in, a button out.
 * Plain HTML strings rather than React so the routes can answer without the
 * app shell, which these pages neither need nor should carry (every one of
 * these URLs holds a token and is marked noindex).
 */

const PAGE_CSS =
  ":root{color-scheme:dark}" +
  "body{margin:0;background:#060606;color:#f0f0f0;" +
  'font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}' +
  "main{max-width:34rem;margin:0 auto;padding:14vh 24px 6rem}" +
  "h1{font-size:1.7rem;line-height:1.25;margin:0 0 1.1rem;letter-spacing:-0.01em}" +
  "p{color:#c4c4c8;margin:0 0 1.1rem}" +
  "strong{color:#f0f0f0}" +
  "a{color:#3fd8ca}" +
  "form{margin:1.8rem 0}" +
  "button{border:0;border-radius:8px;padding:13px 22px;font:inherit;font-weight:600;" +
  "color:#060606;background:linear-gradient(135deg,#3fd8ca,#8b3fca);cursor:pointer}" +
  ".small{color:#8a8a94;font-size:14px}";

export function page(title: string, body: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<title>${escapeHtml(title)} | ${SITE_HOST}</title>` +
    `<style>${PAGE_CSS}</style></head><body><main>${body}</main></body></html>`
  );
}

export function renderProblemPage(heading: string, detail: string): string {
  return page(heading, `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(detail)}</p><p><a href="${SITE_ORIGIN}/">${SITE_HOST}</a></p>`);
}

/** The digest opt-out interstitial: a GET renders it, the button's POST does the work. */
export function renderDigestOffPage(email: string, token: string): string {
  return page(
    "Stop the weekly digest",
    `<h1>Stop the weekly digest?</h1>` +
      `<p>No more weekly Agent Tracking mails to <strong>${escapeHtml(email)}</strong>. Sign-in links are not affected.</p>` +
      `<form method="post" action="/api/digest"><input type="hidden" name="k" value="${escapeHtml(token)}">` +
      `<button type="submit">Stop the digest</button></form>` +
      `<p><a href="${SITE_ORIGIN}/app">Or change it in the dashboard</a></p>`,
  );
}

export function renderDigestOffDonePage(): string {
  return page("Digest stopped", `<h1>Digest stopped</h1><p>You can switch it back on in the dashboard settings any time.</p><p><a href="${SITE_ORIGIN}/app">Open the dashboard</a></p>`);
}
