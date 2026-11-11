import { SITE_ORIGIN } from "../site";
import { currentAccount } from "../tracking/auth";
import type { Account } from "../tracking/db";
import { readLimitedBody } from "../tracking/request-body";

const MAX_FORM_BYTES = 32 * 1024;

export function sameOriginFormPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (origin && origin !== SITE_ORIGIN && origin !== new URL(request.url).origin) return false;
  return true;
}

/** Shared guard for the fleet's HTML form posts: same origin, bounded body, signed in. Session cookie is SameSite=Lax. */
export async function formRequest(request: Request): Promise<{ account: Account; form: FormData } | Response> {
  if (!sameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });
  const account = await currentAccount();
  if (!account) return Response.redirect(new URL("/login?next=/app/fleet/settings", request.url), 303);
  let bytes: Uint8Array;
  try {
    bytes = await readLimitedBody(request, MAX_FORM_BYTES);
  } catch {
    return new Response("Payload too large", { status: 413 });
  }
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (type.includes("multipart/form-data")) {
    const form = await new Request(request.url, { method: "POST", headers: request.headers, body: Buffer.from(bytes) }).formData().catch(() => new FormData());
    return { account, form };
  }
  const params = new URLSearchParams(new TextDecoder("utf-8").decode(bytes));
  const form = new FormData();
  for (const [k, v] of params) form.append(k, v);
  return { account, form };
}

export const backTo = (request: Request, path: string) => Response.redirect(new URL(path, request.url), 303);
