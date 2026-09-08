import { strict as assert } from "node:assert";
import { test } from "node:test";
import { safeNext } from "./safe-next";

test("safeNext keeps same-origin paths and refuses everything else", () => {
  assert.equal(safeNext("/app/example.com"), "/app/example.com");
  assert.equal(safeNext("/app?add=example.com"), "/app?add=example.com");
  assert.equal(safeNext("//evil.example/x"), "/app");
  assert.equal(safeNext("https://evil.example"), "/app");
  assert.equal(safeNext("/x y"), "/app");
  assert.equal(safeNext("app"), "/app");
  assert.equal(safeNext(undefined), "/app");
});
