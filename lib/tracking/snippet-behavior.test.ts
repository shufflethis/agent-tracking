import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("goal click and form submit create distinct attempts without a conversion or tool success", async () => {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const timers: (() => void)[] = [];
  const beacons: Blob[] = [];
  const on = (name: string, fn: (event: unknown) => void) => handlers.set(name, [...(handlers.get(name) ?? []), fn]);
  const emit = (name: string, event: unknown = {}) => (handlers.get(name) ?? []).forEach((fn) => fn(event));
  const goal = { tagName: "DIV", getAttribute: () => "book" };
  const form = { getAttribute: (name: string) => name === "toolname" ? "bookTool" : null, closest: () => goal };
  const button = { form, type: "submit", closest: (selector: string) => selector === "[data-agent-goal]" ? goal : button };
  const source = readFileSync(join(process.cwd(), "snippet", "agent.src.js"), "utf8");
  runInNewContext(source, {
    document: { currentScript: { getAttribute: () => "example.com", src: "https://agenttracking.co/agent.js", hasAttribute: () => false }, referrer: "https://example.com/start", modelContext: null },
    location: { pathname: "/book", host: "example.com", search: "" },
    navigator: { sendBeacon: (_url: string, blob: Blob) => { beacons.push(blob); return true; } },
    crypto: { randomUUID }, performance: { now: () => 100 }, Blob, URL, URLSearchParams,
    addEventListener: on, setInterval: () => 1, clearInterval: () => undefined,
    setTimeout: (fn: () => void) => { timers.push(fn); return 1; },
  });
  emit("click", { target: button });
  const firstSubmit = { target: form, defaultPrevented: false };
  emit("submit", firstSubmit);
  firstSubmit.defaultPrevented = true;
  while (timers.length) timers.shift()?.();
  emit("submit", { target: form, defaultPrevented: false });
  while (timers.length) timers.shift()?.();
  emit("pagehide");
  const events = (await Promise.all(beacons.map(async (blob) => JSON.parse(await blob.text()) as { e: { k: string; id: string; s?: string }[] }))).flatMap((body) => body.e);
  assert.equal(events.filter((e) => e.k === "goal_attempt").length, 2);
  assert.equal(new Set(events.filter((e) => e.k === "goal_attempt").map((e) => e.id)).size, 2);
  assert.equal(events.filter((e) => e.k === "form_attempt").length, 2);
  assert.equal(events.find((e) => e.k === "form_attempt")?.s, "cancelled");
  assert.equal(events.some((e) => e.k === "tool_call" || e.k === "agent_conversion"), false);
});

test("tool wrapper preserves values and reports completed, failed, cancelled and timed out once", async () => {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const beacons: Blob[] = [];
  const timers: { fn: () => void; delay: number; cancelled: boolean }[] = [];
  let poll: (() => void) | undefined;
  let wrapped: { execute: (arg: unknown, ctx?: unknown) => unknown } | undefined;
  const mc = { registerTool(tool: typeof wrapped) { wrapped = tool; return tool; } };
  runInNewContext(readFileSync(join(process.cwd(), "snippet", "agent.src.js"), "utf8"), {
    document: { currentScript: { getAttribute: () => "example.com", src: "https://agenttracking.co/agent.js", hasAttribute: () => false }, referrer: "https://example.com/start", modelContext: mc },
    location: { pathname: "/", host: "example.com", search: "" },
    navigator: { sendBeacon: (_url: string, blob: Blob) => { beacons.push(blob); return true; } },
    crypto: { randomUUID }, performance: { now: () => 100 }, Blob, URL, URLSearchParams,
    addEventListener: (name: string, fn: (event: unknown) => void) => handlers.set(name, [...(handlers.get(name) ?? []), fn]),
    setInterval: (fn: () => void) => { poll = fn; return 1; }, clearInterval: () => undefined,
    setTimeout: (fn: () => void, delay: number) => { const timer = { fn, delay, cancelled: false }; timers.push(timer); return timer; },
    clearTimeout: (timer: { cancelled: boolean }) => { if (timer) timer.cancelled = true; },
  });
  poll?.();
  assert.ok(wrapped === undefined);

  const value = { ok: false };
  mc.registerTool({ name: "book", execute: () => Promise.resolve(value) } as never);
  // registerTool is wrapped by the snippet and receives the instrumented function.
  assert.equal(await wrapped!.execute({}, {}), value);
  mc.registerTool({ name: "book", execute: function () { return (this as { marker: number }).marker; } } as never);
  assert.equal(wrapped!.execute.call({ marker: 42 }, {}, {}), 42);
  const secret = new Error("secret@example.com token=top-secret");
  mc.registerTool({ name: "book", execute: () => { throw secret; } } as never);
  assert.throws(() => wrapped!.execute({}, {}), (error) => error === secret);

  const controller = new AbortController();
  let resolveLate: ((value: unknown) => void) | undefined;
  mc.registerTool({ name: "book", execute: () => new Promise((resolve) => { resolveLate = resolve; }) } as never);
  const pending = wrapped!.execute({}, { signal: controller.signal }) as Promise<unknown>;
  controller.abort();
  resolveLate?.("late");
  assert.equal(await pending, "late");

  mc.registerTool({ name: "book", execute: () => new Promise(() => undefined) } as never);
  wrapped!.execute({}, {});
  timers.filter((timer) => timer.delay === 60000 && !timer.cancelled).forEach((timer) => timer.fn());
  handlers.get("pagehide")?.forEach((fn) => fn({}));
  const events = (await Promise.all(beacons.map(async (blob) => JSON.parse(await blob.text()) as { e: { k: string; s?: string; e?: string }[] }))).flatMap((body) => body.e).filter((event) => event.k === "tool_call");
  assert.deepEqual(events.map((event) => event.s), ["completed", "completed", "failed", "cancelled", "timed_out"]);
  assert.equal(events[2].e, "Error");
  assert.equal(JSON.stringify(events).includes("secret@example.com"), false);
});
