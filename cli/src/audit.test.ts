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

test("audit flags unpinned npx MCPs, cleartext http MCPs, inline secrets, broad permissions and missing guard without leaking secret values", () => {
  withSandbox(({ home, userHome, cwd }) => {
    mkdirSync(join(userHome, ".claude"), { recursive: true });
    writeFileSync(join(userHome, ".claude", "settings.json"), JSON.stringify({
      permissions: { allow: ["Bash(*)", "Read"] },
      mcpServers: {
        unpinned: { command: "npx", args: ["-y", "@example/mcp-server"], env: { API_TOKEN: "super-secret-value-99999" } },
        cleartext: { url: "http://mcp.remote.example.com/sse" },
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

    const text = formatAuditReport(r);
    assert.ok(!text.includes("super-secret-value-99999"), "secret values must never appear in audit output");
    assert.ok(text.includes("[HIGH]"));
    assert.ok(text.includes("unpinned npx"));
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
  });
});
