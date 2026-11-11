import { clientIp, take } from "@/lib/ratelimit";
import { pollDeviceLogin } from "@/lib/agents/tokens";
import { BodyLimitError, readLimitedBody } from "@/lib/tracking/request-body";

export const runtime = "nodejs";

/** Step 2 of `agenttracking login`: the CLI polls until the code is confirmed; the token is handed out once. */
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "requests").ok) return Response.json({ ok: false, detail: "Too many requests." }, { status: 429 });
  let body: { deviceCode?: unknown } | null = null;
  try {
    const bytes = await readLimitedBody(request, 8 * 1024);
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as { deviceCode?: unknown };
  } catch (err) {
    if (err instanceof BodyLimitError) return Response.json({ ok: false, detail: "Body too large." }, { status: 413 });
  }
  if (typeof body?.deviceCode !== "string" || body.deviceCode.length > 100) return Response.json({ ok: false, detail: "deviceCode required." }, { status: 422 });
  return Response.json({ ok: true, ...pollDeviceLogin(body.deviceCode) });
}
