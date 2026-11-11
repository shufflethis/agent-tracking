import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { writeConfig } from "./config.js";
import { connectClaude, defaultCommand } from "./connect-claude.js";
import { formatDoctorReport, inspectMachine, parseCrontab } from "./doctor.js";

test("parseCrontab finds unwrapped and wrapped schedules and masks secrets in preview", () => {
  const cron = `
# Nightly jobs
SHELL=/bin/bash
@reboot /usr/local/bin/boot.sh
0 3 * * * /opt/scripts/nightly-backup.sh --token sk-ant-api03-abcdefgh12345678
*/15 * * * * agenttracking wrap --name sync --every 15m -- /opt/sync.py
@daily python3 /srv/leads/enrich_leads.py
`;
  const jobs = parseCrontab(cron);
  assert.equal(jobs.length, 3);
  assert.equal(jobs[0].wrapped, false);
  assert.equal(jobs[0].suggestedName, "nightly-backup");
  assert.equal(jobs[0].suggestedEvery, "24h");
  assert.doesNotMatch(jobs[0].preview, /sk-ant-api03/);
  assert.match(jobs[0].preview, /\[masked\]/);

  assert.equal(jobs[1].wrapped, true);
  assert.equal(jobs[2].wrapped, false);
  assert.equal(jobs[2].suggestedName, "enrich_leads".replace("_", "_"));
  assert.equal(jobs[2].suggestedEvery, "24h");
});

test("inspectMachine reports connection, hooks, MCP counts without leaking secrets", () => {
  const root = mkdtempSync(join(tmpdir(), "at-doctor-"));
  const home = join(root, "at-home");
  const userHome = join(root, "user");
  const cwd = join(root, "proj");
  mkdirSync(join(userHome, ".claude"), { recursive: true });
  mkdirSync(cwd, { recursive: true });

  writeConfig({ origin: "https://agenttracking.co", token: "atk_secret_tok", secret: "a".repeat(64), host: "prod-1" }, home);
  connectClaude({ settingsPath: join(userHome, ".claude", "settings.json"), command: defaultCommand("/bin/agenttracking") });
  writeFileSync(join(cwd, ".mcp.json"), JSON.stringify({
    mcpServers: {
      stripe: { env: { STRIPE_KEY: "rk_live_supersecret12345" } },
      github: { url: "https://mcp.private.internal" },
    },
  }));

  const report = inspectMachine({
    home,
    userHome,
    cwd,
    crontabText: "0 2 * * * /usr/local/bin/invoice-run.sh\n",
  });
  assert.equal(report.connected?.host, "prod-1");
  assert.equal(report.claudeUserHooks, "connected");
  assert.equal(report.mcpServersTotal, 2);
  assert.equal(report.cronJobs.length, 1);

  const text = formatDoctorReport(report);
  assert.match(text, /invoice-run/);
  assert.doesNotMatch(text, /rk_live_supersecret|mcp\.private\.internal|atk_secret_tok/);
});
