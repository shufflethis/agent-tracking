import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { db } from "../tracking/db";

/**
 * Agent write tokens, one per machine, and the device login that hands them out.
 *
 * Same rules as the account API token (lib/tracking/api-token.ts): shown once,
 * stored only as a hash, recognisable by prefix. Unlike it, there can be many
 * per account and each one is revoked on its own, because a laptop gets lost
 * independently of a server.
 */

const PREFIX = "atk_";
const DEVICE_TTL_MS = 10 * 60_000;
const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LAST_SEEN_RESOLUTION_MS = 60_000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const validHostLabel = (value: unknown): value is string => typeof value === "string" && /^[\w.-]{1,64}$/.test(value);

export function mintAgentToken(owner: string, hostLabel: string, now = Date.now()): { id: string; token: string } {
  const id = randomUUID();
  const token = PREFIX + randomBytes(24).toString("base64url");
  db().prepare("insert into agent_tokens (id, owner, hash, host_label, created_at) values (?, ?, ?, ?, ?)").run(id, owner, sha256(token), hostLabel, now);
  return { id, token };
}

export function agentTokenOwner(token: string | null | undefined, now = Date.now()): { owner: string; tokenId: string } | null {
  if (!token || !token.startsWith(PREFIX) || token.length > 200) return null;
  const row = db().prepare("select id, owner, last_seen_at from agent_tokens where hash = ? and revoked_at is null").get(sha256(token)) as
    | { id: string; owner: string; last_seen_at: number | null }
    | undefined;
  if (!row) return null;
  if (row.last_seen_at === null || now - row.last_seen_at >= LAST_SEEN_RESOLUTION_MS) {
    db().prepare("update agent_tokens set last_seen_at = ? where id = ?").run(now, row.id);
  }
  return { owner: row.owner, tokenId: row.id };
}

export function listAgentTokens(owner: string): { id: string; hostLabel: string; createdAt: number; lastSeenAt: number | null }[] {
  return (db().prepare("select id, host_label, created_at, last_seen_at from agent_tokens where owner = ? and revoked_at is null order by created_at desc").all(owner) as {
    id: string; host_label: string; created_at: number; last_seen_at: number | null;
  }[]).map((r) => ({ id: r.id, hostLabel: r.host_label, createdAt: r.created_at, lastSeenAt: r.last_seen_at }));
}

export function revokeAgentToken(owner: string, id: string, now = Date.now()): boolean {
  return Number(db().prepare("update agent_tokens set revoked_at = ? where id = ? and owner = ? and revoked_at is null").run(now, id, owner).changes) > 0;
}

function userCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

const normalizeUserCode = (value: string) => {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : null;
};

export function startDeviceLogin(hostLabel: string, now = Date.now()): { deviceCode: string; userCode: string; expiresAt: number } {
  const deviceCode = randomBytes(32).toString("base64url");
  const expiresAt = now + DEVICE_TTL_MS;
  for (;;) {
    const code = userCode();
    try {
      db().prepare("insert into agent_device_codes (device_code_hash, user_code, host_label, created_at, expires_at) values (?, ?, ?, ?, ?)").run(sha256(deviceCode), code, hostLabel, now, expiresAt);
      return { deviceCode, userCode: code, expiresAt };
    } catch (error) {
      if (!String(error).includes("UNIQUE")) throw error;
    }
  }
}

/** For the confirmation page: what the person is about to connect. */
export function deviceLoginInfo(code: string, now = Date.now()): { userCode: string; hostLabel: string } | null {
  const userCodeValue = normalizeUserCode(code);
  if (!userCodeValue) return null;
  const row = db().prepare("select user_code, host_label from agent_device_codes where user_code = ? and expires_at >= ? and approved_by is null").get(userCodeValue, now) as
    | { user_code: string; host_label: string }
    | undefined;
  return row ? { userCode: row.user_code, hostLabel: row.host_label } : null;
}

export function approveDeviceLogin(code: string, owner: string, now = Date.now()): "approved" | "expired" | "unknown" {
  const userCodeValue = normalizeUserCode(code);
  if (!userCodeValue) return "unknown";
  const row = db().prepare("select device_code_hash, host_label, expires_at, approved_by from agent_device_codes where user_code = ?").get(userCodeValue) as
    | { device_code_hash: string; host_label: string; expires_at: number; approved_by: string | null }
    | undefined;
  if (!row) return "unknown";
  if (row.expires_at < now || row.approved_by) return "expired";
  const { id, token } = mintAgentToken(owner, row.host_label, now);
  db().prepare("update agent_device_codes set approved_by = ?, token_id = ?, token_plain_once = ? where device_code_hash = ?").run(owner, id, token, row.device_code_hash);
  return "approved";
}

export function pollDeviceLogin(deviceCode: string, now = Date.now()): { status: "pending" } | { status: "expired" } | { status: "approved"; token: string } {
  const hash = sha256(deviceCode);
  const row = db().prepare("select expires_at, approved_by, token_plain_once from agent_device_codes where device_code_hash = ?").get(hash) as
    | { expires_at: number; approved_by: string | null; token_plain_once: string | null }
    | undefined;
  if (!row) return { status: "expired" };
  if (row.approved_by && row.token_plain_once) {
    db().prepare("delete from agent_device_codes where device_code_hash = ?").run(hash);
    return { status: "approved", token: row.token_plain_once };
  }
  if (row.expires_at < now) return { status: "expired" };
  return { status: "pending" };
}
