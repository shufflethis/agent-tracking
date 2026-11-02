import { backTo, formRequest } from "@/lib/agents/form-route";
import { saveNotifySettings, type WebhookKind } from "@/lib/agents/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  const f = (k: string) => String(r.form.get(k) ?? "").trim();
  const kind = f("webhookKind") as WebhookKind | "";
  const result = saveNotifySettings(r.account.email, {
    briefingHour: Number(f("briefingHour")),
    alertsEmail: f("alertsEmail") === "on",
    webhook: kind ? { kind, url: f(kind === "telegram" ? "telegramToken" : "webhookUrl"), ...(kind === "telegram" ? { chatId: f("telegramChat") } : {}) } : null,
  });
  return backTo(request, `/app/fleet/settings?saved=${result}`);
}
