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

test("CursorStop clears turn call budget and timer so separate turns do not accumulate", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-cursor-"));
  writeConfig(cfg, home);
  await runGuardCommand(["--max-calls", "5", "--max-minutes", "10"], home);

  for (let i = 0; i < 4; i++) {
    const out = captureStdout();
    await runHook("CursorBeforeShell", Readable.from([JSON.stringify({
      conversation_id: "cur-1", workspace_roots: ["/work/app"], command: "echo ok",
    })]), { home, spawnFlush: false, stdout: out.stream });
    assert.equal(out.output(), "");
  }

  // Turn completes via CursorStop -> clears counters/timer
  await runHook("CursorStop", Readable.from([JSON.stringify({
    conversation_id: "cur-1", workspace_roots: ["/work/app"], status: "completed",
  })]), { home, spawnFlush: false });

  // Next turn starts fresh: 4 more calls are allowed without hitting the 5-call limit
  for (let i = 0; i < 4; i++) {
    const out = captureStdout();
    await runHook("CursorBeforeShell", Readable.from([JSON.stringify({
      conversation_id: "cur-1", workspace_roots: ["/work/app"], command: "echo ok",
    })]), { home, spawnFlush: false, stdout: out.stream });
    assert.equal(out.output(), "");
  }
});

test("Antigravity guard accumulates across mid-turn invocations, stops once tripped, and recovers on next prompt", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-guard-agy-"));
  writeConfig(cfg, home);
  await runGuardCommand(["--max-calls", "5", "--max-failures", "2"], home);

  const send = async (hookEvent: string, payload: Record<string, unknown>) => {
    const out = captureStdout();
    await runHook(hookEvent, Readable.from([JSON.stringify(payload)]), { home, spawnFlush: false, stdout: out.stream });
    return JSON.parse(out.output()) as Record<string, unknown>;
  };

  // Start turn + 3 tool calls across two mid-turn invocations
  assert.deepEqual(await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" }), {});
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(await send("AgyPostToolUse", { conversationId: "agy-1", cwd: "/work/app", toolCall: { id: `c${i}`, name: "read_file" } }), {});
  }
  // Mid-turn invocation must NOT wipe the call counter
  assert.deepEqual(await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" }), {});
  for (let i = 3; i < 5; i++) {
    assert.deepEqual(await send("AgyPostToolUse", { conversationId: "agy-1", cwd: "/work/app", toolCall: { id: `c${i}`, name: "read_file" } }), {});
  }

  // Next invocation trips maxCallsPerTurn (5) and terminates the runaway turn cleanly
  const blocked = await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" });
  assert.equal(blocked.terminationBehavior, "terminate");

  // Because the terminated turn's budget was cleared, the user's next prompt works without deadlocking
  assert.deepEqual(await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" }), {});

  // Manual pause, however, stays active across invocations until `agenttracking resume`
  await runPause(["--reason", "deploy freeze"], home);
  const paused = await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" });
  assert.equal(paused.terminationBehavior, "terminate");
  const stillPaused = await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" });
  assert.equal(stillPaused.terminationBehavior, "terminate");

  await runResume([], home);
  assert.deepEqual(await send("AgyPreInvocation", { conversationId: "agy-1", cwd: "/work/app" }), {});
});
