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
  assert.ok(poll);
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
  const resolvers = new Map<string, (value: string) => void>();
  mc.registerTool({ name: "book", execute: (key: string) => new Promise<string>((resolve) => { resolvers.set(key, resolve); }) } as never);
  const first = wrapped!.execute("first", {}) as Promise<string>;
  const second = wrapped!.execute("second", {}) as Promise<string>;
  resolvers.get("second")?.("B");
  resolvers.get("first")?.("A");
  assert.deepEqual(await Promise.all([first, second]), ["A", "B"]);
  handlers.get("pagehide")?.forEach((fn) => fn({}));
  const events = (await Promise.all(beacons.map(async (blob) => JSON.parse(await blob.text()) as { e: { k: string; id?: string; s?: string; e?: string }[] }))).flatMap((body) => body.e).filter((event) => event.k === "tool_call");
  assert.deepEqual(events.map((event) => event.s), ["completed", "completed", "failed", "cancelled", "timed_out", "completed", "completed"]);
  assert.equal(new Set(events.map((event) => event.id)).size, events.length);
  assert.equal(events[2].e, "Error");
  assert.equal(JSON.stringify(events).includes("secret@example.com"), false);
});

test("existing tools are discovered without invented calls and registration starts immediately", async () => {
  const handlers = new Map<string, ((event: unknown) => void)[]>();
  const beacons: Blob[] = [];
  const changes: (() => void)[] = [];
  const lifecycle = new Map<string, ((event: { toolName: string }) => void)[]>();
  let currentTools = [{ name: "existing", origin: "https://example.com", inputSchema: { type: "object" } }];
  let poll: (() => void) | undefined;
  const mc = {
    registerTool(tool: unknown) { return Promise.resolve(tool); },
    getTools() { return Promise.resolve(currentTools); },
    addEventListener(name: string, fn: (event: { toolName: string }) => void) {
      if (name === "toolchange") changes.push(fn as () => void);
      else lifecycle.set(name, [...(lifecycle.get(name) ?? []), fn]);
    },
  };
  runInNewContext(readFileSync(join(process.cwd(), "snippet", "agent.src.js"), "utf8"), {
    document: { currentScript: { getAttribute: () => "example.com", src: "https://agenttracking.co/agent.js", hasAttribute: () => false }, referrer: "https://example.com/start", modelContext: mc },
    location: { pathname: "/", host: "example.com", origin: "https://example.com", search: "" },
    navigator: { sendBeacon: (_url: string, blob: Blob) => { beacons.push(blob); return true; } },
    crypto: { randomUUID }, performance: { now: () => 100 }, Blob, URL, URLSearchParams,
    addEventListener: (name: string, fn: (event: unknown) => void) => handlers.set(name, [...(handlers.get(name) ?? []), fn]),
    setInterval: (fn: () => void) => { poll = fn; return 1; }, clearInterval: () => undefined,
    setTimeout: () => 1, clearTimeout: () => undefined,
  });
  await Promise.resolve();
  const patched = mc.registerTool;
  poll?.();
  assert.equal(mc.registerTool, patched, "repeated instrumentation must not wrap again");
  await mc.registerTool({ name: "new", execute: () => "ok" });
  await Promise.resolve();
  currentTools = [];
  changes[0]();
  await Promise.resolve();
  lifecycle.get("toolactivated")?.forEach((fn) => fn({ toolName: "existing" }));
  lifecycle.get("toolcancel")?.forEach((fn) => fn({ toolName: "existing" }));
  handlers.get("pagehide")?.forEach((fn) => fn({}));
  const events = (await Promise.all(beacons.map(async (blob) => JSON.parse(await blob.text()) as { e: { k: string; n?: string }[] }))).flatMap((body) => body.e);
  assert.ok(events.some((event) => event.k === "tool_discovered" && event.n === "existing"));
  assert.ok(events.some((event) => event.k === "tool_registered" && event.n === "new"));
  assert.ok(events.some((event) => event.k === "tool_removed" && event.n === "existing"));
  assert.ok(events.some((event) => event.k === "tool_activation_signal" && event.n === "existing"));
  assert.ok(events.some((event) => event.k === "tool_cancel_signal" && event.n === "existing"));
  assert.equal(events.some((event) => event.k === "tool_call"), false);
});

test("optional early SDK captures registration and invocation before the core snippet", async () => {
  const beacons: Blob[] = [];
  let registered: { execute: (input: unknown) => unknown } | undefined;
  const win: Record<string, unknown> = {};
  runInNewContext(readFileSync(join(process.cwd(), "snippet", "webmcp-sdk.src.js"), "utf8"), {
    window: win,
    document: { currentScript: { getAttribute: () => "example.com", src: "https://agenttracking.co/agent-webmcp-sdk.js" }, modelContext: { registerTool(tool: typeof registered) { registered = tool; return Promise.resolve(); } } },
    location: { pathname: "/book" }, navigator: { sendBeacon: (_url: string, blob: Blob) => { beacons.push(blob); return true; } },
    crypto: { randomUUID }, performance: { now: () => 100 }, Blob, fetch: () => Promise.resolve(),
    setTimeout: () => 1, clearTimeout: () => undefined,
  });
  const sdk = win.AgentTrackingWebMCP as { registerTool: (tool: unknown) => Promise<void> };
  await sdk.registerTool({ name: "book", execute: (input: unknown) => input });
  assert.equal(registered?.execute("same"), "same");
  const events = (await Promise.all(beacons.map(async (blob) => JSON.parse(await blob.text()) as { e: { k: string; s?: string }[] }))).flatMap((body) => body.e);
  assert.deepEqual(events.map((event) => event.k), ["tool_registered", "tool_call"]);
  assert.equal(events[1].s, "completed");
});
