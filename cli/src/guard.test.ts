import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { test } from "node:test";
import { writeConfig, type Config } from "./config.js";
import { checkPreToolGuard, recordGuardOutcome, runGuardCommand, runPause, runResume } from "./guard.js";
import { runHook } from "./hook.js";

const cfg: Config = { origin: "http://127.0.0.1:9", token: "atk_test", secret: "s".repeat(64), host: "server1" };

function captureStdout(): { stream: Writable; output(): string } {
  let buf = "";
  const stream = new Writable({
    write(chunk, _enc, cb) { buf += String(chunk); cb(); },
  });
  return { stream, output: () => buf };
}

test("guard is silent and inactive by default", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-"));
  writeConfig(cfg, home);
  const out = captureStdout();
  await runHook("PreToolUse", Readable.from([JSON.stringify({ session_id: "s1", cwd: "/work/app", tool_name: "Bash" })]), {
    home, spawnFlush: false, stdout: out.stream,
  });
  assert.equal(out.output(), "");
  assert.equal(existsSync(join(home, "guard.json")), false);
});

test("pause blocks PreToolUse locally and resume clears it", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-"));
  writeConfig(cfg, home);
  await runPause(["--agent", "app", "--reason", "deploy freeze"], home);

  const blocked = captureStdout();
  await runHook("PreToolUse", Readable.from([JSON.stringify({ session_id: "s1", cwd: "/work/app", tool_name: "Bash" })]), {
    home, spawnFlush: false, stdout: blocked.stream,
  });
  const parsed = JSON.parse(blocked.output()) as { decision: string; reason: string };
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /deploy freeze/);

  // Another project is unaffected when --agent targets "app"
  const other = captureStdout();
  await runHook("PreToolUse", Readable.from([JSON.stringify({ session_id: "s2", cwd: "/work/other", tool_name: "Bash" })]), {
    home, spawnFlush: false, stdout: other.stream,
  });
  assert.equal(other.output(), "");

  await runResume([], home);
  const after = captureStdout();
  await runHook("PreToolUse", Readable.from([JSON.stringify({ session_id: "s1", cwd: "/work/app", tool_name: "Bash" })]), {
    home, spawnFlush: false, stdout: after.stream,
  });
  assert.equal(after.output(), "");
});

test("maxConsecutiveFailures trips after N failures and resets on new prompt", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-"));
  await runGuardCommand(["--max-failures", "3"], home);

  recordGuardOutcome("run-a", "tool_end", false, 1000, home);
  recordGuardOutcome("run-a", "tool_end", false, 2000, home);
  assert.equal(checkPreToolGuard("run-a", "app", "Bash", home).block, false);

  recordGuardOutcome("run-a", "tool_end", false, 3000, home);
  const tripped = checkPreToolGuard("run-a", "app", "Bash", home);
  assert.equal(tripped.block, true);

  // New user prompt resets streak
  recordGuardOutcome("run-a", "turn_start", undefined, 4000, home);
  assert.equal(checkPreToolGuard("run-a", "app", "Bash", home).block, false);
});
