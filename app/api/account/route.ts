import { cookies } from "next/headers";
import { cancelSubscriptionNow } from "@/lib/billing";
import { SITE_ORIGIN } from "@/lib/site";
import { sessionCookieOptions } from "@/lib/session";
import { currentAccount } from "@/lib/tracking/auth";
import { DASH_LANGS, type DashLang } from "@/lib/tracking/copy";
import { deleteAccount, revokeSessions, setLang } from "@/lib/tracking/db";

export const runtime = "nodejs";

/**
 * JSON {lang}: the dashboard language switch (components/SiteActions.tsx).
 *
 * Account actions from /app/account, as plain form posts:
 * - action=signout_all ends every session of the account, this one included.
 * - action=delete with confirm=<the account's email> cancels any Stripe
 *   subscription immediately, then deletes the account and all its data.
 *   If Stripe cannot cancel, nothing is deleted, so nobody keeps paying for
 *   an account that no longer exists.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== SITE_ORIGIN && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return new Response("Forbidden", { status: 403 });
  }
  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const account = await currentAccount();
    if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { lang?: unknown };
    if (!DASH_LANGS.includes(body.lang as DashLang)) return Response.json({ ok: false, detail: "lang must be en or de." }, { status: 422 });
    setLang(account.email, body.lang as DashLang);
    return Response.json({ ok: true, lang: body.lang });
  }
  const back = (path: string) => Response.redirect(new URL(path, request.url), 303);
  const account = await currentAccount();
  if (!account) return back("/login?next=/app/account");
  const form = await request.formData().catch(() => new FormData());
  const action = String(form.get("action") ?? "");
  const clear = async () => (await cookies()).set({ ...sessionCookieOptions(), value: "", maxAge: 0 });

  if (action === "signout_all") {
    revokeSessions(account.email);
    await clear();
    return back("/login?signed_out=all");
  }

  if (action === "delete") {
    if (String(form.get("confirm") ?? "").trim().toLowerCase() !== account.email) return back("/app/account?error=confirm#delete");
    for (const sub of [account.stripe_subscription, account.agent_stripe_subscription]) {
      if (!sub) continue;
      const r = await cancelSubscriptionNow(sub);
      if (!r.ok) {
        console.error(`[account] could not cancel ${sub} before deleting ${account.email}: ${r.reason}`);
        return back("/app/account?error=billing#delete");
      }
    }
    deleteAccount(account.email);
    await clear();
    console.log(`[account] deleted ${account.email.replace(/^(.).*@/, "$1***@")}`);
    return back("/?account=deleted");
  }

  return back("/app/account");
}
