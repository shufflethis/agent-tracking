import { emailConfigured, sendMail } from "../lib/email";
import { SITE_ORIGIN } from "../lib/site";
import { dashLang } from "../lib/tracking/copy";
import { closeDb, getAccount } from "../lib/tracking/db";
import { briefingWorthSending, buildBriefing, renderBriefingMail } from "../lib/agents/briefing";
import { dueBriefingOwners, markBriefed, sendAlerts } from "../lib/agents/notify";
import { applyStatus } from "../lib/agents/status";

/**
 * Agent monitoring, every quarter hour:
 *   1. mark runs hung or missed (lib/agents/status.ts),
 *   2. send immediate alerts, once per run,
 *   3. send the morning briefing to accounts whose hour has come (last 24 hours).
 *
 * Crontab line (not installed by this script):
 *   *\/15 * * * * /bin/bash /root/agent-tracking/scripts/agents-cron.sh
 */

const BRIEFING_WINDOW_MS = 24 * 3_600_000;

async function main() {
  const now = Date.now();
  const status = applyStatus(now);
  console.log(`status: ${status.newlyHung.length} hung, ${status.newlyMissed.length} missed`);
  if (!emailConfigured()) console.log("email: BREVO_API_KEY missing, alert and briefing mails will fail");
  console.log(`alerts: ${await sendAlerts(now)} sent`);
  let briefed = 0;
  for (const owner of dueBriefingOwners(now)) {
    const briefing = buildBriefing(owner, now - BRIEFING_WINDOW_MS, now);
    if (briefingWorthSending(briefing)) {
      const mail = renderBriefingMail(briefing, dashLang(getAccount(owner)?.lang), `${SITE_ORIGIN}/app/fleet`);
      const result = await sendMail({ to: [{ email: owner }], subject: mail.subject, text: mail.text, html: mail.html, ledger: { family: "agent-briefing" } });
      if (!result.ok) { console.log(`briefing: ${owner.replace(/^(.).*@/, "$1***@")} failed: ${result.reason}`); continue; }
      briefed++;
    }
    markBriefed(owner, now);
  }
  console.log(`briefings: ${briefed} sent`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => closeDb());
