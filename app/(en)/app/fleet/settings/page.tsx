import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import AgentConnectionScope from "@/components/AgentConnectionScope";
import { agentCopy } from "@/lib/agents/copy";
import { when } from "@/lib/agents/format";
import { getNotifySettings, listAgents } from "@/lib/agents/store";
import { AGENT_PRO_PRICE, agentCheckoutReady, agentPlanId, effectiveAgentPlan, pricingActive } from "@/lib/agents/plans";
import { listAgentTokens } from "@/lib/agents/tokens";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Agent settings", robots: { index: false, follow: false } };
export const runtime = "nodejs";

const field = { display: "block", width: "100%", maxWidth: 420, marginTop: 4 } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ saved?: string; tested?: string; billing?: string }> }) {
  const { saved, tested, billing } = await searchParams;
  const account = await requireAccount("/app/fleet/settings");
  const lang = dashLang(account.lang);
  const { fleet, settings: c } = agentCopy(lang);
  const s = getNotifySettings(account.email);
  const machines = listAgentTokens(account.email);
  const notice = (saved && c.saved[saved]) || (tested && c.tested[tested]) || (billing === "done" ? c.plan.done : null);
  const stored = agentPlanId(account.agent_plan);
  const plan = effectiveAgentPlan(account.agent_plan);
  const agentCount = listAgents(account.email).length;
  const paying = stored === "pro" && Boolean(account.agent_stripe_subscription);

  return (
    <DashboardShell account={account} area="fleet" title={c.title}>
      <section className="shell section" style={{ paddingTop: 32, maxWidth: 760 }}>
        <p style={{ marginTop: 0 }}><Link href="/app/fleet">← {fleet.back}</Link></p>
        {notice ? <p role="status" className="card" style={{ padding: 12 }}>{notice}</p> : null}
        <div className="card" id="plan" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>{c.plan.title}: {stored === "pro" ? c.plan.pro : pricingActive() ? c.plan.free : `${c.plan.free} (Beta)`}</h2>
          <p style={{ marginTop: 0 }}>{c.plan.usage(agentCount, plan.agents)}</p>
          {pricingActive() ? null : <p className="formnote">{c.plan.beta}</p>}
          <p style={{ color: "var(--ink-2)", marginBottom: 6 }}>{c.plan.freeIncludes}</p>
          <p style={{ color: "var(--ink-2)", marginTop: 0 }}>{c.plan.proIncludes}</p>
          {stored !== "pro" && agentCheckoutReady() ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <form method="post" action="/api/agents/billing">
                <input type="hidden" name="action" value="checkout" />
                <input type="hidden" name="interval" value="month" />
                <button className="btn" type="submit">{c.plan.monthly(AGENT_PRO_PRICE.month)}</button>
              </form>
              <form method="post" action="/api/agents/billing">
                <input type="hidden" name="action" value="checkout" />
                <input type="hidden" name="interval" value="year" />
                <button className="btn ghost" type="submit">{c.plan.yearly(AGENT_PRO_PRICE.year)}</button>
              </form>
            </div>
          ) : null}
          {paying && account.stripe_customer ? (
            <form method="post" action="/api/agents/billing">
              <input type="hidden" name="action" value="portal" />
              <button className="btn ghost" type="submit">{c.plan.manage}</button>
            </form>
          ) : null}
        </div>
        <form method="post" action="/api/agents/settings" className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>{c.briefing}</h2>
          <label>{c.briefingHour}
            <select name="briefingHour" defaultValue={String(s.briefingHour)} style={field}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
            </select>
          </label>
          <h2 style={{ fontSize: 20 }}>{c.alerts}</h2>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="alertsEmail" defaultChecked={s.alertsEmail} /> {c.alertsEmail}
          </label>
          <label style={{ display: "block", marginTop: 16 }}>{c.webhook}
            <select name="webhookKind" defaultValue={s.webhook?.kind ?? ""} style={field}>
              <option value="">{c.webhookNone}</option>
              <option value="telegram">Telegram</option>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="generic">Webhook (JSON)</option>
            </select>
          </label>
          <label style={{ display: "block", marginTop: 12 }}>{c.webhookUrl}
            <input name="webhookUrl" type="url" placeholder="https://hooks.slack.com/..." defaultValue={s.webhook && s.webhook.kind !== "telegram" ? s.webhook.url : ""} style={field} />
          </label>
          <label style={{ display: "block", marginTop: 12 }}>{c.telegramToken}
            <input name="telegramToken" autoComplete="off" placeholder="123456:ABC..." defaultValue={s.webhook?.kind === "telegram" ? s.webhook.url : ""} style={field} />
          </label>
          <label style={{ display: "block", marginTop: 12 }}>{c.telegramChat}
            <input name="telegramChat" autoComplete="off" placeholder="-1001234567890" defaultValue={s.webhook?.chatId ?? ""} style={field} />
          </label>
          <p style={{ marginTop: 20, marginBottom: 0 }}><button className="btn" type="submit">{c.save}</button></p>
        </form>
        {s.webhook ? (
          <form method="post" action="/api/agents/settings/test" style={{ marginBottom: 24 }}>
            <button className="btn ghost" type="submit">{c.test}</button>
          </form>
        ) : null}
        <h2 style={{ fontSize: 20 }}>{c.machines}</h2>
        <AgentConnectionScope lang={lang} />
        {machines.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>{c.machineCols.host}</th><th>{c.machineCols.created}</th><th>{c.machineCols.seen}</th><th></th></tr></thead>
              <tbody>
                {machines.map((m) => (
                  <tr key={m.id}>
                    <td>{m.hostLabel}</td>
                    <td>{when(m.createdAt, lang)}</td>
                    <td>{m.lastSeenAt ? when(m.lastSeenAt, lang) : fleet.never}</td>
                    <td>
                      <form method="post" action="/api/agents/tokens/revoke">
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn ghost" type="submit">{c.revoke}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>{c.noMachines}</p>}
      </section>
    </DashboardShell>
  );
}
