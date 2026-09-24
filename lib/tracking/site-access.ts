import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, getSite, type Site } from "./db";

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const emailValid = (value: string) => /^[^\s@]{1,64}@[^\s@]{1,190}$/.test(value) && value.length <= 254;

export function siteRole(domain: string, email: string): "owner" | "reader" | null {
  const site = getSite(domain);
  if (!site) return null;
  if (site.owner === email.toLowerCase()) return "owner";
  const row = db().prepare("select role from site_access where domain=? and email=? and revoked_at is null")
    .get(site.domain, email.toLowerCase()) as { role: string } | undefined;
  return row?.role === "reader" ? "reader" : null;
}

export function canReadSite(domain: string, email: string): boolean { return siteRole(domain, email) !== null; }

export function readableSites(email: string): Site[] {
  return db().prepare(`select s.* from sites s where s.owner=? or exists
    (select 1 from site_access a where a.domain=s.domain and a.email=? and a.role='reader' and a.revoked_at is null)
    order by s.created_at`).all(email.toLowerCase(), email.toLowerCase()) as Site[];
}

export function createSiteInvite(domain: string, owner: string, rawEmail: string, now = Date.now()) {
  const email = rawEmail.trim().toLowerCase();
  if (siteRole(domain, owner) !== "owner" || !emailValid(email) || email === owner.toLowerCase()) return null;
  const token = `ati_${randomBytes(32).toString("base64url")}`;
  const inviteId = randomUUID();
  const expiresAt = now + 7 * 86_400_000;
  db().prepare("insert into site_invites (domain, invite_id, email, token_hash, created_at, expires_at) values (?, ?, ?, ?, ?, ?)")
    .run(domain.toLowerCase(), inviteId, email, tokenHash(token), now, expiresAt);
  return { inviteId, token, email, expiresAt };
}

export function acceptSiteInvite(token: string, email: string, now = Date.now()): string | null {
  if (!token.startsWith("ati_") || token.length > 100) return null;
  const d = db();
  d.exec("begin immediate");
  try {
    const row = d.prepare(`select domain, invite_id as inviteId, email from site_invites
      where token_hash=? and expires_at>? and revoked_at is null and accepted_at is null`)
      .get(tokenHash(token), now) as { domain: string; inviteId: string; email: string } | undefined;
    if (!row || row.email !== email.toLowerCase() || !getSite(row.domain)) { d.exec("commit"); return null; }
    d.prepare("update site_invites set accepted_at=? where domain=? and invite_id=?").run(now, row.domain, row.inviteId);
    d.prepare(`insert into site_access (domain, email, role, granted_at, revoked_at) values (?, ?, 'reader', ?, null)
      on conflict(domain, email) do update set role='reader', granted_at=excluded.granted_at, revoked_at=null`)
      .run(row.domain, row.email, now);
    d.exec("commit"); return row.domain;
  } catch (error) { d.exec("rollback"); throw error; }
}

export function revokeSiteInvite(domain: string, owner: string, inviteId: string, now = Date.now()): boolean {
  if (siteRole(domain, owner) !== "owner") return false;
  return Number(db().prepare("update site_invites set revoked_at=? where domain=? and invite_id=? and accepted_at is null and revoked_at is null")
    .run(now, domain.toLowerCase(), inviteId).changes) > 0;
}

export function revokeSiteReader(domain: string, owner: string, email: string, now = Date.now()): boolean {
  if (siteRole(domain, owner) !== "owner") return false;
  return Number(db().prepare("update site_access set revoked_at=? where domain=? and email=? and role='reader' and revoked_at is null")
    .run(now, domain.toLowerCase(), email.toLowerCase()).changes) > 0;
}

export function siteAccessList(domain: string) {
  const readers = db().prepare("select email, granted_at as grantedAt from site_access where domain=? and role='reader' and revoked_at is null order by granted_at")
    .all(domain.toLowerCase()) as { email: string; grantedAt: number }[];
  const invites = db().prepare("select invite_id as inviteId, email, created_at as createdAt, expires_at as expiresAt from site_invites where domain=? and accepted_at is null and revoked_at is null and expires_at>? order by created_at desc")
    .all(domain.toLowerCase(), Date.now()) as { inviteId: string; email: string; createdAt: number; expiresAt: number }[];
  return { readers, invites };
}
