import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { runInquiryBrowserCheck, validateRunnerTarget } from "./task-runner";
import { runInquiryTask, taskRun } from "./task-runs";
import { addSite, closeDb, ensureAccount } from "./db";
import { recordTaskFix, siteVersionsFor } from "./task-fixes";

describe("deterministic Chrome inquiry check", () => {
  let server: ReturnType<typeof createServer>;
  let origin: string;
  let retestFixed = false;
  const oldEnv = process.env.TRACKING_RUNNER_LOCAL;
  const oldNode = process.env.NODE_ENV;
  before(async () => {
    process.env.TRACKING_RUNNER_LOCAL = "1"; process.env.TRACKING_RUNNER_TEST_TIMEOUT_MS = "3000"; Reflect.set(process.env, "NODE_ENV", "test");
    process.env.TRACKING_DB = ":memory:"; closeDb(); ensureAccount("runner@example.com"); addSite("example.com", "runner@example.com");
    server = createServer((request, response) => {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><form id="agenttracking-test-form" data-agenttracking-test="true"><input name="name"><input name="email"><textarea name="message"></textarea><button type="submit">Submit</button></form><script>document.querySelector('form').addEventListener('submit', e => { e.preventDefault(); if (${JSON.stringify(request.url === "/fixed" || request.url === "/retest" && retestFixed)} && document.querySelector('[name="email"]').value.endsWith('@example.invalid')) document.body.insertAdjacentHTML('beforeend','<p data-agenttracking-success="true">Saved</p>') })</script>`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  after(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); closeDb(); delete process.env.TRACKING_DB; delete process.env.TRACKING_RUNNER_TEST_TIMEOUT_MS; if (oldEnv === undefined) delete process.env.TRACKING_RUNNER_LOCAL; else process.env.TRACKING_RUNNER_LOCAL = oldEnv; if (oldNode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", oldNode); });

  it("rejects private and production targets outside isolated mode", async () => {
    await assert.rejects(validateRunnerTarget("example.com", "http://127.0.0.2/"));
    await assert.rejects(validateRunnerTarget("example.com", "https://example.com/"));
  });

  it("fails then passes the same local inquiry task after the fixture is fixed", async () => {
    const beforeRun = await runInquiryBrowserCheck("example.com", `${origin}/broken`);
    assert.notEqual(beforeRun.result, "passed");
    const afterRun = await runInquiryBrowserCheck("example.com", `${origin}/fixed`);
    assert.equal(afterRun.result, "passed", JSON.stringify(afterRun));
    assert.ok(afterRun.steps.includes("success_marker_found"));
  });

  it("persists synthetic runs with idempotent run IDs and site scope", async () => {
    const input = { domain: "example.com", owner: "runner@example.com", runId: "run_1234567890123456", targetUrl: `${origin}/fixed`, releaseId: "release_123456789012" };
    const first = await runInquiryTask(input);
    assert.equal(first.result, "passed", JSON.stringify(first));
    assert.equal(first.synthetic, true);
    assert.equal(first.mode, "deterministic_browser");
    assert.equal(taskRun("example.com", input.runId)?.runId, first.runId);
    assert.equal((await runInquiryTask(input)).startedAt, first.startedAt);
    await assert.rejects(runInquiryTask({ ...input, owner: "stranger@example.com", runId: "run_2234567890123456" }), /site_forbidden/);
    assert.equal(taskRun("stranger.example", input.runId), null);
  });

  it("links a real failed run, documented fix and successful retest on the same task", async () => {
    const base = { domain: "example.com", owner: "runner@example.com", targetUrl: `${origin}/retest` };
    const beforeRun = await runInquiryTask({ ...base, runId: "run_before_1234567890", releaseId: "release_before_12345", toolVersion: "tool_before_12345678", schemaVersion: "schema_stable_123456" });
    assert.equal(beforeRun.result, "timed_out");
    retestFixed = true;
    const afterRun = await runInquiryTask({ ...base, runId: "run_after_12345678901", releaseId: "release_after_123456", toolVersion: "tool_after_123456789", schemaVersion: "schema_stable_123456" });
    assert.equal(afterRun.result, "passed", JSON.stringify(afterRun));
    const fix = recordTaskFix({ domain: base.domain, owner: base.owner, fixId: "fix_1234567890123456", beforeRunId: beforeRun.runId, afterRunId: afterRun.runId, description: "Corrected the test form success handler" });
    assert.equal(fix.comparison, "controlled_browser_retest");
    assert.equal(fix.outcome, "confirmed_by_browser_retest");
    assert.deepEqual(fix.sample, { before: 1, after: 1, beforeUnknown: 1, afterUnknown: 0 });
    assert.equal(siteVersionsFor(base.domain).filter((v) => v.kind === "release").length, 3);
    assert.throws(() => recordTaskFix({ ...base, fixId: "fix_2234567890123456", beforeRunId: afterRun.runId, afterRunId: beforeRun.runId, description: "Wrong order" }), /invalid_run_pair/);
  });
});
