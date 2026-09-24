import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { emailConfigured, sendMail } from "../lib/email";
import { fetchRanges, loadRanges, rangesFile } from "../lib/tracking/bot-ranges";
import { loadStore, markTriaged, pending, saveStore, saveSuggestions, suggestionsFile, triage } from "../lib/tracking/agent-triage";
import { button, layout, paragraph } from "../lib/email-layout";
import { fetchScore } from "../lib/tracking/score";
import { SITE_ORIGIN } from "../lib/site";
import { allSites, closeDb, dueScanSites, finishScanAttempt, getAccount, pruneRaw, recordSiteCheck, scanSchedulerHeartbeat, startScanAttempt } from "../lib/tracking/db";
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
 *   4. Ask about the user agents the log import could not place, and write the
 *      answers out as suggested entries for ai-sources.json. Suggestions only:
 *      nothing here is counted, and without TYPESAFE_API_KEY nothing is asked.
 *
 * Crontab line (not installed by this script):
 *   40 7 * * * /bin/bash /root/agent-tracking/scripts/tracking-cron.sh
 * The server-log import is its own script, scripts/log-import.ts, every quarter hour.
 */

const say = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
/** A ceiling on a nightly bill that nobody is watching. */
const TRIAGE_PER_NIGHT = Number(process.env.AGENT_TRIAGE_LIMIT ?? 40);

async function main() {
  const now = Date.now();
  scanSchedulerHeartbeat(now);
  say(`pruned ${pruneRaw(now)} raw event(s) past retention`);

  // The published crawler ranges, for the log import's verification.
  const { ranges, failed } = await fetchRanges(loadRanges());
  mkdirSync(dirname(rangesFile()), { recursive: true });
  writeFileSync(rangesFile(), JSON.stringify(ranges));
  say(`bot ranges: ${Object.keys(ranges.lists).length} list(s)${failed.length ? `, failed: ${failed.join(", ")}` : ""}`);

  const sites = allSites();
  say(`${sites.length} site(s) on file`);

  for (const domain of dueScanSites(now)) {
    const testId = startScanAttempt(domain, Date.now());
    if (!testId) continue;
    try {
      const scored = await fetchScore(domain);
      finishScanAttempt(domain, testId, scored, Date.now());
      recordSiteCheck(domain, { testId, kind: "score", attemptedAt: now, success: scored.ok, detailCode: scored.ok ? "scored" : scored.code });
      if (!scored.ok) {
        say(`SCAN FAILED ${domain}: ${scored.code}`);
        continue;
      }
      say(`scored ${domain}: ${scored.score} (${scored.grade})`);
    } catch (err) {
      finishScanAttempt(domain, testId, { ok: false, code: "unexpected_error" }, Date.now());
      recordSiteCheck(domain, { testId, kind: "score", attemptedAt: now, success: false, detailCode: "unexpected_error" });
      say(`SCAN FAILED ${domain}: unexpected_error`);
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

  // The agents nobody has added to the list yet. Dozens of requests at most,
  // one per string, deduplicated across every site and every quarter-hourly
  // import since the last run. See lib/tracking/agent-triage.ts for what does
  // and does not leave this server.
  const store = loadStore();
  const waiting = pending(store, TRIAGE_PER_NIGHT);
  if (waiting.length === 0) {
    say(`agent triage: nothing unplaced (${store.agents.length} string(s) on file)`);
  } else {
    const outcome = await triage(waiting);
    if (!outcome) {
      say(`agent triage: ${waiting.length} string(s) waiting, no TYPESAFE_API_KEY configured`);
    } else {
      saveSuggestions(outcome.suggestions);
      saveStore(markTriaged(store, outcome.suggestions.map((s) => s.ua), now));
      const proposed = outcome.suggestions.filter((s) => s.propose);
      say(`agent triage: asked about ${outcome.asked}, ${proposed.length} worth adding to ai-sources.json → ${suggestionsFile()}`);
      for (const s of proposed) say(`  ${s.kind} p=${s.agentProbability} token=${s.token ?? "?"} hits=${s.hits} ${s.ua.slice(0, 80)}`);
      for (const f of outcome.failures) say(`  SKIP ${f}`);
    }
  }

  closeDb();
  say("done");
}

main().catch((err) => {
  say(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exitCode = 1;
});
