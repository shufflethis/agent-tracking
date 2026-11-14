import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Symmetric authenticated encryption for credentials that must be recovered in
 * plaintext by the server (webhook URLs, Telegram bot tokens, one-time device
 * tokens waiting for the CLI poll).
 *
 * Derived via HKDF-SHA256 from UNLOCK_SECRET with a distinct info label so the
 * key never collides with the HMAC session signer in lib/session.ts. Values
 * stored before encryption was added have no `enc:v1:` prefix and are returned
 * as-is until the row is next written.
 */

const PREFIX = "enc:v1:";

function derivedKey(): Buffer | null {
  const raw = process.env.UNLOCK_SECRET?.trim();
  if (!raw) return null;
  if (Buffer.byteLength(raw, "utf8") < 16) {
    throw new Error("UNLOCK_SECRET must be at least 16 bytes.");
  }
  return Buffer.from(hkdfSync("sha256", raw, "agent-tracking-secret-box-salt", "secret-box:v1", 32));
}

export function sealSecret(plain: string): string {
  if (!plain || plain.startsWith(PREFIX)) return plain;
  const key = derivedKey();
  if (!key) throw new Error("UNLOCK_SECRET is required to seal secrets.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = derivedKey();
  if (!key) return null;
  const parts = stored.slice(PREFIX.length).split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64url");
    const tag = Buffer.from(parts[1], "base64url");
    const data = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
