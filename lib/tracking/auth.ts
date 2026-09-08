import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "../session";
import { ensureAccount, getSite, type Account, type Site } from "./db";

/** The signed-in account, or null. Reading the cookie makes the caller dynamic, which the dashboard is anyway. */
export async function currentAccount(): Promise<Account | null> {
  const claims = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return claims ? ensureAccount(claims.email) : null;
}

/** For pages: the account, or a redirect to the login page that comes back here. */
export async function requireAccount(next: string): Promise<Account> {
  const account = await currentAccount();
  if (!account) redirect(`/login?next=${encodeURIComponent(next)}`);
  return account;
}

/** A site the signed-in account owns, or a redirect to the site list. */
export async function requireSite(domain: string): Promise<{ account: Account; site: Site }> {
  const account = await requireAccount(`/app/${encodeURIComponent(domain)}`);
  const site = getSite(domain);
  if (!site || site.owner !== account.email) redirect("/app");
  return { account, site };
}
