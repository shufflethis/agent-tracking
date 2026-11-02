import { SITE_ORIGIN } from "../site";
import { currentAccount } from "../tracking/auth";
import type { Account } from "../tracking/db";

/** Shared guard for the fleet's HTML form posts: same origin, signed in. Session cookie is SameSite=Lax. */
export async function formRequest(request: Request): Promise<{ account: Account; form: FormData } | Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== SITE_ORIGIN && origin !== new URL(request.url).origin) return new Response("Forbidden", { status: 403 });
  const account = await currentAccount();
  if (!account) return Response.redirect(new URL("/login?next=/app/fleet/settings", request.url), 303);
  const form = await request.formData().catch(() => new FormData());
  return { account, form };
}

export const backTo = (request: Request, path: string) => Response.redirect(new URL(path, request.url), 303);
