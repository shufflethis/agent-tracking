import { backTo, formRequest } from "@/lib/agents/form-route";
import { resolvePublicTarget } from "@/lib/agents/safe-url";
import { saveNotifySettings, type WebhookKind } from "@/lib/agents/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  const f = (k: string) => String(r.form.get(k) ?? "").trim();
  const kind = f("webhookKind") as WebhookKind | "";
  // A generic webhook must resolve to public addresses only; checked again before every send.
  if (kind === "generic" && !(await resolvePublicTarget(f("webhookUrl")))) return backTo(request, "/app/fleet/settings?saved=invalid_url");
  const result = saveNotifySettings(r.account.email, {
    briefingHour: Number(f("briefingHour")),
    alertsEmail: f("alertsEmail") === "on",
    webhook: kind ? { kind, url: f(kind === "telegram" ? "telegramToken" : "webhookUrl"), ...(kind === "telegram" ? { chatId: f("telegramChat") } : {}) } : null,
  });
  return backTo(request, `/app/fleet/settings?saved=${result}`);
}
