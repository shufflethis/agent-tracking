import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchRanges, inCidr, parseIp, rangeEvidence, rangeSourceHealth, verifiable, verifyAgent, type Ranges } from "./bot-ranges";

describe("cidr", () => {
  it("matches v4 and v6 prefixes and refuses junk", () => {
    assert.equal(inCidr("132.196.86.7", "132.196.86.0/24"), true);
    assert.equal(inCidr("132.196.87.7", "132.196.86.0/24"), false);
    assert.equal(inCidr("107.20.236.150", "107.20.236.150/32"), true);
    assert.equal(inCidr("2001:4860:4801:2008::1", "2001:4860:4801:2008::/64"), true);
    assert.equal(inCidr("2001:4860:4801:2009::1", "2001:4860:4801:2008::/64"), false);
    assert.equal(inCidr("::ffff:132.196.86.7", "132.196.86.0/24"), true);
    assert.equal(inCidr("132.196.86.7", "2001:db8::/32"), false);
    assert.equal(inCidr("not an ip", "10.0.0.0/8"), false);
    assert.equal(parseIp("1.2.3"), null);
    assert.equal(parseIp("1:2:3:4:5:6:7:8:9"), null);
  });
});

describe("verifyAgent", () => {
  const ranges: Ranges = { fetchedAt: new Date().toISOString(), updatedAt: { "openai-gptbot": new Date().toISOString(), "perplexity-bot": new Date().toISOString() }, lists: { "openai-gptbot": ["132.196.86.0/24"], "perplexity-bot": ["107.20.236.150/32"] } };
  it("answers true, false or null depending on whether there is a list", () => {
    assert.equal(verifyAgent("gptbot", "132.196.86.9", ranges), true);
    assert.equal(verifyAgent("gptbot", "5.5.5.5", ranges), false);
    assert.equal(verifyAgent("claudebot", "5.5.5.5", ranges), null);
    assert.equal(verifyAgent("chatgpt-user", "5.5.5.5", ranges), null, "a vendor whose list failed to load is not verifiable today");
    assert.equal(verifyAgent("gptbot", "5.5.5.5", null), null);
    assert.equal(verifiable("gptbot"), true);
    assert.equal(verifiable("claudebot"), false);
  });
  it("separates missing, stale, mismatch and no published list", () => {
    const now = Date.UTC(2026, 8, 25, 12);
    const sample: Ranges = { fetchedAt: new Date(now).toISOString(), lists: { "openai-gptbot": ["132.196.86.0/24"] }, updatedAt: { "openai-gptbot": new Date(now).toISOString() } };
    assert.equal(rangeEvidence("gptbot", "132.196.86.9", sample, now).status, "verified");
    assert.equal(rangeEvidence("gptbot", "5.5.5.5", sample, now).status, "mismatch");
    assert.equal(rangeEvidence("chatgpt-user", "5.5.5.5", sample, now).status, "missing");
    assert.equal(rangeEvidence("claudebot", "5.5.5.5", sample, now).status, "unavailable");
    assert.equal(rangeEvidence("gptbot", "132.196.86.9", sample, now + 73 * 3_600_000).status, "stale");
    assert.equal(rangeEvidence("gptbot", "unknown", sample, now).status, "missing");
    assert.equal(rangeSourceHealth(sample, now).find((row) => row.key === "openai-gptbot")?.status, "fresh");
    assert.equal(rangeSourceHealth(sample, now + 73 * 3_600_000).find((row) => row.key === "openai-gptbot")?.status, "stale");
  });
});

describe("fetchRanges", () => {
  it("keeps the previous list for a source that fails", async () => {
    const previous: Ranges = { fetchedAt: "old", lists: { "openai-gptbot": ["1.1.1.0/24"] }, updatedAt: { "openai-gptbot": "2026-09-01T00:00:00.000Z" } };
    const fake = (async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("gptbot.json")) return new Response("nope", { status: 500 });
      return new Response(JSON.stringify({ prefixes: [{ ipv4Prefix: "9.9.9.0/24" }] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const { ranges, failed } = await fetchRanges(previous, fake);
    assert.deepEqual(failed, ["openai-gptbot"]);
    assert.deepEqual(ranges.lists["openai-gptbot"], ["1.1.1.0/24"]);
    assert.deepEqual(ranges.lists["perplexity-bot"], ["9.9.9.0/24"]);
    assert.equal(ranges.updatedAt?.["openai-gptbot"], "2026-09-01T00:00:00.000Z");
    assert.ok(ranges.failedAt?.["openai-gptbot"]);
    assert.ok(ranges.updatedAt?.["perplexity-bot"]);
  });
});
