import { clientIp, take } from "@/lib/ratelimit";
import { pollDeviceLogin } from "@/lib/agents/tokens";

export const runtime = "nodejs";

/** Step 2 of `agenttracking login`: the CLI polls until the code is confirmed; the token is handed out once. */
export async function POST(request: Request) {
  if (!take(clientIp(request.headers), "requests").ok) return Response.json({ ok: false, detail: "Too many requests." }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { deviceCode?: unknown } | null;
  if (typeof body?.deviceCode !== "string" || body.deviceCode.length > 100) return Response.json({ ok: false, detail: "deviceCode required." }, { status: 422 });
  return Response.json({ ok: true, ...pollDeviceLogin(body.deviceCode) });
}
