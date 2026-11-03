import { closeSync, existsSync, openSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, readConfig } from "./config.js";
import { takeBatch } from "./spool.js";

/**
 * Send spooled events. 2xx: done. Other 4xx except 401/408/429: the server will never accept them, drop.
 * 401: stop and leave an auth-error marker for `agenttracking status`.
 * Anything else (offline, 5xx, 429): keep and try on the next flush.
 */

const LOCK_STALE_MS = 60_000;

function lock(home?: string): (() => void) | null {
  const file = join(ensureDir(home), "flush.lock");
  try {
    if (existsSync(file) && Date.now() - statSync(file).mtimeMs > LOCK_STALE_MS) unlinkSync(file);
    closeSync(openSync(file, "wx"));
    return () => { try { unlinkSync(file); } catch { /* already gone */ } };
  } catch {
    return null;
  }
}

export async function flush(home?: string): Promise<{ sent: number; kept: number }> {
  const config = readConfig(home);
  const release = lock(home);
  if (!config || !release) { release?.(); return { sent: 0, kept: 0 }; }
  let sent = 0;
  try {
    for (;;) {
      const batch = takeBatch(100, home);
      if (!batch.events.length) return { sent, kept: 0 };
      let status: number;
      try {
        const res = await fetch(`${config.origin.replace(/\/$/, "")}/api/agents/events`, {
          method: "POST",
          headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
          body: JSON.stringify({ events: batch.events }),
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
        });
        status = res.status;
        if (status >= 200 && status < 300) {
          const receipt = await res.json().catch(() => null) as { dropped?: number; agentLimit?: boolean } | null;
          if (receipt?.dropped || receipt?.agentLimit) writeFileSync(join(ensureDir(home), "telemetry-loss"), `Server rejected some events at ${new Date().toISOString()}\n`, { mode: 0o600 });
          // Retry partial agent-limit batches; accepted IDs are idempotent on the server.
          if (receipt?.agentLimit) return { sent, kept: remaining(home) };
        }
      } catch {
        status = 0;
      }
      if (status >= 200 && status < 300) { batch.commit(); sent += batch.events.length; continue; }
      // Permanent refusals (bad request, too large, not found, unprocessable) would repeat forever: drop them.
      if (status >= 400 && status < 500 && ![401, 408, 429].includes(status)) { writeFileSync(join(ensureDir(home), "telemetry-loss"), `Server refused events (${status}) at ${new Date().toISOString()}\n`, { mode: 0o600 }); batch.commit(); continue; }
      if (status === 401) writeFileSync(join(ensureDir(home), "auth-error"), `401 at ${new Date().toISOString()}\n`, { mode: 0o600 });
      return { sent, kept: remaining(home) };
    }
  } finally {
    release();
  }
}

function remaining(home?: string): number {
  return takeBatch(Number.MAX_SAFE_INTEGER, home).events.length;
}
