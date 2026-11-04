import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/auth/route";
import { mintLoginToken } from "./session";

process.env.UNLOCK_SECRET ||= "test-secret-for-csrf-check-0123456789";

const post = (headers: Record<string, string>) => {
  const body = new URLSearchParams({ k: mintLoginToken("victim-test@example.com") });
  return POST(new Request("https://agenttracking.co/api/auth", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body }));
};

test("a sign-in link posted from another website is refused (login CSRF)", async () => {
  assert.equal((await post({ origin: "https://evil.example" })).status, 403);
  assert.equal((await post({ "sec-fetch-site": "cross-site" })).status, 403);
});
