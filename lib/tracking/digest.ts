import { SITE_HOST } from "@/lib/site";
import { escapeHtml } from "../email";
import { button, heading, layout, paragraph } from "../email-layout";
import { AGENT_LABELS } from "./classify";
import type { Dashboard } from "./dashboard";
import { interactions } from "./dashboard";

/**
 * The weekly mail: one per account, one block per site, numbers only.
 * Nothing in it that is not on the dashboard; the point is to bring people
 * back to the dashboard, not to replace it.
 */

export type DigestSite = { domain: string; dash: Dashboard; dashboardUrl: string };

export function worthSending(sites: DigestSite[]): boolean {
  return sites.some((s) => interactions(s.dash.overview) > 0 || s.dash.agents.some((a) => a.unverified > 0));
}

export function renderDigestMail(sites: DigestSite[], unsubscribeUrl: string): { subject: string; text: string; html: string } {
  const total = sites.reduce((n, s) => n + interactions(s.dash.overview), 0);
  const subject = sites.length === 1 ? `${sites[0].domain}: ${total} agent interaction${total === 1 ? "" : "s"} this week` : `${total} agent interaction${total === 1 ? "" : "s"} across ${sites.length} sites this week`;

  const textBlocks: string[] = [];
  const htmlBlocks: string[] = [];
  for (const s of sites) {
    const o = s.dash.overview.totals;
    const topAgents = s.dash.agents.slice(0, 3).map((a) => `${a.label} ${a.count}${a.unverified ? ` (+${a.unverified} unverified)` : ""}`);
    const topPages = s.dash.pages.slice(0, 3).map((p) => `${p.path} ${p.fetches + p.calls}`);
    const failing = s.dash.tools.filter((t) => t.errors > 0).map((t) => `${t.name} ${t.errors} error${t.errors === 1 ? "" : "s"}`);
    const bursts = s.dash.agents.reduce((n, a) => n + a.bursts, 0);
    const lines = [
      `${o.referrals} referral${o.referrals === 1 ? "" : "s"}, ${o.fetches} fetch${o.fetches === 1 ? "" : "es"}, ${o.calls} tool call${o.calls === 1 ? "" : "s"}, ${o.conversions} conversion${o.conversions === 1 ? "" : "s"}${bursts ? `, ${bursts} fetch burst${bursts === 1 ? "" : "s"}` : ""}.`,
      topAgents.length ? `Agents: ${topAgents.join(", ")}.` : "No agent seen this week.",
      topPages.length ? `Pages: ${topPages.join(", ")}.` : "",
      failing.length ? `Tools with errors: ${failing.join(", ")}.` : "",
    ].filter(Boolean);
    textBlocks.push(`${s.domain}\n${lines.map((l) => `  ${l}`).join("\n")}\n  ${s.dashboardUrl}`);
    htmlBlocks.push(heading(s.domain) + lines.map((l) => paragraph(escapeHtml(l))).join("") + button(s.dashboardUrl, "Open the dashboard"));
  }

  const text = `Your Agent Tracking week on ${SITE_HOST}.\n\n${textBlocks.join("\n\n")}\n\nStop these mails: ${unsubscribeUrl}\n`;
  const html = layout({
    title: subject,
    preheader: subject,
    body: htmlBlocks.join(""),
    unsubscribeUrl,
    unsubscribeReason: `You receive this weekly because you track a site on ${SITE_HOST}.`,
    unsubscribeLabel: "Stop the digest",
  });
  return { subject, text, html };
}

export const agentLabel = (id: string) => AGENT_LABELS[id] ?? id;
