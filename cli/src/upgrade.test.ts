import assert from "node:assert/strict";
import { test } from "node:test";
import { compareSemver, isConfirmedDefaultYes, isHomebrewInstall, parseVersionFromInstaller } from "./upgrade.js";

test("upgrade prompt defaults to Yes on empty Enter and accepts y/yes/j/ja", () => {
  assert.equal(isConfirmedDefaultYes(""), true);
  assert.equal(isConfirmedDefaultYes("   "), true);
  assert.equal(isConfirmedDefaultYes("y"), true);
  assert.equal(isConfirmedDefaultYes("Y"), true);
  assert.equal(isConfirmedDefaultYes("yes"), true);
  assert.equal(isConfirmedDefaultYes("j"), true);
  assert.equal(isConfirmedDefaultYes("ja"), true);
  assert.equal(isConfirmedDefaultYes("n"), false);
  assert.equal(isConfirmedDefaultYes("no"), false);
});

test("semver comparison and installer version parsing work cleanly", () => {
  assert.equal(compareSemver("0.6.2", "0.6.3"), -1);
  assert.equal(compareSemver("0.6.3", "0.6.3"), 0);
  assert.equal(compareSemver("0.7.0", "0.6.9"), 1);
  assert.equal(parseVersionFromInstaller('#!/bin/sh\nVERSION="0.6.3"\necho hi\n'), "0.6.3");
  assert.equal(isHomebrewInstall("/opt/homebrew/Cellar/agenttracking/0.6.2/libexec/dist/upgrade.js"), true);
  assert.equal(isHomebrewInstall("/root/.agenttracking/pkg/0.6.2/dist/upgrade.js"), false);
});
