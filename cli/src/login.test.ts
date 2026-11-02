import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readConfig, writeConfig } from "./config.js";
import { login } from "./login.js";

async function withServer<T>(replies: object[], fn: (bodies: string[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const bodies: string[] = [];
  let i = 0;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    bodies.push(`${String(url)} ${String(init?.body)}`);
    return Response.json(replies[Math.min(i++, replies.length - 1)]);
  }) as typeof fetch;
  try { return await fn(bodies); } finally { globalThis.fetch = original; }
}

const start = { ok: true, deviceCode: "dc", userCode: "ABCD-EFGH", verifyUrl: "https://x/app/connect?code=ABCD-EFGH", interval: 3, expiresAt: Date.now() + 600_000 };
const quiet = { log: () => {}, openBrowser: false, pollMs: 1 };

test("login stores token and keeps existing secret", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-login-"));
  writeConfig({ origin: "https://old", token: "atk_old", secret: "keep".repeat(16), host: "old" }, home);
  writeFileSync(join(home, "auth-error"), "401");
  const result = await withServer([start, { ok: true, status: "pending" }, { ok: true, status: "pending" }, { ok: true, status: "approved", token: "atk_new" }], async (bodies) => {
    const r = await login({ origin: "https://agenttracking.example", host: "my box!", home, ...quiet });
    assert.match(bodies[0], /^https:\/\/agenttracking\.example\/api\/agents\/device .*"hostLabel":"my-box-"/);
    return r;
  });
  assert.equal(result, "ok");
  const c = readConfig(home)!;
  assert.equal(c.token, "atk_new");
  assert.equal(c.secret, "keep".repeat(16));
  assert.equal(c.host, "my-box-");
  assert.equal(existsSync(join(home, "auth-error")), false);
});

test("first login creates a 64-hex secret", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-login-"));
  await withServer([start, { ok: true, status: "approved", token: "atk_a" }], () => login({ origin: "https://x", host: "h", home, ...quiet }));
  assert.match(readConfig(home)!.secret, /^[0-9a-f]{64}$/);
});

test("--token skips device flow", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-login-"));
  const r = await withServer([], async (bodies) => { const r = await login({ origin: "https://x", token: `atk_${"g".repeat(32)}`, host: "h", home, ...quiet }); assert.equal(bodies.length, 0); return r; });
  assert.equal(r, "ok");
  assert.equal(readConfig(home)!.token, `atk_${"g".repeat(32)}`);
});

test("expired code returns expired", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-login-"));
  assert.equal(await withServer([start, { ok: true, status: "expired" }], () => login({ origin: "https://x", host: "h", home, ...quiet })), "expired");
  assert.equal(readConfig(home), null);
});
