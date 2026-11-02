import { escapeHtml, sendMail } from "../email";
import { button, layout, paragraph } from "../email-layout";
import { SITE_ORIGIN } from "../site";
import { dashLang, type DashLang } from "../tracking/copy";
import { dayKey, db } from "../tracking/db";
import { clock } from "./briefing";
import { agentCopy } from "./copy";
import { getNotifySettings, type NotifySettings } from "./store";

/**
 * Immediate alerts for runs that failed, hung or went missing, and the
 * schedule of the morning briefing. One email per account and job run, at
 * most ten webhook messages plus one summary, each alert sent once.
 */

const MAX_WEBHOOK_ALERTS = 10;
const ALERT_WINDOW_MS = 24 * 3_600_000;
const HOUR_FORMAT = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" });

export type Alert = { agent: string; host: string; status: "failed" | "hung" | "missed"; at: number; detail: string; url: string };

export function alertText(a: Alert, lang: DashLang): string {
  const c = agentCopy(lang).briefing;
  const what = a.status === "hung" ? c.hung(clock(a.at)) : a.status === "missed" ? c.missed(clock(a.at)) : c.failed(clock(a.at), null) + (a.detail ? `, ${a.detail}` : "");
  return `${a.agent} (${a.host}): ${what}\n${a.url}`;
}

export function webhookRequest(w: NonNullable<NotifySettings["webhook"]>, a: Alert, lang: DashLang, textOverride?: string): { url: string; body: string } {
  const text = textOverride ?? alertText(a, lang);
  switch (w.kind) {
    case "telegram": return { url: `https://api.telegram.org/bot${w.url}/sendMessage`, body: JSON.stringify({ chat_id: w.chatId, text, disable_web_page_preview: true }) };
    case "slack": return { url: w.url, body: JSON.stringify({ text }) };
    case "discord": return { url: w.url, body: JSON.stringify({ content: text }) };
    default: return { url: w.url, body: JSON.stringify({ text, agent: a.agent, status: a.status, url: a.url }) };
  }
}

async function postWebhook(req: { url: string; body: string }): Promise<boolean> {
  try {
    const res = await fetch(req.url, { method: "POST", headers: { "content-type": "application/json" }, body: req.body, signal: AbortSignal.timeout(5000), redirect: "error" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Sends one test message so the settings page can show whether the webhook works. */
export async function sendTestWebhook(w: NonNullable<NotifySettings["webhook"]>, lang: DashLang): Promise<boolean> {
  const text = lang === "de" ? "agenttracking: Testnachricht. Webhook funktioniert." : "agenttracking: test message. Your webhook works.";
  return postWebhook(webhookRequest(w, { agent: "test", host: "agenttracking", status: "failed", at: Date.now(), detail: "", url: `${SITE_ORIGIN}/app/fleet` }, lang, text));
}

type PendingRow = { id: string; owner: string; lang: string | null; agent_id: string; name: string; host: string; status: Alert["status"]; started_at: number; last_event_at: number; exit_code: number | null };

export async function sendAlerts(now = Date.now()): Promise<number> {
  const d = db();
  const rows = d.prepare(
    `select r.id, a.owner, acc.lang, a.id as agent_id, a.name, a.host, r.status, r.started_at, r.last_event_at, r.exit_code
     from agent_runs r join agents a on a.id = r.agent_id join accounts acc on acc.email = a.owner
     where r.status in ('failed','hung','missed') and r.alerted_at is null and r.last_event_at >= ?
     order by a.owner, r.last_event_at`,
  ).all(now - ALERT_WINDOW_MS) as PendingRow[];
  const byOwner = new Map<string, PendingRow[]>();
  for (const r of rows) byOwner.set(r.owner, [...(byOwner.get(r.owner) ?? []), r]);
  const mark = d.prepare("update agent_runs set alerted_at = ? where id = ?");
  let sent = 0;
  for (const [owner, list] of byOwner) {
    const lang = dashLang(list[0].lang);
    const settings = getNotifySettings(owner);
    const alerts: Alert[] = list.map((r) => ({
      agent: r.name, host: r.host, status: r.status, at: r.status === "hung" ? r.last_event_at : r.started_at,
      detail: r.status === "failed" && r.exit_code !== null ? `exit ${r.exit_code}` : "", url: `${SITE_ORIGIN}/app/fleet/${r.agent_id}`,
    }));
    if (settings.alertsEmail) {
      const c = agentCopy(lang);
      const subject = alerts.length === 1 ? c.alert.subject(alerts[0].agent, alertText(alerts[0], lang).split("\n")[0].split(": ").slice(1).join(": ")) : c.briefing.subject(alerts.length, 0);
      const lines = alerts.map((a) => alertText(a, lang).split("\n")[0]);
      await sendMail({
        to: [{ email: owner }], subject, text: `${lines.join("\n")}\n\n${SITE_ORIGIN}/app/fleet`,
        html: layout({ title: subject, body: paragraph(lines.map(escapeHtml).join("<br>")) + button(`${SITE_ORIGIN}/app/fleet`, c.briefing.open) }),
        ledger: { family: "agent-alert" },
      });
    }
    if (settings.webhook) {
      for (const a of alerts.slice(0, MAX_WEBHOOK_ALERTS)) await postWebhook(webhookRequest(settings.webhook, a, lang));
      if (alerts.length > MAX_WEBHOOK_ALERTS) {
        const rest = alerts.slice(MAX_WEBHOOK_ALERTS);
        const text = `${agentCopy(lang).alert.andMore(rest.length)}: ${rest.map((a) => a.agent).join(", ")}\n${SITE_ORIGIN}/app/fleet`;
        await postWebhook(webhookRequest(settings.webhook, rest[0], lang, text));
      }
    }
    for (const r of list) mark.run(now, r.id);
    sent += list.length;
  }
  return sent;
}

/** Accounts with at least one agent whose local briefing hour has come and who were not briefed today. */
export function dueBriefingOwners(now = Date.now()): string[] {
  const hour = Number(HOUR_FORMAT.format(new Date(now)));
  const today = dayKey(now);
  return (db().prepare(
    `select email from accounts where briefing_hour <= ? and (briefing_last_day is null or briefing_last_day <> ?)
       and exists (select 1 from agents where owner = accounts.email) order by email`,
  ).all(hour, today) as { email: string }[]).map((r) => r.email);
}

export function markBriefed(owner: string, now = Date.now()): void {
  db().prepare("update accounts set briefing_last_day = ? where email = ?").run(dayKey(now), owner);
}
