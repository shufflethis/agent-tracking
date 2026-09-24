import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeEvent } from "./classify";
import { redactPath, safeCounterName } from "./privacy";

test("browser events drop error messages, dynamic keys and sensitive paths", () => {
  const secret = "secret@example.com token=top-secret form-value-123";
  const event = sanitizeEvent({ k: "tool_call", n: "book", p: "/users/secret@example.com?token=top-secret", e: secret, keys: [secret], ok: false });
  assert.ok(event);
  assert.equal(event.path, "/[redacted]");
  assert.equal(event.err, "Error");
  assert.deepEqual(event.keys, []);
  assert.equal(JSON.stringify(event).includes(secret), false);
});

test("configured templates and cautious segment rules redact paths", () => {
  assert.equal(redactPath("/private/client-abc", "/private/:client"), "/[redacted]");
  assert.equal(redactPath("/products/123456789"), "/products/[redacted]");
  assert.equal(redactPath("/docs/how-it-works?q=secret"), "/docs/how-it-works");
  assert.equal(redactPath("/files/abc%40example.com"), "/files/[redacted]");
});

test("historical counter labels are filtered before export or display", () => {
  assert.equal(safeCounterName("tool_error", "book secret@example.com token=top-secret"), "book Error");
  assert.equal(safeCounterName("page", "/checkout/order-123"), "/[redacted]");
});
