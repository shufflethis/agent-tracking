import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AgentEvent } from "./event.js";
import { flush } from "./flush.js";
import { writeConfig } from "./config.js";
import { appendEvent, takeBatch } from "./spool.js";

const ev = (i: number): AgentEvent => ({ v: 1, id: `id-${String(i).padStart(8, "0")}`, type: "turn_end", at: 1_800_000_000_000 + i, agent: { kind: "claude", name: "p", host: "h" }, run: "a".repeat(64) });
const lines = (home: string) => readFileSync(join(home, "spool.jsonl"), "utf8").trim().split("\n");

test("spool is bounded", () => {
  const home = mkdtempSync(join(tmpdir(), "at-spool-"));
  for (let i = 0; i < 6000; i++) appendEvent(ev(i), home);
  const kept = lines(home);
  assert.ok(kept.length <= 5000, `kept ${kept.length}`);
  assert.equal(JSON.parse(kept.at(-1)!).id, ev(5999).id);
});

test("takeBatch commits only what was sent and keeps later appends", () => {
  const home = mkdtempSync(join(tmpdir(), "at-spool-"));
  for (let i = 0; i < 150; i++) appendEvent(ev(i), home);
  const first = takeBatch(100, home);
  assert.equal(first.events.length, 100);
  appendEvent(ev(999), home);
  first.commit();
  const second = takeBatch(100, home);
  assert.deepEqual(second.events.map((e) => e.id), [...Array.from({ length: 50 }, (_, i) => ev(100 + i).id)]);
  second.commit();
  assert.deepEqual(takeBatch(100, home).events.map((e) => e.id), [ev(999).id]);
});

async function withFetch<T>(status: number | "offline", fn: (calls: string[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    calls.push(String(init?.body));
    if (status === "offline") throw new Error("offline");
    return new Response("{}", { status });
  }) as typeof fetch;
  try { return await fn(calls); } finally { globalThis.fetch = original; }
}

test("flush keeps events when offline and drops on 422", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-flush-"));
  writeConfig({ origin: "https://agenttracking.example", token: "atk_x", secret: "s".repeat(64), host: "h" }, home);
  for (let i = 0; i < 120; i++) appendEvent(ev(i), home);
  assert.deepEqual(await withFetch("offline", () => flush(home)), { sent: 0, kept: 120 });
  assert.deepEqual(await withFetch(500, () => flush(home)), { sent: 0, kept: 120 });
  assert.deepEqual(await withFetch(422, () => flush(home)), { sent: 0, kept: 0 });
  for (let i = 0; i < 120; i++) appendEvent(ev(i), home);
  const result = await withFetch(200, async (calls) => { const r = await flush(home); assert.equal(calls.length, 2); return r; });
  assert.deepEqual(result, { sent: 120, kept: 0 });
});

test("flush stops on 401 and leaves an auth marker", async () => {
  const home = mkdtempSync(join(tmpdir(), "at-flush-"));
  writeConfig({ origin: "https://agenttracking.example", token: "atk_x", secret: "s".repeat(64), host: "h" }, home);
  appendEvent(ev(1), home);
  assert.deepEqual(await withFetch(401, () => flush(home)), { sent: 0, kept: 1 });
  assert.match(readFileSync(join(home, "auth-error"), "utf8"), /401/);
});

test("batches stay under the server body limit", () => {
  const home = mkdtempSync(join(tmpdir(), "at-spool-"));
  for (let i = 0; i < 100; i++) appendEvent({ ...ev(i), type: "cron_end", exitCode: 1, tail: "x".repeat(1000) }, home);
  const first = takeBatch(100, home);
  assert.ok(first.events.length < 100 && first.events.length > 0);
  assert.ok(Buffer.byteLength(JSON.stringify({ events: first.events })) <= 48 * 1024);
});

test("a permanent 4xx or 413 never jams the queue", async () => {
  for (const status of [413, 400, 404]) {
    const home = mkdtempSync(join(tmpdir(), "at-flush-"));
    writeConfig({ origin: "https://agenttracking.example", token: "atk_x", secret: "s".repeat(64), host: "h" }, home);
    for (let i = 0; i < 3; i++) appendEvent(ev(i), home);
    assert.deepEqual(await withFetch(status, () => flush(home)), { sent: 0, kept: 0 }, String(status));
  }
});
