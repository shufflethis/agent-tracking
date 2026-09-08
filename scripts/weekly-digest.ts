import { SITE_ORIGIN } from "../lib/site";
import { emailConfigured, sendMail } from "../lib/email";
import { mintDigestToken } from "../lib/session";
import { loadDashboard } from "../lib/tracking/dashboard";
import { accountsWithDigest, closeDb, sitesFor } from "../lib/tracking/db";
import { renderDigestMail, worthSending, type DigestSite } from "../lib/tracking/digest";

/**
 * Monday morning: one mail per account that has sites with anything to say.
 * Accounts with digest = 0, and weeks with nothing, get nothing.
 *
 * Crontab line (not installed by this script):
 *   50 7 * * 1 /bin/bash /root/agent-tracking/scripts/weekly-digest.sh
 */

const say = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function main() {
  if (!emailConfigured()) {
    say("email not configured; nothing sent");
    return;
  }
  const accounts = accountsWithDigest();
  say(`${accounts.length} account(s) with the digest on`);
  let sent = 0;
  for (const account of accounts) {
    const sites: DigestSite[] = sitesFor(account.email).map((s) => ({
      domain: s.domain,
      dash: loadDashboard(s.domain, 7),
      dashboardUrl: `${SITE_ORIGIN}/app/${encodeURIComponent(s.domain)}`,
    }));
    if (sites.length === 0 || !worthSending(sites)) continue;
    const unsubscribeUrl = `${SITE_ORIGIN}/api/digest?off=${encodeURIComponent(mintDigestToken(account.email))}`;
    const mail = renderDigestMail(sites, unsubscribeUrl);
    const result = await sendMail({
      to: [{ email: account.email }],
      ...mail,
      tags: ["digest"],
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      ledger: { family: "digest" },
    });
    if (result.ok) sent++;
    say(result.ok ? `sent to ${account.email}: ${mail.subject}` : `MAIL FAILED ${account.email}: ${result.reason}`);
  }
  say(`done: ${sent} digest(s) sent`);
  closeDb();
}

main().catch((err) => {
  say(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exitCode = 1;
});
