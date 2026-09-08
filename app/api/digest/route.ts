import { cookies } from "next/headers";
import { renderDigestOffDonePage, renderDigestOffPage, renderProblemPage } from "@/lib/pages";
import { readDigestToken } from "@/lib/session";
import { currentAccount } from "@/lib/tracking/auth";
import { ensureAccount, setDigest } from "@/lib/tracking/db";

export const runtime = "nodejs";

/**
 * The weekly digest switch. Two doors, both to the same flag:
 *   - the link in the mail: GET renders a page, its button's POST turns it off
 *   - the dashboard: a signed-in POST with { on } turns it either way
 */

const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("off") ?? "";
  const claims = readDigestToken(token);
  if (!claims) return html(renderProblemPage("That link is no longer valid", "Switch the digest off in the dashboard settings instead."), 410);
  return html(renderDigestOffPage(claims.email, token));
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("form")) {
    const form = await request.formData().catch(() => null);
    const claims = readDigestToken(typeof form?.get("k") === "string" ? String(form?.get("k")) : "");
    if (!claims) return html(renderProblemPage("That link is no longer valid", "Switch the digest off in the dashboard settings instead."), 410);
    ensureAccount(claims.email);
    setDigest(claims.email, false);
    return html(renderDigestOffDonePage());
  }
  void cookies;
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { on?: unknown };
  if (typeof body.on !== "boolean") return Response.json({ ok: false, detail: "Send { on: true | false }." }, { status: 422 });
  setDigest(account.email, body.on);
  return Response.json({ ok: true, on: body.on });
}
