import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { connectClaude, defaultCommand, disconnectClaude, mergeHooks, removeHooks } from "./connect-claude.js";

const cmd = (event: string) => `"/usr/bin/node" "/home/u/.agenttracking/runtime/0.1.0/cli.js" hook ${event}`;
type Settings = { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]> };

test("merge keeps foreign hooks", () => {
  const before = { theme: "dark", hooks: { PostToolUse: [{ matcher: "Edit", hooks: [{ type: "command", command: "echo mine" }] }] } };
  const after = mergeHooks(before, cmd) as Settings & { theme: string };
  assert.equal(after.theme, "dark");
  assert.equal(after.hooks.PostToolUse.length, 2);
  assert.equal(after.hooks.PostToolUse[0].hooks[0].command, "echo mine");
  assert.match(after.hooks.PostToolUse[1].hooks[0].command, /agenttracking.*hook PostToolUse$/);
  assert.equal(after.hooks.PostToolUse[1].matcher, "*");
  assert.equal(after.hooks.Stop[0].matcher, undefined);
  assert.deepEqual(Object.keys(after.hooks).sort(), ["Notification", "PostToolUse", "PostToolUseFailure", "PreToolUse", "SessionEnd", "SessionStart", "Stop", "StopFailure", "SubagentStart", "SubagentStop", "UserPromptSubmit"]);
});

test("merge is idempotent and replaces an older runtime path", () => {
  const once = mergeHooks({}, cmd);
  const twice = mergeHooks(once, (e) => cmd(e).replace("0.1.0", "0.2.0")) as Settings;
  assert.equal(twice.hooks.Stop.length, 1);
  assert.match(twice.hooks.Stop[0].hooks[0].command, /0\.2\.0/);
});

test("remove only removes ours", () => {
  const merged = mergeHooks({ hooks: { Stop: [{ hooks: [{ type: "command", command: "say done" }] }] } }, cmd);
  const removed = removeHooks(merged) as Settings;
  assert.deepEqual(Object.keys(removed.hooks), ["Stop"]);
  assert.equal(removed.hooks.Stop[0].hooks[0].command, "say done");
  assert.deepEqual(removeHooks(mergeHooks({ model: "x" }, cmd)), { model: "x" });
});

test("invalid json is never overwritten", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-claude-"));
  const file = join(dir, "settings.json");
  writeFileSync(file, '{"hooks":');
  assert.equal(connectClaude({ settingsPath: file, command: cmd }), "invalid_json");
  assert.equal(readFileSync(file, "utf8"), '{"hooks":');
  assert.equal(disconnectClaude({ settingsPath: file }), "invalid_json");
});

test("backup is written before change, and a second connect reports already", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-claude-"));
  const file = join(dir, "settings.json");
  writeFileSync(file, JSON.stringify({ model: "opus" }));
  assert.equal(connectClaude({ settingsPath: file, command: cmd }), "connected");
  const backups = readdirSync(dir).filter((f) => f.startsWith("settings.json.agenttracking-backup-"));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, backups[0]), "utf8")), { model: "opus" });
  assert.equal(JSON.parse(readFileSync(file, "utf8")).model, "opus");
  assert.equal(connectClaude({ settingsPath: file, command: cmd }), "already");
  assert.equal(disconnectClaude({ settingsPath: file }), "disconnected");
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { model: "opus" });
});

test("missing settings file is created", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-claude-"));
  const file = join(dir, "nested", "settings.json");
  assert.equal(connectClaude({ settingsPath: file, command: cmd }), "connected");
  assert.ok((JSON.parse(readFileSync(file, "utf8")) as Settings).hooks.SessionStart);
});

test("our hooks are recognised whatever the runtime path", () => {
  const plain = (event: string) => defaultCommand("/tmp/x/runtime/0.1.0/cli.js")(event);
  const merged = mergeHooks({ hooks: { Stop: [{ hooks: [{ type: "command", command: "/usr/bin/foo hook Stop" }] }] } }, plain);
  const removed = removeHooks(merged) as Settings;
  assert.deepEqual(Object.keys(removed.hooks), ["Stop"]);
  assert.equal(removed.hooks.Stop[0].hooks[0].command, "/usr/bin/foo hook Stop");
});
