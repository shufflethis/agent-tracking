import { currentAccount } from "@/lib/tracking/auth";
import { acceptSiteInvite } from "@/lib/tracking/site-access";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  let body: { token?: unknown } | null;
  try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await readLimitedBody(request, 1024))); }
  catch (error) { return Response.json({ ok: false, detail: error instanceof BodyLimitError ? "Body too large." : "Invalid JSON." }, { status: error instanceof BodyLimitError ? 413 : 400 }); }
  if (typeof body?.token !== "string") return Response.json({ ok: false, detail: "Invalid invitation." }, { status: 422 });
  const domain = acceptSiteInvite(body.token, account.email);
  return domain ? Response.json({ ok: true, domain }) : Response.json({ ok: false, detail: "Invitation expired, revoked, used, or assigned to another email." }, { status: 403 });
}
