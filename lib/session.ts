import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_ORIGIN } from "./site";

/**
 * Login without passwords.
 *
 * A magic link carries a signed token; the page behind it has a button whose
 * POST sets the session cookie. The GET renders and writes nothing, because mail gateways fetch every link in a delivered
 * message, and a fetch is not a person logging in.
 *
 * HMAC over a scope prefix and the payload, so a token from one family can
 * never be replayed in another, even though they share the secret.
 */

export const SESSION_COOKIE = "at_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

function secret(): string {
  const value = process.env.UNLOCK_SECRET;
  if (!value) throw new Error("UNLOCK_SECRET is not configured.");
  return value;
}

type Scope = "login" | "session" | "digest";

function sign(scope: Scope, payload: string): string {
  return createHmac("sha256", secret()).update(`${scope}:${payload}`).digest("base64url");
}

function mint(scope: Scope, email: string, ttlMs: number, now = Date.now()): string {
  const expires = now + ttlMs;
  const payload = `${Buffer.from(email.toLowerCase()).toString("base64url")}.${expires}`;
  return `${payload}.${sign(scope, payload)}`;
}

function read(scope: Scope, token: string | undefined | null, now = Date.now()): { email: string; expires: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encoded, expiresRaw, signature] = parts;
  const payload = `${encoded}.${expiresRaw}`;
  let expected: Buffer;
  let given: Buffer;
  try {
    expected = Buffer.from(sign(scope, payload));
    given = Buffer.from(signature);
  } catch {
    return null;
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < now) return null;
  try {
    return { email: Buffer.from(encoded, "base64url").toString("utf8"), expires };
  } catch {
    return null;
  }
}

/** The token in the emailed link. Short-lived: it is a one-time key to a door, not the door. */
export const mintLoginToken = (email: string, now = Date.now()) => mint("login", email, LINK_MINUTES * 60_000, now);
export const readLoginToken = (token: string | undefined | null, now = Date.now()) => read("login", token, now);

export const mintSessionToken = (email: string, now = Date.now()) => mint("session", email, SESSION_DAYS * 86_400_000, now);
export const readSessionToken = (token: string | undefined | null, now = Date.now()) => read("session", token, now);

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  };
}

export const loginUrl = (token: string) => `${SITE_ORIGIN}/api/auth?k=${encodeURIComponent(token)}`;

/** The opt-out link in the weekly digest. Long-lived: the mail may sit for months before someone acts on it. */
export const mintDigestToken = (email: string, now = Date.now()) => mint("digest", email, 400 * 86_400_000, now);
export const readDigestToken = (token: string | undefined | null, now = Date.now()) => read("digest", token, now);
