import { currentAccount } from "@/lib/tracking/auth";
import { clientIp, take } from "@/lib/ratelimit";
import { sameOriginFormPost } from "@/lib/agents/form-route";
import { approveDeviceLoginDetail } from "@/lib/agents/tokens";
import { readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";

/** The confirmation form on /app/connect posts here. Session cookie is SameSite=Lax; Origin/Sec-Fetch-Site and rate limits guard approval. */
export async function POST(request: Request) {
  if (!sameOriginFormPost(request)) return new Response("Forbidden", { status: 403 });
  if (!take(clientIp(request.headers), "requests").ok) return new Response("Too many requests", { status: 429 });
  const account = await currentAccount();
  let code = "";
  try {
    const bytes = await readLimitedBody(request, 8 * 1024);
    code = new URLSearchParams(new TextDecoder("utf-8").decode(bytes)).get("code") ?? "";
  } catch {
    return new Response("Payload too large", { status: 413 });
  }
  if (!account) return Response.redirect(new URL("/login?next=/app/connect", request.url), 303);
  const { result, host } = approveDeviceLoginDetail(code, account.email);
  const hostPart = result === "approved" && host ? `&host=${encodeURIComponent(host)}` : "";
  return Response.redirect(new URL(`/app/connect?result=${result}${hostPart}`, request.url), 303);
}
