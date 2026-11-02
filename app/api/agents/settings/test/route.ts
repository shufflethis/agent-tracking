import { backTo, formRequest } from "@/lib/agents/form-route";
import { sendTestWebhook } from "@/lib/agents/notify";
import { getNotifySettings } from "@/lib/agents/store";
import { dashLang } from "@/lib/tracking/copy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  const webhook = getNotifySettings(r.account.email).webhook;
  if (!webhook) return backTo(request, "/app/fleet/settings?tested=none");
  return backTo(request, `/app/fleet/settings?tested=${(await sendTestWebhook(webhook, dashLang(r.account.lang))) ? "ok" : "failed"}`);
}
