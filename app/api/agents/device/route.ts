import { clientIp, take } from "@/lib/ratelimit";
import { SITE_ORIGIN } from "@/lib/site";
import { startDeviceLogin, validHostLabel } from "@/lib/agents/tokens";

export const runtime = "nodejs";

/** Step 1 of `agenttracking login`: the CLI asks for a code the person confirms in the browser. */
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "requests").ok) return Response.json({ ok: false, detail: "Too many requests." }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { hostLabel?: unknown } | null;
  if (!validHostLabel(body?.hostLabel)) return Response.json({ ok: false, detail: "hostLabel: 1-64 characters of letters, digits, '.', '_' or '-'." }, { status: 422 });
  const { deviceCode, userCode, expiresAt } = startDeviceLogin(body.hostLabel);
  return Response.json({ ok: true, deviceCode, userCode, expiresAt, interval: 3, verifyUrl: `${SITE_ORIGIN}/app/connect?code=${encodeURIComponent(userCode)}` });
}
