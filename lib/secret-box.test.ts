import assert from "node:assert/strict";
import { test } from "node:test";
import { openSecret, sealSecret } from "./secret-box";

test("sealSecret encrypts with AES-256-GCM and openSecret recovers plaintext", () => {
  const prev = process.env.UNLOCK_SECRET;
  process.env.UNLOCK_SECRET = "0123456789abcdef0123456789abcdef";
  try {
    const sealed = sealSecret("123456:ABC-DEF_secret_telegram_token");
    assert.match(sealed, /^enc:v1:/);
    assert.doesNotMatch(sealed, /ABC-DEF/);
    assert.notEqual(sealed, sealSecret("123456:ABC-DEF_secret_telegram_token"), "random IV per seal");
    assert.equal(openSecret(sealed), "123456:ABC-DEF_secret_telegram_token");
    assert.equal(sealSecret(sealed), sealed, "never double-encrypts");
    assert.equal(openSecret(`${sealed}tampered`), null, "authentication tag catches tampering");
    assert.equal(openSecret("https://hooks.slack.com/legacy-plaintext"), "https://hooks.slack.com/legacy-plaintext", "legacy rows remain readable");
  } finally {
    if (prev === undefined) delete process.env.UNLOCK_SECRET;
    else process.env.UNLOCK_SECRET = prev;
  }
});
