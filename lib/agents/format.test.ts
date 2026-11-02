import assert from "node:assert/strict";
import { test } from "node:test";
import { duration, every } from "./format";

test("duration and interval labels", () => {
  assert.equal(duration(420), "420 ms");
  assert.equal(duration(42_000), "42 s");
  assert.equal(duration(30 * 60_000), "30 min");
  assert.equal(duration(3 * 3_600_000), "3.0 h");
  assert.equal(duration(null), "");
  assert.equal(every(86_400_000), "1d");
  assert.equal(every(7_200_000), "2h");
  assert.equal(every(1_800_000), "30m");
});
