import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CLI_FILE, CLI_SHA256 } from "./format";

test("the published CLI checksum matches the file that is served", () => {
  const actual = createHash("sha256").update(readFileSync(`public/downloads/${CLI_FILE}`)).digest("hex");
  assert.equal(actual, CLI_SHA256, "rebuilt the CLI tarball? update CLI_SHA256 in lib/agents/format.ts");
});
