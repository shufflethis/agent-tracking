import { spawn, spawnSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readConfig } from "./config.js";
import { appendEvent } from "./spool.js";
import { flush } from "./flush.js";
import { label, type AgentEvent } from "./event.js";

/** No filenames, addresses, arguments or payloads are read, even by the BPF probes. */
export function observationProgram(pid: number, seconds: number, maximum: number): string {
  if (!Number.isInteger(pid) || pid < 2 || !Number.isInteger(seconds) || seconds < 1 || seconds > 3600 || !Number.isInteger(maximum) || maximum < 1 || maximum > 10000) throw new Error("Invalid observation limits");
  const emit = (kind: string) => `printf("{\\"operation\\":\\"${kind}\\",\\"pid\\":%d}\\n", pid); @total = @total + 1; if (@total >= ${maximum}) { exit(); }`;
  const selected = `(pid == ${pid} || @tracked[pid] || @tracked[tid])`;
  return `BEGIN { printf("{\\"ready\\":true}\\n"); }
tracepoint:sched:sched_process_fork /${selected}/ { @tracked[args->child_pid] = 1; }
tracepoint:sched:sched_process_exec /${selected}/ { ${emit("process_exec")} }
tracepoint:syscalls:sys_enter_openat /${selected}/ { ${emit("file_open")} }
tracepoint:syscalls:sys_enter_connect /${selected}/ { ${emit("network_connect")} }
tracepoint:sched:sched_process_exit /${selected}/ { delete(@tracked[tid]); if (pid == ${pid} && tid == ${pid}) { exit(); } }
interval:s:${seconds} { exit(); }
END { clear(@tracked); clear(@total); }`;
}

export function parseKernelLine(line: string): { operation: "process_exec" | "file_open" | "network_connect"; pid: number } | null {
  try {
    const value = JSON.parse(line);
    if (!["process_exec", "file_open", "network_connect"].includes(value?.operation) || !Number.isInteger(value.pid) || value.pid < 1) return null;
    return { operation: value.operation, pid: value.pid };
  } catch { return null; }
}

export async function observe(args: string[]): Promise<number> {
  const flag = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const pid = Number(flag("--pid")); const seconds = Number(flag("--seconds") ?? 60); const maximum = Number(flag("--max-events") ?? 1000);
  const name = flag("--name"); const preview = args.includes("--print-program");
  if (!name) throw new Error("Usage: agenttracking observe --pid <PID> --name <agent> [--seconds 60] [--max-events 1000] [--print-program]");
  const program = observationProgram(pid, seconds, maximum);
  if (preview) { console.log(program); return 0; }
  if (process.platform !== "linux") throw new Error("eBPF observation requires Linux and bpftrace");
  const cfg = readConfig(); if (!cfg) throw new Error("Connect this machine first: agenttracking login");
  const initial = readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1]?.split(" ")[19];
  if (!initial) throw new Error("Target process not available");
  if (spawnSync("bpftrace", ["--version"], { stdio: "ignore" }).status !== 0) throw new Error("Install bpftrace before using observe");
  const run = randomUUID(); const agent = { kind: "custom" as const, name: label(name), host: label(cfg.host) };
  let count = 0; let ready = false; let dataLoss = false; let failed = false;
  const report = (event: Partial<AgentEvent> & { type: AgentEvent["type"] }) => appendEvent({ v: 1, id: randomUUID(), at: Date.now(), agent, run, ...event });
  const child = spawn("bpftrace", ["-q", "-e", program], { stdio: ["ignore", "pipe", "pipe"] });
  let buffer = "";
  let sending = false;
  const send = async () => { if (sending) return; sending = true; try { await flush(); } finally { sending = false; } };
  const sender = setInterval(() => { void send().catch(() => { dataLoss = true; }); }, 5000);
  const stop = () => { child.kill("SIGINT"); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  const deadline = setTimeout(stop, (seconds + 20) * 1000);
  const killDeadline = setTimeout(() => child.kill("SIGKILL"), (seconds + 25) * 1000);
  child.stderr.on("data", chunk => { if (/lost|drop/i.test(String(chunk))) dataLoss = true; });
  child.stdout.on("data", chunk => {
    buffer += chunk.toString("utf8");
    if (buffer.length > 65536) { dataLoss = true; buffer = ""; return; }
    const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line === '{"ready":true}') {
        try {
          if (readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1]?.split(" ")[19] !== initial) throw new Error("PID reused");
          report({ type: "session_start" }); ready = true; console.log(`Observing PID ${pid} and new descendants for up to ${seconds}s / ${maximum} events.`);
        } catch { failed = true; stop(); }
        continue;
      }
      const event = parseKernelLine(line); if (!ready || !event) continue;
      if (count >= maximum) { dataLoss = true; stop(); continue; }
      try {
        report({ type: "kernel_event", kernel: { operation: event.operation, processId: createHmac("sha256", cfg.secret).update(`${run}:${event.pid}`).digest("hex") } }); count++;
      } catch { dataLoss = true; }
    }
  });
  try {
    const code = await new Promise<number>((resolve) => { child.on("error", () => resolve(1)); child.on("close", code => resolve(code ?? 1)); });
    if (ready) report({ type: "session_end", dataLoss: dataLoss || count >= maximum || failed || code !== 0 });
    await send();
    if (!ready || failed || code !== 0) { console.error("Observation failed or was interrupted. Check bpftrace privileges, tracepoints and kernel support. No commands or file contents were collected."); return 1; }
    console.log(`Observed ${count} events${dataLoss || count >= maximum ? " (coverage limited)" : ""}. File/network events are attempts, not confirmed access or delivery.`);
    return 0;
  } finally { clearInterval(sender); clearTimeout(deadline); clearTimeout(killDeadline); process.off("SIGINT", stop); process.off("SIGTERM", stop); child.kill("SIGINT"); }
}
