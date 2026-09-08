import { createHash, randomBytes } from "node:crypto";
import { accountByApiToken, type Account } from "./db";

/**
 * One API token per account, for the stats endpoint and the MCP tool.
 *
 * Shown once when it is created, stored as a hash, replaced by creating a
 * new one, gone when revoked. The prefix makes a leaked token recognisable
 * in a log or a repository scan, which is the only thing a prefix is for.
 */

const PREFIX = "wmt_";

export function mintApiToken(): { token: string; hash: string } {
  const token = PREFIX + randomBytes(24).toString("base64url");
  return { token, hash: hashApiToken(token) };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** The token from an Authorization: Bearer header, or null. */
export function bearerFrom(headers: Headers): string | null {
  const raw = headers.get("authorization") ?? "";
  const m = raw.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

/** The account a token belongs to, or null for anything that is not a live token. */
export function accountForToken(token: string | null | undefined): Account | null {
  if (!token || !token.startsWith(PREFIX) || token.length > 200) return null;
  return accountByApiToken(hashApiToken(token));
}
