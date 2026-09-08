import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { emailConfigured, sendMail } from "../lib/email";
import { fetchRanges, loadRanges, rangesFile } from "../lib/tracking/bot-ranges";
import { button, layout, paragraph } from "../lib/email-layout";
import { fetchScore } from "../lib/tracking/score";
import { SITE_ORIGIN } from "../lib/site";
import { allSites, closeDb, getAccount, pruneRaw, setScore } from "../lib/tracking/db";
import { planFor } from "../lib/tracking/plans";

/**
 * The nightly tracking run.
 *
 *   0. Refresh the published crawler address ranges (lib/tracking/bot-ranges.ts).
 *   1. Prune raw events past retention (the ingest route does it too, once a
 *      day per process; this catches a day with no traffic).
 *   2. Re-scan every verified site whose check score is older than 30 days,
 *      so the dashboard's score line stays current without anyone visiting
 *      the check page. The score comes from the check service over HTTP.
 *   3. Tell Pro and Agency owners when their manifest changed since the last
 *      run, once per change.
 *
 * Crontab line (not installed by this script):
 *   40 7 * * * /bin/bash /root/agent-tracking/scripts/tracking-cron.sh
 * The server-log import is its own script, scripts/log-import.ts, every quarter hour.
 */

const say = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const MONTH = 30 * 86_400_000;

async function main() {
  const now = Date.now();
  say(`pruned ${pruneRaw(now)} raw event(s) past retention`);

  // The published crawler ranges, for the log import's verification.
  const { ranges, failed } = await fetchRanges(loadRanges());
  mkdirSync(dirname(rangesFile()), { recursive: true });
  writeFileSync(rangesFile(), JSON.stringify(ranges));
  say(`bot ranges: ${Object.keys(ranges.lists).length} list(s)${failed.length ? `, failed: ${failed.join(", ")}` : ""}`);

  const sites = allSites();
  say(`${sites.length} site(s) on file`);

  for (const site of sites) {
    if (!site.verified_at) continue;
    if (site.last_scanned_at && now - site.last_scanned_at < MONTH) continue;
    try {
      const scored = await fetchScore(site.domain);
      if (!scored.ok) {
        say(`SKIP ${site.domain}: ${scored.detail}`);
        continue;
      }
      setScore(site.domain, scored.score, scored.grade, now);
      say(`scored ${site.domain}: ${scored.score} (${scored.grade})`);
    } catch (err) {
      say(`SKIP ${site.domain}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (emailConfigured()) {
    for (const site of sites) {
      // A change noticed in the last day, for an account whose plan includes alerts.
      if (!site.manifest_changed_at || now - site.manifest_changed_at > 86_400_000) continue;
      const account = getAccount(site.owner);
      if (!account || !planFor(account.plan).manifestAlerts) continue;
      const url = `${SITE_ORIGIN}/app/${encodeURIComponent(site.domain)}/tools`;
      const subject = `${site.domain}: the WebMCP manifest changed`;
      const sent = await sendMail({
        to: [{ email: site.owner }],
        subject,
        text: `The manifest at https://${site.domain}/.well-known/webmcp is different from the one we last saw. If that was you, nothing to do. If not, look at the tools view:\n${url}\n`,
        html: layout({ title: subject, body: paragraph(`The manifest at <code>/.well-known/webmcp</code> on <strong>${site.domain}</strong> is different from the one we last saw. If that was you, nothing to do.`) + button(url, "Open the tools view") }),
        tags: ["manifest-alert"],
        ledger: { family: "manifest-alert", host: site.domain },
      });
      say(sent.ok ? `manifest alert sent for ${site.domain}` : `MAIL FAILED ${site.domain}: ${sent.reason}`);
    }
  }

  closeDb();
  say("done");
}

main().catch((err) => {
  say(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exitCode = 1;
});
