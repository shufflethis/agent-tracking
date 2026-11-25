import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { formatAuditReport, runLocalAudit } from "./audit.js";
import { writeGuard } from "./guard.js";

function withSandbox(fn: (dirs: { home: string; userHome: string; cwd: string }) => void) {
  const root = mkdtempSync(join(tmpdir(), "at-audit-"));
  const home = join(root, "at-home");
  const userHome = join(root, "user-home");
  const cwd = join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(userHome, { recursive: true });
  mkdirSync(cwd, { recursive: true });
  try {
    fn({ home, userHome, cwd });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("audit flags exact MCP server names, files and env key names without EVER leaking secret values", () => {
  withSandbox(({ home, userHome, cwd }) => {
    mkdirSync(join(userHome, ".claude"), { recursive: true });
    writeFileSync(join(userHome, ".claude", "settings.json"), JSON.stringify({
      permissions: { allow: ["Bash(*)", "Read"] },
      mcpServers: {
        playwright: { command: "npx", args: ["-y", "@playwright/mcp"], env: { API_TOKEN: "super-secret-value-99999" } },
        cleartextSrv: { url: "http://mcp.remote.example.com/sse" },
        localOk: { url: "http://127.0.0.1:8787/mcp" },
      },
    }));

    const r = runLocalAudit({ home, userHome, cwd, crontabText: "0 3 * * * /opt/nightly.sh\n" });
    assert.equal(r.mcpServersTotal, 3);
    assert.equal(r.unpinnedNpxMcps, 1);
    assert.equal(r.cleartextHttpMcps, 1);
    assert.equal(r.mcpInlineSecretsCount, 1);
    assert.equal(r.broadPermissionCount, 1);
    assert.equal(r.unwrappedCronCount, 1);
    assert.equal(r.guardActive, false);
    assert.ok(r.score < 50, `expected low score, got ${r.score}`);

    const text = formatAuditReport(r, { color: false });
    assert.ok(!text.includes("super-secret-value-99999"), "secret values must never appear in audit output");
    assert.ok(text.includes("playwright"), "must name the specific unpinned MCP server");
    assert.ok(text.includes("@playwright/mcp"), "must name the unpinned npx package");
    assert.ok(text.includes("API_TOKEN"), "must name the flagged env key");
    assert.ok(text.includes("~/.claude/settings.json"), "must show which config file to edit");
    assert.ok(text.includes("NEXT STEPS TO REACH GRADE A"), "must include concrete step-by-step plan");

    const shared = formatAuditReport(r, { color: false, share: true });
    assert.ok(!shared.includes("~/.claude/settings.json"), "share mode must hide local file paths");
    assert.ok(!shared.includes("super-secret-value-99999"), "share mode must never leak secret values");
  });
});

test("audit gives grade A when guard, hooks, pinned MCPs and wrapped crons are configured", () => {
  withSandbox(({ home, userHome, cwd }) => {
    mkdirSync(join(userHome, ".claude"), { recursive: true });
    writeFileSync(join(userHome, ".claude", "settings.json"), JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "", hooks: [{ type: "command", command: "agenttracking hook pre" }] }] },
      permissions: { allow: ["Read", "Grep"] },
      mcpServers: {
        pinned: { command: "npx", args: ["-y", "@vendor/mcp-server@1.4.2"], env: { API_KEY: "${API_KEY}" } },
        secure: { url: "https://mcp.example.com/mcp" },
      },
    }));
    writeGuard({ maxConsecutiveFailures: 5, maxCallsPerTurn: 80, maxTurnMinutes: 45, blockDestructive: true }, home);

    const r = runLocalAudit({ home, userHome, cwd, crontabText: "0 3 * * * agenttracking wrap --name nightly --every 24h -- /opt/nightly.sh\n" });
    assert.equal(r.grade, "A");
    assert.equal(r.score, 100);
    assert.equal(r.harnessesConnected, 1);
    assert.equal(r.unpinnedNpxMcps, 0);
    assert.equal(r.cleartextHttpMcps, 0);
    assert.equal(r.mcpInlineSecretsCount, 0);
    assert.equal(r.unwrappedCronCount, 0);

    const text = formatAuditReport(r, { color: false });
    assert.ok(text.includes("Grade A!"));
  });
});
