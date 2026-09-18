import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  botShaped,
  emptyStore,
  loadSuggestions,
  markTriaged,
  mergeUnknown,
  pending,
  PROPOSE_AT,
  saveSuggestions,
  tokenFor,
  triage,
  type UnknownAgent,
} from "./agent-triage";

const KEY = "test-key";
const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const NEWBOT = "Mozilla/5.0 (compatible; ExampleAI-Bot/1.2; +https://example.ai/bot)";

const agent = (over: Partial<UnknownAgent> = {}): UnknownAgent => ({
  ua: NEWBOT,
  hits: 12,
  firstSeen: 1,
  lastSeen: 2,
  ...over,
});

function fakeFetch(body: unknown, status = 200) {
  const calls: { init: RequestInit }[] = [];
  const impl = (async (_url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const answer = (noul: number, choice: string, confidence = 0.9) => ({
  model: "jev-1.13",
  answers: { is_agent: { type: "noul", noul }, kind: { type: "choice", choice, confidence } },
});

/**
 * The filter is the whole privacy argument, so it is pinned from both sides: a
 * browser must never pass it, and the strings this is built for must.
 */
describe("botShaped", () => {
  it("never lets a browser through", () => {
    assert.equal(botShaped(CHROME), false);
    assert.equal(botShaped(IPHONE), false);
    assert.equal(botShaped(""), false);
    assert.equal(botShaped("   "), false);
    assert.equal(botShaped("x".repeat(600)), false);
  });

  it("lets the strings it exists for through", () => {
    assert.equal(botShaped(NEWBOT), true);
    assert.equal(botShaped("SomeCrawler/2.0"), true);
    assert.equal(botShaped("python-requests/2.32.3"), true);
    assert.equal(botShaped("curl/8.5.0"), true);
    assert.equal(botShaped("Mozilla/5.0 (compatible; Whatever/1.0; +http://whatever.test/about)"), true);
  });
});

describe("tokenFor", () => {
  it("picks the product name and skips the boilerplate", () => {
    assert.equal(tokenFor(NEWBOT), "exampleai-bot");
    assert.equal(tokenFor("Mozilla/5.0 AppleWebKit/537.36 NewFetcher/3.1"), "newfetcher");
    assert.equal(tokenFor("SomeBot"), "somebot");
    assert.equal(tokenFor("Mozilla/5.0"), null);
  });
});

describe("mergeUnknown", () => {
  it("folds case, sums hits and refuses anything not bot-shaped", () => {
    const first = mergeUnknown(emptyStore(), [{ ua: NEWBOT, hits: 3 }, { ua: CHROME, hits: 900 }], 100);
    assert.equal(first.agents.length, 1);
    assert.equal(first.agents[0].hits, 3);

    const second = mergeUnknown(first, [{ ua: NEWBOT.toUpperCase(), hits: 4 }], 200);
    assert.equal(second.agents.length, 1);
    assert.equal(second.agents[0].hits, 7);
    assert.equal(second.agents[0].firstSeen, 100);
    assert.equal(second.agents[0].lastSeen, 200);
    // The first spelling seen is the one a person reads.
    assert.equal(second.agents[0].ua, NEWBOT);
  });

  it("keeps the busiest when it runs out of room", () => {
    const many = Array.from({ length: 600 }, (_, i) => ({ ua: `Example${i}Bot/1.0`, hits: i }));
    const store = mergeUnknown(emptyStore(), many, 1);
    assert.equal(store.agents.length, 500);
    assert.equal(store.agents[0].hits, 599);
  });
});

describe("pending", () => {
  it("skips what has already been asked about", () => {
    const store = mergeUnknown(emptyStore(), [{ ua: NEWBOT, hits: 5 }, { ua: "OtherBot/1.0", hits: 4 }], 1);
    const marked = markTriaged(store, [NEWBOT.toUpperCase()], 50);
    assert.deepEqual(
      pending(marked, 10).map((a) => a.ua),
      ["OtherBot/1.0"],
    );
  });
});

describe("triage", () => {
  it("asks nothing without a key", async () => {
    const { impl, calls } = fakeFetch(answer(0.9, "crawler"));
    assert.equal(await triage([agent()], { fetchImpl: impl, apiKey: "" }), null);
    assert.equal(calls.length, 0);
  });

  it("sends the string and nothing else", async () => {
    const { impl, calls } = fakeFetch(answer(0.9, "crawler"));
    await triage([agent()], { fetchImpl: impl, apiKey: KEY });
    const sent = JSON.parse(String(calls[0].init.body));
    assert.deepEqual(Object.keys(sent.state), ["userAgent"]);
    assert.equal(sent.state.userAgent, NEWBOT);
    assert.deepEqual(Object.keys(sent.questions).sort(), ["is_agent", "kind"]);
  });

  it("proposes a confident agent and derives its token", async () => {
    const { impl } = fakeFetch(answer(0.95, "crawler"));
    const outcome = await triage([agent()], { fetchImpl: impl, apiKey: KEY });
    assert.ok(outcome);
    const [s] = outcome.suggestions;
    assert.equal(s.propose, true);
    assert.equal(s.kind, "crawler");
    assert.equal(s.token, "exampleai-bot");
    assert.equal(s.hits, 12);
  });

  /**
   * Both gates have to hold on their own, or a string that is plainly not an
   * agent could still arrive as a suggestion on the strength of one number.
   */
  it("proposes nothing below the threshold or classified as none", async () => {
    const low = await triage([agent()], { fetchImpl: fakeFetch(answer(PROPOSE_AT - 0.01, "crawler")).impl, apiKey: KEY });
    assert.equal(low?.suggestions[0].propose, false);

    const none = await triage([agent()], { fetchImpl: fakeFetch(answer(0.99, "none")).impl, apiKey: KEY });
    assert.equal(none?.suggestions[0].propose, false);
  });

  it("records a failure instead of throwing, and keeps going", async () => {
    let n = 0;
    const impl = (async () => {
      n += 1;
      if (n === 1) return new Response("{}", { status: 529 });
      return new Response(JSON.stringify(answer(0.9, "fetcher")), { status: 200 });
    }) as unknown as typeof fetch;

    const outcome = await triage([agent(), agent({ ua: "OtherBot/1.0" })], { fetchImpl: impl, apiKey: KEY });
    assert.ok(outcome);
    assert.equal(outcome.failures.length, 1);
    assert.match(outcome.failures[0], /529/);
    assert.equal(outcome.suggestions.length, 1);
    assert.equal(outcome.suggestions[0].ua, "OtherBot/1.0");
  });

  it("drops an answer it cannot read rather than inventing one", async () => {
    const { impl } = fakeFetch({ model: "jev-1.13", answers: { is_agent: { noul: 0.9 } } });
    const outcome = await triage([agent()], { fetchImpl: impl, apiKey: KEY });
    assert.equal(outcome?.suggestions.length, 0);
    assert.equal(outcome?.failures.length, 1);
  });
});

describe("the suggestions file", () => {
  it("keeps one row per string, worth-reading first", () => {
    const dir = mkdtempSync(join(tmpdir(), "triage-"));
    const path = join(dir, "suggestions.json");
    try {
      const base = { token: "b", kind: "crawler" as const, agentProbability: 0.9, kindConfidence: 0.9, hits: 1, firstSeen: 1, lastSeen: 1, model: "jev-1.13" };
      saveSuggestions([{ ...base, ua: "OldBot/1.0", decidedAt: 10, propose: false }], path);
      saveSuggestions(
        [
          { ...base, ua: "OldBot/1.0", decidedAt: 20, propose: true },
          { ...base, ua: "NewBot/1.0", decidedAt: 20, propose: false },
        ],
        path,
      );

      const rows = loadSuggestions(path);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].ua, "OldBot/1.0");
      // The newer decision wins for a string already on file.
      assert.equal(rows[0].decidedAt, 20);
      assert.equal(rows[0].propose, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
