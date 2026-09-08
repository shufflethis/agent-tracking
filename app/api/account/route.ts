import { currentAccount } from "@/lib/tracking/auth";
import { DASH_LANGS, type DashLang } from "@/lib/tracking/copy";
import { setLang } from "@/lib/tracking/db";

export const runtime = "nodejs";

/** Account preferences that are not a site's: today only the dashboard language. */
export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { lang?: unknown };
  if (!DASH_LANGS.includes(body.lang as DashLang)) return Response.json({ ok: false, detail: "lang must be en or de." }, { status: 422 });
  setLang(account.email, body.lang as DashLang);
  return Response.json({ ok: true, lang: body.lang });
}
