import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { test } from "node:test";
import { parseAgentBatch } from "../../lib/agents/ingest";
import type { Config } from "./config.js";
import { eventFromHook, runHook } from "./hook.js";

const cfg: Config = { origin: "http://127.0.0.1:9", token: "atk_test", secret: "s".repeat(64), host: "server1" };
const NOW = 1_800_000_000_000;

test("hook event never carries tool input, response, prompt or paths", () => {
  const input = {
    session_id: "raw-session", transcript_path: "/root/.claude/x.jsonl", cwd: "/root/kunde-geheim", hook_event_name: "PostToolUse",
    tool_name: "Bash", tool_input: { command: "cat /root/secret" }, tool_response: { output: "private", is_error: true }, prompt: "my prompt",
  };
  const event = eventFromHook("PostToolUse", input, cfg, NOW);
  assert.ok(event);
  assert.equal(event.type, "tool_end");
  assert.equal(event.ok, false);
  assert.equal(event.agent.name, "kunde-geheim");
  assert.equal(event.tool, "Bash");
  assert.doesNotMatch(JSON.stringify(event), /secret|private|transcript|raw-session|\/root|prompt/);
});

test("the server accepts what the hook builds", () => {
  const types = ["SessionStart", "PreToolUse", "PostToolUse", "Stop", "SubagentStop", "Notification", "SessionEnd"];
  const events = types.map((t) => eventFromHook(t, { session_id: "abc", cwd: "/x/proj", tool_name: "mcp__github__create_issue", tool_response: {} }, cfg, NOW)!);
  assert.deepEqual(events.map((e) => e.type), ["session_start", "tool_start", "tool_end", "turn_end", "subagent_end", "notification", "session_end"]);
  assert.equal(parseAgentBatch({ events }, NOW)?.events.length, 7);
  assert.equal(eventFromHook("UserPromptSubmit", { session_id: "abc" }, cfg, NOW), null);
  assert.equal(eventFromHook("SessionStart", "not an object", cfg, NOW), null);
});

test("same session hashes the same, different secrets differ", () => {
  const a = eventFromHook("Stop", { session_id: "s1", cwd: "/p" }, cfg, NOW)!;
  const b = eventFromHook("Stop", { session_id: "s1", cwd: "/p" }, cfg, NOW)!;
  const c = eventFromHook("Stop", { session_id: "s1", cwd: "/p" }, { ...cfg, secret: "t".repeat(64) }, NOW)!;
  assert.equal(a.run, b.run);
  assert.notEqual(a.run, c.run);
  assert.match(a.run, /^[0-9a-f]{64}$/);
});

test("runHook returns quickly when stdin never ends", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-hook-"));
  const started = performance.now();
  await runHook("Stop", new Readable({ read() {} }), { home, spawnFlush: false });
  assert.ok(performance.now() - started < 150, "runHook must not wait for stdin");
});

test("runHook spools the event", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-hook-"));
  const { writeConfig } = await import("./config.js");
  writeConfig(cfg, home);
  await runHook("Stop", Readable.from([JSON.stringify({ session_id: "s", cwd: "/p" })]), { home, spawnFlush: false });
  const lines = readFileSync(join(home, "spool.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]).type, "turn_end");
});

test("runHook is silent and exits 0 on garbage stdin and unreachable server", () => {
  const home = mkdtempSync(join(tmpdir(), "at-hook-"));
  for (const input of ["not json", JSON.stringify({ session_id: "x", cwd: "/p" })]) {
    const r = spawnSync(process.execPath, ["--import", "tsx", join(import.meta.dirname, "cli.ts"), "hook", "Stop"], {
      input, env: { ...process.env, AGENTTRACKING_HOME: home }, encoding: "utf8", timeout: 10_000,
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
    assert.equal(r.stderr, "");
  }
  assert.equal(existsSync(join(home, "spool.jsonl")), false, "without a config nothing is spooled");
});
