import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { connectAgy, connectCodex, connectCursor, connectGemini, disconnectAgy, disconnectCodex, disconnectCursor, disconnectGemini } from "./connect-harnesses.js";

const cmd = (event: string) => `"/usr/bin/node" "/home/u/.agenttracking/runtime/0.5.0/cli.js" hook ${event} --from=agenttracking`;

test("Cursor connect preserves foreign hooks, backs up, and disconnects cleanly", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-cursor-"));
  const file = join(dir, "hooks.json");
  writeFileSync(file, JSON.stringify({ version: 1, hooks: { stop: [{ command: "echo custom" }] } }));

  assert.equal(connectCursor({ settingsPath: file, command: cmd }), "connected");
  assert.equal(connectCursor({ settingsPath: file, command: cmd }), "already");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { version: number; hooks: Record<string, { command: string }[]> };
  assert.equal(parsed.hooks.stop.length, 2);
  assert.equal(parsed.hooks.stop[0].command, "echo custom");
  assert.match(parsed.hooks.beforeShellExecution[0].command, /CursorBeforeShell/);

  assert.equal(disconnectCursor({ settingsPath: file }), "disconnected");
  const after = JSON.parse(readFileSync(file, "utf8")) as { hooks: Record<string, { command: string }[]> };
  assert.deepEqual(after.hooks, { stop: [{ command: "echo custom" }] });
});

test("Gemini CLI connect merges hooks safely without touching MCP servers", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-gemini-"));
  const file = join(dir, "settings.json");
  writeFileSync(file, JSON.stringify({ mcpServers: { demo: { url: "https://example.com/mcp" } } }));

  assert.equal(connectGemini({ settingsPath: file, command: cmd }), "connected");
  assert.equal(connectGemini({ settingsPath: file, command: cmd }), "already");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { mcpServers: unknown; hooks: Record<string, unknown[]> };
  assert.ok(parsed.mcpServers);
  assert.ok(parsed.hooks.BeforeTool);

  assert.equal(disconnectGemini({ settingsPath: file }), "disconnected");
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { mcpServers: { demo: { url: "https://example.com/mcp" } } });
});

test("Codex CLI inserts notify before first TOML table and refuses to clobber foreign notify", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-codex-"));
  const file = join(dir, "config.toml");
  writeFileSync(file, `model = "gpt-5-codex"\n\n[mcp_servers.docs]\ncommand = "npx"\n`);

  assert.equal(connectCodex({ configPath: file, execPath: "/usr/bin/node", cliPath: "/opt/at/cli.js" }), "connected");
  assert.equal(connectCodex({ configPath: file, execPath: "/usr/bin/node", cliPath: "/opt/at/cli.js" }), "already");

  const toml = readFileSync(file, "utf8");
  const notifyIdx = toml.indexOf("notify =");
  const tableIdx = toml.indexOf("[mcp_servers.docs]");
  assert.ok(notifyIdx > -1 && notifyIdx < tableIdx, "notify must stay at TOML root scope before [table]");

  assert.equal(disconnectCodex({ configPath: file }), "disconnected");
  assert.equal(readFileSync(file, "utf8").includes("notify ="), false);

  // Foreign notify is never overwritten
  writeFileSync(file, `notify = ["my-custom-notifier"]\n`);
  assert.equal(connectCodex({ configPath: file, execPath: "/usr/bin/node", cliPath: "/opt/at/cli.js" }), "foreign_notify");
  assert.equal(readFileSync(file, "utf8"), `notify = ["my-custom-notifier"]\n`);
});

test("Antigravity (agy) connect writes named hook group without touching foreign hook groups", () => {
  const dir = mkdtempSync(join(tmpdir(), "at-agy-"));
  const file = join(dir, "hooks.json");
  writeFileSync(file, JSON.stringify({ "lint-checker": { PostToolUse: [{ matcher: "run_command", hooks: [{ command: "./lint.sh" }] }] } }));

  assert.equal(connectAgy({ settingsPath: file, command: cmd }), "connected");
  assert.equal(connectAgy({ settingsPath: file, command: cmd }), "already");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, unknown>>;
  assert.ok(parsed["lint-checker"]);
  assert.ok(parsed.agenttracking.SessionStart);
  assert.ok(parsed.agenttracking.PostToolUse);
  assert.ok(parsed.agenttracking.Stop);

  assert.equal(disconnectAgy({ settingsPath: file }), "disconnected");
  const after = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  assert.ok(after["lint-checker"]);
  assert.equal("agenttracking" in after, false);
});
