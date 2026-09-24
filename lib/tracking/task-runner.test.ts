import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { runInquiryBrowserCheck, validateRunnerTarget } from "./task-runner";
import { runInquiryTask, taskRun } from "./task-runs";
import { addSite, closeDb, ensureAccount } from "./db";

describe("deterministic Chrome inquiry check", () => {
  let server: ReturnType<typeof createServer>;
  let origin: string;
  const oldEnv = process.env.TRACKING_RUNNER_LOCAL;
  const oldNode = process.env.NODE_ENV;
  before(async () => {
    process.env.TRACKING_RUNNER_LOCAL = "1"; Reflect.set(process.env, "NODE_ENV", "test");
    process.env.TRACKING_DB = ":memory:"; closeDb(); ensureAccount("runner@example.com"); addSite("example.com", "runner@example.com");
    server = createServer((request, response) => {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(`<!doctype html><form id="agenttracking-test-form" data-agenttracking-test="true"><input name="name"><input name="email"><textarea name="message"></textarea><button type="submit">Submit</button></form><script>document.querySelector('form').addEventListener('submit', e => { e.preventDefault(); if (${JSON.stringify(request.url)} === '/fixed' && document.querySelector('[name="email"]').value.endsWith('@example.invalid')) document.body.insertAdjacentHTML('beforeend','<p data-agenttracking-success="true">Saved</p>') })</script>`);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  after(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); closeDb(); delete process.env.TRACKING_DB; if (oldEnv === undefined) delete process.env.TRACKING_RUNNER_LOCAL; else process.env.TRACKING_RUNNER_LOCAL = oldEnv; if (oldNode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", oldNode); });

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
});
