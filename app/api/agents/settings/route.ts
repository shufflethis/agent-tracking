import { backTo, formRequest } from "@/lib/agents/form-route";
import { resolvePublicTarget } from "@/lib/agents/safe-url";
import { saveNotifySettings, type WebhookKind } from "@/lib/agents/store";
import { effectiveAgentPlan } from "@/lib/agents/plans";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  const f = (k: string) => String(r.form.get(k) ?? "").trim();
  const kind = f("webhookKind") as WebhookKind | "";
  // Telegram, Slack, Discord and webhooks are Pro features once paid plans start; email stays on every plan.
  if (kind && !effectiveAgentPlan(r.account.agent_plan).webhooks) return backTo(request, "/app/fleet/settings?saved=needs_pro#plan");
  // A generic webhook must resolve to public addresses only; checked again before every send.
  if (kind === "generic" && !(await resolvePublicTarget(f("webhookUrl")))) return backTo(request, "/app/fleet/settings?saved=invalid_url");
  const result = saveNotifySettings(r.account.email, {
    briefingHour: Number(f("briefingHour")),
    alertsEmail: f("alertsEmail") === "on",
    webhook: kind ? { kind, url: f(kind === "telegram" ? "telegramToken" : "webhookUrl"), ...(kind === "telegram" ? { chatId: f("telegramChat") } : {}) } : null,
  });
  return backTo(request, `/app/fleet/settings?saved=${result}`);
}
