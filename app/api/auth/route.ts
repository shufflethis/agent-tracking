import { cookies } from "next/headers";
import { emailConfigured, escapeHtml, sendMail } from "@/lib/email";
import { button, heading, layout, LEGAL_LINE, paragraph } from "@/lib/email-layout";
import { SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import { consume, LOGIN_LINKS_PER_DAY, loginQuotaKey } from "@/lib/quota";
import { renderProblemPage } from "@/lib/pages";
import { clientIp, take } from "@/lib/ratelimit";
import { safeNext } from "@/lib/safe-next";
import { loginUrl, mintLoginToken, mintSessionToken, readLoginToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { createHash } from "node:crypto";
import { ensureAccount, markTokenUsed, setLang } from "@/lib/tracking/db";

export const runtime = "nodejs";

/**
 * Login by magic link.
 *
 * POST with an address sends the link. GET with a token renders a page whose
 * button POSTs the token back; only that POST sets the session cookie. The link in a delivered mail is
 * fetched by gateways before a person sees it, and a fetch is not a login.
 *
 * There is no account creation step. The first login creates the account,
 * because an address that receives our mail and presses the button is all an
 * account here consists of.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

const CSS =
  ":root{color-scheme:dark}body{margin:0;background:#060606;color:#f0f0f0;font:16px/1.65 system-ui,-apple-system,'Segoe UI',sans-serif}" +
  "main{max-width:34rem;margin:0 auto;padding:14vh 24px 6rem}h1{font-size:1.7rem;line-height:1.25;margin:0 0 1.1rem}p{color:#c4c4c8;margin:0 0 1.1rem}" +
  "strong{color:#f0f0f0}form{margin:1.8rem 0}button{border:0;border-radius:8px;padding:13px 22px;font:inherit;font-weight:600;color:#060606;background:linear-gradient(135deg,#3fd8ca,#8b3fca);cursor:pointer}.small{color:#8a8a94;font-size:14px}";

function confirmPage(email: string, token: string, next: string, lang: string): string {
  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow"><title>Sign in | ${SITE_HOST}</title><style>${CSS}</style></head><body><main>` +
    `<h1>Sign in as ${escapeHtml(email)}?</h1><p>This opens the Agent Tracking dashboard in this browser for 30 days.</p>` +
    `<form method="post" action="/api/auth"><input type="hidden" name="k" value="${escapeHtml(token)}"><input type="hidden" name="next" value="${escapeHtml(next)}"><input type="hidden" name="lang" value="${escapeHtml(lang)}"><button type="submit">Sign in</button></form>` +
    `<p class="small">Nothing happens until you press the button. If you did not ask for this link, close the page.</p></main></body></html>`
  );
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("form")) {
    try {
      return Object.fromEntries(await request.formData()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (await request.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Only paths on this site, so a link cannot bounce a fresh session elsewhere. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("k") ?? "";
  const claims = readLoginToken(token);
  if (!claims) return html(renderProblemPage("That link is no longer valid", "Sign-in links last 30 minutes. Ask for a new one on the login page."), 410);
  return html(confirmPage(claims.email, token, safeNext(url.searchParams.get("next")), url.searchParams.get("lang") === "de" ? "de" : "en"));
}

export async function POST(request: Request) {
  const body = await readBody(request);

  // The interstitial's form: token in, session cookie out.
  const token = typeof body.k === "string" ? body.k.trim() : "";
  if (token) {
    const claims = readLoginToken(token);
    if (!claims) return html(renderProblemPage("That link is no longer valid", "Sign-in links last 30 minutes. Ask for a new one on the login page."), 410);
    // One use per link. A mail gateway that follows the link only renders the
    // page; a person who presses the button spends it.
    if (!markTokenUsed(createHash("sha256").update(token).digest("hex"), claims.expires)) {
      return html(renderProblemPage("That link was already used", "Each sign-in link works once. Ask for a new one on the login page."), 410);
    }
    const account = ensureAccount(claims.email);
    // A new account speaks English unless the person came through the German
    // landing page; the browser's Accept-Language is deliberately not consulted.
    if (!account.lang) setLang(claims.email, body.lang === "de" ? "de" : "en");
    (await cookies()).set({ ...sessionCookieOptions(), value: mintSessionToken(claims.email) });
    return new Response(null, { status: 303, headers: { location: safeNext(body.next) } });
  }

  // The login form: address in, mail out. Honeypot first.
  if (typeof body.company === "string" && body.company.trim()) return Response.json({ ok: true }, { status: 202 });
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return Response.json({ ok: false, detail: "Enter the address the link should go to." }, { status: 422 });
  if (!emailConfigured()) return Response.json({ ok: false, detail: "Sign-in is not available right now." }, { status: 503 });

  const budget = take(clientIp(request.headers), "requests");
  if (!budget.ok) return Response.json({ ok: false, detail: "Slow down and try again shortly." }, { status: 429 });
  // Outbound mail to an address someone typed must not be free: the same
  // per-address bucket monitoring uses.
  const quota = await consume(loginQuotaKey(email), LOGIN_LINKS_PER_DAY);
  if (!quota.allowed) return Response.json({ ok: false, detail: "Too many sign-in links for that address today." }, { status: 429 });

  const lang = body.lang === "de" ? "de" : "en";
  const link = `${loginUrl(mintLoginToken(email))}&next=${encodeURIComponent(safeNext(body.next))}&lang=${lang}`;
  const subject = `Your sign-in link for ${SITE_HOST}`;
  const text =
    `Open this link and press the button to sign in to the Agent Tracking dashboard:\n\n${link}\n\n` +
    `The link is valid for 30 minutes. If you did not ask for it, ignore this email.\n\n${LEGAL_LINE}\nImprint: ${SITE_ORIGIN}/imprint · Privacy: ${SITE_ORIGIN}/privacy\n`;
  const body2 =
    heading("Sign in") +
    paragraph("Open the link and press the button to sign in to the Agent Tracking dashboard.") +
    button(link, "Sign in") +
    paragraph("The link is valid for 30 minutes. If you did not ask for it, ignore this email.", "muted");
  const sent = await sendMail({ to: [{ email }], subject, text, html: layout({ title: subject, body: body2 }), tags: ["login"], ledger: { family: "login" } });
  if (!sent.ok) return Response.json({ ok: false, detail: "The email could not be sent. Try again." }, { status: 502 });
  return Response.json({ ok: true });
}

/** Sign out: clear the cookie. POST only, so a link cannot log someone out. */
export async function DELETE() {
  (await cookies()).set({ ...sessionCookieOptions(), value: "", maxAge: 0 });
  return new Response(null, { status: 204, headers: { "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0` } });
}
