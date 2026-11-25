import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { applyLocalFixes } from "./fix.js";

test("applyLocalFixes arms guard, pins unpinned npx MCPs, externalizes secrets safely, writes backup and raises score to 100/100 Grade A", async () => {
  const root = mkdtempSync(join(tmpdir(), "at-fix-"));
  const home = join(root, "at-home");
  const userHome = join(root, "user-home");
  const cwd = join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(userHome, ".claude"), { recursive: true });
  mkdirSync(cwd, { recursive: true });

  const settingsPath = join(userHome, ".claude", "settings.json");
  writeFileSync(settingsPath, JSON.stringify({
    hooks: { PreToolUse: [{ matcher: "", hooks: [{ type: "command", command: "agenttracking hook pre" }] }] },
    mcpServers: {
      context7: { command: "npx", args: ["-y", "@upstash/context7-mcp@latest"] },
      github: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_super_secret_token_do_not_leak" },
      },
    },
  }, null, 2));

  try {
    const res = await applyLocalFixes({
      home,
      userHome,
      cwd,
      crontabText: "",
      resolveVersion: async (pkg) => {
        if (pkg === "@upstash/context7-mcp") return "1.0.21";
        if (pkg === "@modelcontextprotocol/server-github") return "2026.4.1";
        return null;
      },
    });

    assert.equal(res.before.score, 40);
    assert.equal(res.before.grade, "D");
    assert.equal(res.after.score, 100);
    assert.equal(res.after.grade, "A");
    assert.equal(res.guardUpdated, true);
    assert.equal(res.pinnedPackages.length, 2);
    assert.equal(res.movedSecrets.length, 1);
    assert.equal(res.backups.length, 1);

    const updated = JSON.parse(readFileSync(settingsPath, "utf8")) as {
      mcpServers: {
        context7: { args: string[] };
        github: { args: string[]; env: { GITHUB_PERSONAL_ACCESS_TOKEN: string } };
      };
    };
    assert.equal(updated.mcpServers.context7.args[1], "@upstash/context7-mcp@1.0.21");
    assert.equal(updated.mcpServers.github.args[1], "@modelcontextprotocol/server-github@2026.4.1");
    assert.equal(updated.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN, "${GITHUB_PERSONAL_ACCESS_TOKEN}");

    const secretsEnv = readFileSync(join(home, "secrets.env"), "utf8");
    assert.ok(secretsEnv.includes('export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_super_secret_token_do_not_leak"'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
