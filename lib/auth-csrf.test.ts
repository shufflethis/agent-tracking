import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../app/api/auth/route";
import { POST as approveDevice } from "../app/api/agents/device/approve/route";
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

test("oversized auth POST bodies are rejected with 413", async () => {
  const huge = JSON.stringify({ email: "a@example.com", pad: "x".repeat(20_000) });
  const res = await POST(new Request("https://agenttracking.co/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: huge,
  }));
  assert.equal(res.status, 413);
});

test("cross-site POST to device approve is refused with 403", async () => {
  const r1 = await approveDevice(new Request("https://agenttracking.co/api/agents/device/approve", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://evil.example" },
    body: "code=ABCD-EFGH",
  }));
  assert.equal(r1.status, 403);

  const r2 = await approveDevice(new Request("https://agenttracking.co/api/agents/device/approve", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "cross-site" },
    body: "code=ABCD-EFGH",
  }));
  assert.equal(r2.status, 403);
});

test("the connect page takes no code from the URL, so a sent link cannot preload an approval", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync(new URL("../app/(en)/app/connect/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /searchParams[^\n]*\b(code|typed)\b/, "no code-like search param is read");
  assert.match(page, /<form method="post" action="\/api\/agents\/device\/approve">/);
  assert.match(page, /name="code"[^>]*required|required[^>]*name="code"/s);
});
