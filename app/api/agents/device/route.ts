import { clientIp, take } from "@/lib/ratelimit";
import { SITE_ORIGIN } from "@/lib/site";
import { startDeviceLogin, validHostLabel } from "@/lib/agents/tokens";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";

/** Step 1 of `agenttracking login`: the CLI asks for a code the person confirms in the browser. */
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "requests").ok) return Response.json({ ok: false, detail: "Too many requests." }, { status: 429 });
  let body: { hostLabel?: unknown } | null = null;
  try {
    const bytes = await readLimitedBody(request, 8 * 1024);
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as { hostLabel?: unknown };
  } catch (err) {
    if (err instanceof BodyLimitError) return Response.json({ ok: false, detail: "Body too large." }, { status: 413 });
  }
  if (!validHostLabel(body?.hostLabel)) return Response.json({ ok: false, detail: "hostLabel: 1-64 characters of letters, digits, '.', '_' or '-'." }, { status: 422 });
  const { deviceCode, userCode, expiresAt } = startDeviceLogin(body.hostLabel);
  return Response.json({ ok: true, deviceCode, userCode, expiresAt, interval: 3, verifyUrl: `${SITE_ORIGIN}/app/connect` });
}
