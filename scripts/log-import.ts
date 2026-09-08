import { closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { AGENT_LABELS } from "../lib/tracking/classify";
import { closeDb, getSite, recordBursts, recordLogFetches, setLogSource } from "../lib/tracking/db";
import { loadRanges } from "../lib/tracking/bot-ranges";
import { importLines } from "../lib/tracking/log-import";

/**
 * Reads the web server's access log for one site and turns agent lines into
 * fetch counters and bursts. Runs every quarter hour from cron, remembers
 * where it stopped, and survives logrotate: when the file's inode changes,
 * the rest of the rotated file (.1, still uncompressed thanks to
 * delaycompress) is read first, then the new file from the start.
 *
 *   LOG_IMPORT_SOURCES  path=domain pairs, comma separated, for every site whose
 *                       server log this machine can read
 *   LOG_IMPORT_STATE    .data/log-import.json (one cursor per log file)
 *
 * Crontab line (not installed by this script):
 *   every 15 minutes: /bin/bash /root/agent-tracking/scripts/log-import.sh
 */

const SOURCES = (process.env.LOG_IMPORT_SOURCES ?? "")
  .split(",")
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => {
    const at = pair.lastIndexOf("=");
    return at > 0 ? { file: pair.slice(0, at).trim(), domain: pair.slice(at + 1).trim().toLowerCase() } : null;
  })
  .filter((s): s is { file: string; domain: string } => Boolean(s));
const STATE = process.env.LOG_IMPORT_STATE ?? ".data/log-import.json";

const say = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

type Cursor = { inode: number; offset: number };
type State = Record<string, Cursor>;

function readState(): State {
  try {
    const parsed = JSON.parse(readFileSync(STATE, "utf8")) as State | Cursor;
    // The single-file shape from before: a cursor at the top level.
    if (typeof (parsed as Cursor).inode === "number") return {};
    return parsed as State;
  } catch {
    return {};
  }
}

/** Whole lines from `offset` to the end; returns them and the offset after the last newline. */
function readLines(path: string, offset: number): { lines: string[]; offset: number; inode: number } {
  const fd = openSync(path, "r");
  try {
    const st = fstatSync(fd);
    if (offset > st.size) offset = 0; // truncated in place: start over
    const length = st.size - offset;
    const buf = Buffer.alloc(length);
    let read = 0;
    while (read < length) {
      const n = readSync(fd, buf, read, length - read, offset + read);
      if (n === 0) break;
      read += n;
    }
    const text = buf.subarray(0, read).toString("utf8");
    const lastNl = text.lastIndexOf("\n");
    if (lastNl < 0) return { lines: [], offset, inode: st.ino };
    return { lines: text.slice(0, lastNl).split("\n"), offset: offset + Buffer.byteLength(text.slice(0, lastNl + 1)), inode: st.ino };
  } finally {
    closeSync(fd);
  }
}

function importOne(FILE: string, DOMAIN: string, state: State) {
  if (!existsSync(FILE)) {
    say(`no log at ${FILE}; nothing to do`);
    return;
  }
  const site = getSite(DOMAIN);
  if (!site) {
    say(`${DOMAIN} is not a registered site; nothing to do`);
    return;
  }
  const cursor = state[FILE] ?? null;
  const current = statSync(FILE);
  const lines: string[] = [];
  let next: Cursor;

  if (cursor && cursor.inode !== current.ino) {
    // Rotated since the last run. Finish the old file if it is still there.
    const rotated = `${FILE}.1`;
    if (existsSync(rotated) && statSync(rotated).ino === cursor.inode) {
      const tail = readLines(rotated, cursor.offset);
      lines.push(...tail.lines);
      say(`rotated: ${tail.lines.length} line(s) from the previous file`);
    } else {
      say("rotated: previous file gone, lines since the last run are lost");
    }
    const fresh = readLines(FILE, 0);
    lines.push(...fresh.lines);
    next = { inode: fresh.inode, offset: fresh.offset };
  } else {
    const fresh = readLines(FILE, cursor?.offset ?? 0);
    lines.push(...fresh.lines);
    next = { inode: fresh.inode, offset: fresh.offset };
  }

  const ranges = loadRanges();
  const { fetches, unverified, bursts, scanned, lastT } = importLines(lines, { ranges });
  recordLogFetches(DOMAIN, fetches, unverified, site.owner);
  recordBursts(DOMAIN, bursts);
  setLogSource(DOMAIN, Date.now(), lastT);
  state[FILE] = next;
  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(state));

  const byAgent = new Map<string, number>();
  for (const f of fetches) byAgent.set(f.agent, (byAgent.get(f.agent) ?? 0) + 1);
  const summary = [...byAgent.entries()].map(([id, n]) => `${AGENT_LABELS[id] ?? id} ${n}`).join(", ");
  say(`${DOMAIN}: ${scanned} line(s) scanned, ${fetches.length} agent fetch(es)${summary ? ` (${summary})` : ""}, ${unverified.length} unverified, ${bursts.length} burst(s)${ranges ? "" : " (no range file yet: nothing verified)"}`);
  for (const b of bursts) say(`  burst: ${AGENT_LABELS[b.agent] ?? b.agent} fetched ${b.paths.length} page(s) in ${Math.round(b.ms / 1000)}s starting ${new Date(b.start).toISOString()}`);
}

function main() {
  if (SOURCES.length === 0) {
    say("LOG_IMPORT_SOURCES is empty; nothing to do");
    return;
  }
  const state = readState();
  for (const { file, domain } of SOURCES) importOne(file, domain, state);
  closeDb();
}

try {
  main();
} catch (err) {
  say(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  process.exitCode = 1;
}
