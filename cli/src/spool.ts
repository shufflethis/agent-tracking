import { appendFileSync, existsSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir } from "./config.js";
import type { AgentEvent } from "./event.js";

/**
 * Local queue between the hook (must return at once) and the sender.
 *
 * Hooks only ever append to spool.jsonl. A flush first renames it to
 * inflight.jsonl, an atomic step, so appends that arrive while it sends land
 * in a fresh spool.jsonl and are never lost by the rewrite. Bounded: past
 * 5,000 lines or 2 MB the oldest half is dropped, so a machine that is
 * offline for a week does not fill its disk.
 */

const MAX_LINES = 5000;
const MAX_BYTES = 2 * 1024 * 1024;
const CHECK_FROM_BYTES = 512 * 1024;
/** The server accepts 64 KB per request; stay well below it. */
export const MAX_BATCH_BYTES = 48 * 1024;

const spoolFile = (home?: string) => join(ensureDir(home), "spool.jsonl");
const inflightFile = (home?: string) => join(ensureDir(home), "inflight.jsonl");

const parseLines = (text: string): AgentEvent[] =>
  text.split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as AgentEvent]; } catch { return []; } });

export function appendEvent(e: AgentEvent, home?: string): void {
  const file = spoolFile(home);
  appendFileSync(file, JSON.stringify(e) + "\n", { mode: 0o600 });
  const size = statSync(file).size;
  if (size < CHECK_FROM_BYTES) return;
  const lines = readFileSync(file, "utf8").split("\n").filter(Boolean);
  if (lines.length > MAX_LINES || size > MAX_BYTES) {
    const kept = parseLines(lines.slice(Math.floor(lines.length / 2)).join("\n")).map((event) => ({ ...event, dataLoss: true }));
    writeFileSync(file, kept.map((event) => JSON.stringify(event)).join("\n") + "\n", { mode: 0o600 });
    writeFileSync(join(ensureDir(home), "telemetry-loss"), `Queue overflow at ${new Date().toISOString()}\n`, { mode: 0o600 });
  }
}

export function spoolSize(home?: string): number {
  return [spoolFile(home), inflightFile(home)].reduce((n, f) => n + (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).length : 0), 0);
}

/** Up to `max` events; commit() removes exactly those. Call only while holding the flush lock. */
export function takeBatch(max = 100, home?: string): { events: AgentEvent[]; commit(): void } {
  const inflight = inflightFile(home);
  const spool = spoolFile(home);
  if (existsSync(inflight) && statSync(inflight).size === 0) unlinkSync(inflight);
  if (!existsSync(inflight) && existsSync(spool)) renameSync(spool, inflight);
  if (!existsSync(inflight)) return { events: [], commit() {} };
  const raw = readFileSync(inflight, "utf8");
  const all = parseLines(raw);
  if (!all.length) {
    if (raw.trim()) writeFileSync(join(ensureDir(home), "telemetry-loss"), `Unreadable queue records at ${new Date().toISOString()}\n`, { mode: 0o600 });
    unlinkSync(inflight);
    return takeBatch(max, home);
  }
  const events: AgentEvent[] = [];
  let bytes = 16; // {"events":[]}
  for (const e of all) {
    const size = Buffer.byteLength(JSON.stringify(e)) + 1;
    if (events.length >= max || (events.length > 0 && bytes + size > MAX_BATCH_BYTES)) break;
    events.push(e);
    bytes += size;
  }
  return {
    events,
    commit() {
      const rest = all.slice(events.length);
      if (rest.length) writeFileSync(inflight, rest.map((e) => JSON.stringify(e)).join("\n") + "\n", { mode: 0o600 });
      else unlinkSync(inflight);
    },
  };
}
