import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { writeConfig } from "./config.js";
import type { AgentEvent } from "./event.js";
import { parseEvery, wrap } from "./wrap.js";

const setup = () => {
  const home = mkdtempSync(join(tmpdir(), "at-wrap-"));
  writeConfig({ origin: "http://127.0.0.1:9", token: "atk_x", secret: "s".repeat(64), host: "server1" }, home);
  return home;
};
const spooled = (home: string): AgentEvent[] => {
  for (const f of ["spool.jsonl", "inflight.jsonl"]) {
    try { return readFileSync(join(home, f), "utf8").trim().split("\n").map((l) => JSON.parse(l)); } catch { /* next */ }
  }
  return [];
};
const opts = (home: string) => ({ home, flushTimeoutMs: 50, quiet: true });

test("wrap passes exit code through and reports start and end", async () => {
  const home = setup();
  const code = await wrap(["--name", "backup", "--every", "24h", "--", "sh", "-c", "echo out; echo err >&2; exit 3"], opts(home));
  assert.equal(code, 3);
  const events = spooled(home);
  assert.deepEqual(events.map((e) => e.type), ["cron_start", "cron_end"]);
  assert.equal(events[0].expectEveryMs, 86_400_000);
  assert.equal(events[1].exitCode, 3);
  assert.equal(events[0].run, events[1].run);
  assert.equal(events[1].agent.name, "backup");
  assert.equal(events[1].tail, undefined, "no tail by default");
  assert.ok((events[1].durationMs ?? -1) >= 0);
});

test("signal maps to 128+n", async () => {
  const home = setup();
  assert.equal(await wrap(["--name", "sig", "--", "sh", "-c", "kill -TERM $$"], opts(home)), 143);
});

test("tail is masked and limited", async () => {
  const home = setup();
  const script = "for i in 1 2 3 4 5 6; do echo line$i >&2; done; echo 'Authorization: Bearer abc.def' >&2; echo 'token ghp_1234567890abcdefXYZ' >&2; echo 'password=hunter2' >&2; exit 1";
  assert.equal(await wrap(["--name", "t", "--tail", "4", "--", "sh", "-c", script], opts(home)), 1);
  const tail = spooled(home)[1].tail ?? "";
  assert.equal(tail.split("\n").length, 4);
  assert.doesNotMatch(tail, /abc\.def|ghp_1234|hunter2/);
  assert.match(tail, /line6/);
});

test("unknown command exits 127 and is reported as failed", async () => {
  const home = setup();
  assert.equal(await wrap(["--name", "nope", "--", "definitely-not-a-command-xyz"], opts(home)), 127);
  assert.equal(spooled(home)[1].exitCode, 127);
});

test("without config the command still runs", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-wrap-"));
  assert.equal(await wrap(["--name", "x", "--", "sh", "-c", "exit 0"], opts(home)), 0);
  assert.deepEqual(spooled(home), []);
});

test("bad usage returns 2 without running anything", async () => {
  const home = setup();
  assert.equal(await wrap(["--", "true"], opts(home)), 2);
  assert.equal(await wrap(["--name", "x"], opts(home)), 2);
});

test("parseEvery", () => {
  assert.equal(parseEvery("30m"), 1_800_000);
  assert.equal(parseEvery("2h"), 7_200_000);
  assert.equal(parseEvery("7d"), 604_800_000);
  assert.equal(parseEvery("soon"), null);
});
