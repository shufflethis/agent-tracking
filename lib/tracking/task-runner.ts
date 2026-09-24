import { spawn } from "node:child_process";
import { lookup } from "node:dns/promises";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { assertPublicHost, isPrivateAddress } from "../public-host";

export type RunnerResult = { result: "passed" | "failed" | "timed_out"; steps: string[]; errorClass: string | null };
export const RUNNER_TIMEOUT_MS = 12_000;
const localMode = () => process.env.NODE_ENV === "test" && process.env.TRACKING_RUNNER_LOCAL === "1";
export const runnerTimeoutMs = () => localMode() ? Math.min(RUNNER_TIMEOUT_MS, Math.max(1000, Number(process.env.TRACKING_RUNNER_TEST_TIMEOUT_MS) || RUNNER_TIMEOUT_MS)) : RUNNER_TIMEOUT_MS;

/** Test/staging host for the owned site, or loopback only in isolated test mode. */
export async function validateRunnerTarget(domain: string, raw: string): Promise<{ url: URL; address: string }> {
  const url = new URL(raw);
  if (url.username || url.password || url.hash || !["https:", "http:"].includes(url.protocol)) throw new Error("invalid_target");
  const local = localMode() && url.hostname === "127.0.0.1";
  if (!local && (url.protocol !== "https:" || ![ `staging.${domain}`, `test.${domain}` ].includes(url.hostname))) throw new Error("staging_target_required");
  if (!local) await assertPublicHost(url.hostname);
  const address = local ? "127.0.0.1" : (await lookup(url.hostname)).address;
  if (!local && isPrivateAddress(address)) throw new Error("private_target");
  return { url, address };
}

/** Chrome DevTools Protocol is used directly; this remains a deterministic browser check. */
export async function runInquiryBrowserCheck(domain: string, rawTarget: string): Promise<RunnerResult> {
  const steps: string[] = [];
  const { url, address } = await validateRunnerTarget(domain, rawTarget);
  const dir = await mkdtemp(join(tmpdir(), "agenttracking-run-"));
  const chrome = spawn(process.env.CHROME_BIN ?? "google-chrome", [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--disable-extensions", "--disable-default-apps", "--disable-sync", "--no-first-run", "--disable-features=MediaRouter,ServiceWorker", "--remote-debugging-port=0", `--user-data-dir=${dir}`,
    `--host-resolver-rules=MAP ${url.hostname} ${address}, EXCLUDE localhost, EXCLUDE 127.0.0.1`, "about:blank",
  ], { stdio: "ignore" });
  let socket: WebSocket | null = null;
  const timeout = runnerTimeoutMs();
  const deadline = Date.now() + timeout;
  let expire: ReturnType<typeof setTimeout> | null = null;
  try {
    let port = 0;
    while (Date.now() < deadline && !port) {
      const file = await readFile(join(dir, "DevToolsActivePort"), "utf8").catch(() => "");
      port = Number(file.split("\n")[0]) || 0;
      if (!port) await pause(50);
    }
    if (!port) throw new Error("browser_start_failed");
    const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()) as { type: string; webSocketDebuggerUrl: string }[];
    const page = pages.find((p) => p.type === "page");
    if (!page) throw new Error("browser_page_missing");
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => { socket!.onopen = () => resolve(); socket!.onerror = () => reject(new Error("browser_socket_failed")); });
    let id = 0;
    const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
    expire = setTimeout(() => {
      for (const p of pending.values()) p.reject(new Error("browser_timeout"));
      pending.clear(); chrome.kill("SIGKILL");
    }, timeout);
    const command = (method: string, params: Record<string, unknown> = {}) => new Promise<any>((resolve, reject) => {
      const key = ++id; pending.set(key, { resolve, reject }); socket!.send(JSON.stringify({ id: key, method, params }));
    });
    socket.onmessage = (message) => {
      const value = JSON.parse(String(message.data)) as { id?: number; method?: string; params?: { requestId?: string; request?: { url: string } }; error?: { message: string }; result?: unknown };
      if (value.id) { const p = pending.get(value.id); pending.delete(value.id); value.error ? p?.reject(new Error("browser_command_failed")) : p?.resolve(value.result); }
      if (value.method === "Fetch.requestPaused" && value.params?.requestId) {
        const requestUrl = value.params.request?.url ?? "";
        let allowed = false;
        try { const request = new URL(requestUrl); allowed = request.origin === url.origin; } catch { /* block opaque and external requests */ }
        void command(allowed ? "Fetch.continueRequest" : "Fetch.failRequest", { requestId: value.params.requestId, ...(!allowed ? { errorReason: "BlockedByClient" } : {}) }).catch(() => {});
      }
    };
    await command("Page.enable"); await command("Runtime.enable");
    await command("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
    await command("Page.navigate", { url: url.href }); steps.push("navigate");
    const evalJs = async (expression: string) => {
      const answer = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return answer?.result?.value;
    };
    let ready = false;
    while (Date.now() < deadline && !ready) {
      ready = Boolean(await evalJs(`(() => document.readyState !== 'loading' && Boolean(document.querySelector('#agenttracking-test-form[data-agenttracking-test="true"]')))()`));
      if (!ready) await pause(100);
    }
    if (!ready) return { result: "failed", steps, errorClass: "test_form_missing" };
    steps.push("test_form_found");
    const submitted = await evalJs(`(() => {
      const form = document.querySelector('#agenttracking-test-form[data-agenttracking-test="true"]');
      const fields = [['name','Agent Tracking Test'], ['email','agenttracking-test@example.invalid'], ['message','Synthetic browser check; no customer request']];
      for (const [name, value] of fields) { const el = form.querySelector('[name="' + name + '"]'); if (!el) return false; el.value=value; el.dispatchEvent(new Event('input',{bubbles:true})); }
      const button = form.querySelector('[type="submit"]'); if (!button) return false; button.click(); return true;
    })()`);
    if (!submitted) return { result: "failed", steps, errorClass: "form_fields_missing" };
    steps.push("submit_test_form");
    while (Date.now() < deadline) {
      if (await evalJs(`Boolean(document.querySelector('[data-agenttracking-success="true"]'))`)) {
        steps.push("success_marker_found"); return { result: "passed", steps, errorClass: null };
      }
      await pause(100);
    }
    return { result: "timed_out", steps, errorClass: "success_marker_missing" };
  } catch (error) {
    return { result: Date.now() >= deadline ? "timed_out" : "failed", steps, errorClass: error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "browser_failure" };
  } finally {
    if (expire) clearTimeout(expire);
    socket?.close(); chrome.kill("SIGKILL");
    if (chrome.exitCode === null && chrome.signalCode === null) {
      await Promise.race([new Promise<void>((resolve) => chrome.once("exit", () => resolve())), pause(1000)]);
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await rm(dir, { recursive: true, force: true }); break; }
      catch (error) { if (attempt === 2) throw error; await pause(100); }
    }
  }
}
