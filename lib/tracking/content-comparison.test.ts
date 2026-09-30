import assert from "node:assert/strict";
import { it } from "node:test";
import { compareContentCaptures } from "./content-comparison";
import type { ContentCapture } from "./content-checks";

const before: ContentCapture = {
  domain: "fixture.example", pagePath: "/pricing", runId: "before", contentVersion: "a",
  contentHash: "hash-a", method: "visible-source-html-v1", verifierVersion: "1", capturedAt: 1,
  results: [{ checkId: "price", label: "Price", expectedText: "$99", alternatives: [], status: "not_found", matchedText: null, evidence: null }],
};
const after: ContentCapture = { ...before, runId: "after", contentVersion: "b", contentHash: "hash-b", capturedAt: 2,
  results: [{ ...before.results[0], status: "found", matchedText: "$99", evidence: "Price $99" }] };

it("compares distinct versions of the same site and page using identical check criteria", () => {
  const comparison = compareContentCaptures(before, after);
  assert.equal(comparison.valid, true);
  assert.equal(comparison.checksChanged, false);
  assert.equal(comparison.rows[0].old.status, "not_found");
  assert.equal(comparison.rows[0].next.status, "found");
  for (const capture of [before, { ...after, domain: "other.example" }, { ...after, pagePath: "/other" }, { ...after, contentVersion: "a" }]) {
    assert.equal(compareContentCaptures(before, capture).valid, false);
  }
});

it("names changed methods, checker versions, criteria and uncheckable conditions", () => {
  const comparison = compareContentCaptures(before, { ...after, method: "different", verifierVersion: "2",
    results: [{ ...after.results[0], status: "uncheckable", alternatives: ["99 USD"] }] });
  assert.equal(comparison.methodChanged, true);
  assert.equal(comparison.verifierChanged, true);
  assert.equal(comparison.checksChanged, true);
  assert.equal(comparison.uncheckable, true);
  assert.deepEqual(comparison.rows, []);
  assert.equal(compareContentCaptures(before, { ...after, results: [] }).checksChanged, true);
});
