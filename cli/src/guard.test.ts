import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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

test("maxCallsPerTurn and maxTurnMinutes cap runaway autonomous loops and reset on new prompt", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-budget-"));
  await runGuardCommand(["--max-calls", "5", "--max-minutes", "10"], home);

  for (let i = 0; i < 4; i++) recordGuardOutcome("run-b", "tool_start", undefined, 1000 + i * 100, home);
  assert.equal(checkPreToolGuard("run-b", "app", "Bash", home, { now: 2000 }).block, false);

  recordGuardOutcome("run-b", "tool_start", undefined, 1500, home);
  const callCapped = checkPreToolGuard("run-b", "app", "Bash", home, { now: 2000 });
  assert.equal(callCapped.block, true);
  if (callCapped.block) assert.match(callCapped.reason, /5 tool calls in one autonomous turn/);

  // New prompt resets call count, then test maxTurnMinutes
  recordGuardOutcome("run-b", "turn_start", undefined, 10_000, home);
  assert.equal(checkPreToolGuard("run-b", "app", "Bash", home, { now: 10_000 + 9 * 60_000 }).block, false);
  const timeCapped = checkPreToolGuard("run-b", "app", "Bash", home, { now: 10_000 + 10 * 60_000 });
  assert.equal(timeCapped.block, true);
  if (timeCapped.block) assert.match(timeCapped.reason, /10 min/);
});

test("blockDestructive stops dangerous commands locally without persisting or spooling command contents", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-destr-"));
  writeConfig(cfg, home);
  await runGuardCommand(["--block-destructive", "on"], home);

  const secretCmd = "git push --force origin main # token=sk-ant-supersecret999";
  const blocked = captureStdout();
  await runHook("PreToolUse", Readable.from([JSON.stringify({
    session_id: "s1",
    cwd: "/work/app",
    tool_name: "Bash",
    tool_input: { command: secretCmd },
  })]), { home, spawnFlush: false, stdout: blocked.stream });

  const parsed = JSON.parse(blocked.output()) as { decision: string; reason: string };
  assert.equal(parsed.decision, "block");
  assert.match(parsed.reason, /git push --force/);
  assert.doesNotMatch(parsed.reason, /sk-ant-supersecret999/);

  // Safe force-with-lease is allowed
  const safe = checkPreToolGuard("r1", "app", "Bash", home, { toolInput: { command: "git push --force-with-lease origin feat" } });
  assert.equal(safe.block, false);

  // Verify spool never contains the command or secret
  const spooled = readFileSync(join(home, "spool.jsonl"), "utf8");
  assert.doesNotMatch(spooled, /sk-ant-supersecret999|origin main/);
});
