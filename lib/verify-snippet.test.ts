import assert from "node:assert/strict";
import { test } from "node:test";

import { snippetInstalled } from "./verify-snippet";

const TAG = '<script defer data-domain="geo-tool.com" src="https://agenttracking.co/agent.js"></script>';

/** A fetch that answers a scripted chain of responses, recording the URLs it was asked for. */
function fakeFetch(steps: Array<{ status: number; location?: string; body?: string }>) {
  const seen: string[] = [];
  const impl = async (url: string) => {
    seen.push(url);
    const step = steps[seen.length - 1];
    if (!step) throw new Error(`unexpected fetch of ${url}`);
    return new Response(step.body ?? "", {
      status: step.status,
      headers: step.location ? { location: step.location } : {},
    });
  };
  return { impl: impl as unknown as typeof fetch, seen };
}

const publicHost = async () => {};

test("a locale redirect on the same host is followed", async () => {
  const { impl, seen } = fakeFetch([
    { status: 307, location: "/en" },
    { status: 200, body: `<html><head>${TAG}</head></html>` },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.deepEqual(found, { ok: true });
  assert.deepEqual(seen, ["https://geo-tool.com/", "https://geo-tool.com/en"]);
});

test("a redirect to the www host of the same site is followed", async () => {
  const { impl, seen } = fakeFetch([
    { status: 308, location: "https://www.geo-tool.com/" },
    { status: 200, body: `<html>${TAG}</html>` },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.deepEqual(found, { ok: true });
  assert.equal(seen[1], "https://www.geo-tool.com/");
});

test("a redirect to a foreign host names that host and stops", async () => {
  const { impl, seen } = fakeFetch([{ status: 301, location: "https://example.org/" }]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
  assert.match((found as { detail: string }).detail, /example\.org/);
  assert.equal(seen.length, 1, "the foreign host is never fetched");
});

test("a chain that drifts off the site stops at the foreign hop", async () => {
  const { impl } = fakeFetch([
    { status: 307, location: "https://www.geo-tool.com/" },
    { status: 307, location: "https://app.geo-tool.com/" },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
  assert.match((found as { detail: string }).detail, /app\.geo-tool\.com/);
});

test("an endless same-host redirect loop gives up", async () => {
  const steps = Array.from({ length: 9 }, () => ({ status: 307, location: "/en" }));
  const { impl, seen } = fakeFetch(steps);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
  assert.ok(seen.length <= 6, `gave up after ${seen.length} fetches`);
});

test("a downgrade to http is refused", async () => {
  const { impl } = fakeFetch([{ status: 307, location: "http://geo-tool.com/en" }]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
});

test("every hop is checked against the private-host rule", async () => {
  const checked: string[] = [];
  const { impl } = fakeFetch([
    { status: 307, location: "https://www.geo-tool.com/" },
    { status: 200, body: `<html>${TAG}</html>` },
  ]);
  await snippetInstalled("geo-tool.com", {
    fetchImpl: impl,
    assertHost: async (h) => {
      checked.push(h);
    },
  });
  assert.deepEqual(checked, ["geo-tool.com", "www.geo-tool.com"]);
});

test("a 3xx without a location is a failure, not a crawl", async () => {
  const { impl } = fakeFetch([{ status: 302 }]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
});

test("the snippet is read from the final body only", async () => {
  const { impl } = fakeFetch([
    { status: 307, location: "/en", body: `<html>${TAG}</html>` },
    { status: 200, body: "<html>nothing here</html>" },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
});

test("a mismatched data-domain is still refused", async () => {
  const { impl } = fakeFetch([
    { status: 200, body: '<script data-domain="other.com" src="https://agenttracking.co/agent.js"></script>' },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
  assert.match((found as { detail: string }).detail, /data-domain/);
});

test("agent.js served from a stranger is refused", async () => {
  const { impl } = fakeFetch([
    { status: 200, body: '<script data-domain="geo-tool.com" src="https://evil.example/agent.js"></script>' },
  ]);
  const found = await snippetInstalled("geo-tool.com", { fetchImpl: impl, assertHost: publicHost });
  assert.equal(found.ok, false);
});
