import { currentAccount } from "@/lib/tracking/auth";
import { SITE_ORIGIN } from "@/lib/site";
import { approveDeviceLogin } from "@/lib/agents/tokens";

export const runtime = "nodejs";

/** The confirmation form on /app/connect posts here. Session cookie is SameSite=Lax; the Origin check is belt and braces. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== SITE_ORIGIN && origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const account = await currentAccount();
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  if (!account) return Response.redirect(new URL(`/login?next=${encodeURIComponent(`/app/connect?code=${code}`)}`, request.url), 303);
  const result = approveDeviceLogin(code, account.email);
  return Response.redirect(new URL(`/app/connect?result=${result}`, request.url), 303);
}
