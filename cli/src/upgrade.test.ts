import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { connectClaude, defaultCommand } from "./connect-claude.js";
import { agyPathFor, codexPathFor, connectAgy, cursorPathFor, geminiPathFor } from "./connect-harnesses.js";
import { compareSemver, isConfirmedDefaultYes, isHomebrewInstall, parseVersionFromInstaller, refreshConnectedHooks } from "./upgrade.js";

test("upgrade prompt defaults to Yes on empty Enter and accepts y/yes/j/ja", () => {
  assert.equal(isConfirmedDefaultYes(""), true);
  assert.equal(isConfirmedDefaultYes("   "), true);
  assert.equal(isConfirmedDefaultYes("y"), true);
  assert.equal(isConfirmedDefaultYes("Y"), true);
  assert.equal(isConfirmedDefaultYes("yes"), true);
  assert.equal(isConfirmedDefaultYes("j"), true);
  assert.equal(isConfirmedDefaultYes("ja"), true);
  assert.equal(isConfirmedDefaultYes("n"), false);
  assert.equal(isConfirmedDefaultYes("no"), false);
});

test("semver comparison and installer version parsing work cleanly", () => {
  assert.equal(compareSemver("0.6.2", "0.6.3"), -1);
  assert.equal(compareSemver("0.6.3", "0.6.3"), 0);
  assert.equal(compareSemver("0.7.0", "0.6.9"), 1);
  assert.equal(parseVersionFromInstaller('#!/bin/sh\nVERSION="0.6.3"\necho hi\n'), "0.6.3");
  assert.equal(isHomebrewInstall("/opt/homebrew/Cellar/agenttracking/0.6.2/libexec/dist/upgrade.js"), true);
  assert.equal(isHomebrewInstall("/root/.agenttracking/pkg/0.6.2/dist/upgrade.js"), false);
});

test("refreshConnectedHooks updates only already-connected harnesses and leaves unconnected/foreign configs untouched", () => {
  const userHome = mkdtempSync(join(tmpdir(), "at-upgrade-home-"));
  const atHome = mkdtempSync(join(tmpdir(), "at-upgrade-cfg-"));
  const claudePath = join(userHome, ".claude", "settings.json");
  const agyPath = agyPathFor("user", userHome);
  const cursorPath = cursorPathFor("user", userHome);
  const geminiPath = geminiPathFor("user", userHome);
  const codexPath = codexPathFor(userHome);

  // Connect Claude Code & Antigravity to an old 0.6.4 runtime, plus keep foreign entries
  mkdirSync(join(userHome, ".claude"), { recursive: true });
  writeFileSync(claudePath, JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "echo foreign" }] }] } }));
  connectClaude({ settingsPath: claudePath, command: defaultCommand("/old/runtime/0.6.4/cli.js") });

  mkdirSync(join(userHome, ".gemini", "config"), { recursive: true });
  writeFileSync(agyPath, JSON.stringify({ "lint-checker": { Stop: [{ type: "command", command: "echo lint" }] } }));
  connectAgy({ settingsPath: agyPath, command: defaultCommand("/old/runtime/0.6.4/cli.js") });

  // Codex has a foreign notify entry (must stay untouched)
  mkdirSync(join(userHome, ".codex"), { recursive: true });
  writeFileSync(codexPath, 'notify = ["echo", "custom-notify"]\n');

  // Refresh to 0.6.6 runtime
  const first = refreshConnectedHooks({ userHome, home: atHome, claudeSettingsPath: claudePath, cliPath: "/new/runtime/0.6.6/cli.js" });
  assert.deepEqual(first.updated, ["Claude Code", "Antigravity (agy)"]);
  assert.deepEqual(first.already, []);

  const claudeJson = readFileSync(claudePath, "utf8");
  assert.match(claudeJson, /\/new\/runtime\/0\.6\.6\/cli\.js/);
  assert.doesNotMatch(claudeJson, /0\.6\.4/);
  assert.match(claudeJson, /echo foreign/);

  const agyJson = readFileSync(agyPath, "utf8");
  assert.match(agyJson, /\/new\/runtime\/0\.6\.6\/cli\.js/);
  assert.doesNotMatch(agyJson, /0\.6\.4/);
  assert.match(agyJson, /lint-checker/);

  // Unconnected harnesses are NOT created; foreign Codex notify is untouched
  assert.equal(existsSync(cursorPath), false);
  assert.equal(existsSync(geminiPath), false);
  assert.equal(readFileSync(codexPath, "utf8"), 'notify = ["echo", "custom-notify"]\n');

  // Running again is idempotent
  const second = refreshConnectedHooks({ userHome, home: atHome, claudeSettingsPath: claudePath, cliPath: "/new/runtime/0.6.6/cli.js" });
  assert.deepEqual(second.updated, []);
  assert.deepEqual(second.already, ["Claude Code", "Antigravity (agy)"]);
});
