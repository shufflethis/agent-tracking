import { createHash } from "node:crypto";
import { closeSync, existsSync, fstatSync, openSync, readFileSync, readSync, statSync, type Stats } from "node:fs";
import { resolve } from "node:path";
import { loadStore, mergeUnknown, saveStore } from "../lib/tracking/agent-triage";
import { loadRanges } from "../lib/tracking/bot-ranges";
import { closeDb, getSite, ingestLogSourceBatch, logSourceStates, type SourceRecord } from "../lib/tracking/db";

/** Local nginx/Apache collector; LOG_IMPORT_SOURCES contains path=domain pairs. */
const SOURCES = (process.env.LOG_IMPORT_SOURCES ?? "")
  .split(",")
  .map((pair) => pair.trim())
  .filter(Boolean)
  .map((pair) => {
    const at = pair.lastIndexOf("=");
    return at > 0 ? { file: pair.slice(0, at).trim(), domain: pair.slice(at + 1).trim().toLowerCase() } : null;
  })
  .filter((s): s is { file: string; domain: string } => Boolean(s));

const say = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);
const sourceId = (file: string) => `local-${createHash("sha256").update(resolve(file)).digest("hex").slice(0, 20)}`;
const generation = (st: Stats) => `${st.dev.toString(36)}-${st.ino.toString(36)}-${Math.round(st.birthtimeMs).toString(36)}`;

function legacyCursor(file: string): { inode: number; offset: number } | null {
  try {
    const state = JSON.parse(readFileSync(process.env.LOG_IMPORT_STATE ?? ".data/log-import.json", "utf8")) as Record<string, { inode: number; offset: number }>;
    const cursor = state[file];
    return Number.isSafeInteger(cursor?.inode) && Number.isSafeInteger(cursor?.offset) ? cursor : null;
  } catch { return null; }
}

/** Byte offsets identify lines, so duplicate text in the same second counts twice. */
function readLines(file: string, start: number): { records: SourceRecord[]; nextOffset: number; stat: Stats } {
  const fd = openSync(file, "r");
  try {
    const st = fstatSync(fd);
    if (start > st.size) throw new Error("Log file shrank within one generation; use a new generation");
    const buf = Buffer.alloc(st.size - start);
    let read = 0;
    while (read < buf.length) {
      const n = readSync(fd, buf, read, buf.length - read, start + read);
      if (!n) break;
      read += n;
    }
    const records: SourceRecord[] = [];
    let from = 0;
    for (let i = 0; i < read; i++) {
      if (buf[i] !== 10) continue;
      records.push({ id: String(start + from), line: buf.subarray(from, i).toString("utf8") });
      from = i + 1;
    }
    return { records, nextOffset: start + from, stat: st };
  } finally { closeSync(fd); }
}

function importPart(file: string, domain: string, owner: string, id: string, gen: string, offset: number): void {
  const part = readLines(file, offset);
  if (!part.records.length) return;
  if (generation(part.stat) !== gen && !gen.includes("-truncated-")) throw new Error(`Log generation changed while reading ${file}`);
  const { result, duplicates } = ingestLogSourceBatch(domain, owner, id, gen, part.records, loadRanges(), Date.now(), part.nextOffset);
  if (result.unknown.length) saveStore(mergeUnknown(loadStore(), result.unknown, Date.now()));
  say(`${domain}: ${result.scanned} new line(s), ${duplicates} duplicate(s), ${result.fetches.length} confirmed HTML fetch(es), ${result.attempts.length} access attempt(s), ${result.bursts.length} burst(s)`);
}

function importOne(file: string, domain: string): void {
  if (!existsSync(file)) { say(`no log at ${file}`); return; }
  const site = getSite(domain);
  if (!site) { say(`${domain} is not a registered site`); return; }
  const id = sourceId(file);
  const states = logSourceStates(domain).filter((s) => s.sourceId === id);
  const current = statSync(file);
  let gen = generation(current);
  const prior = states[0];
  if (!prior && site.log_since) {
    const cursor = legacyCursor(file);
    if (!cursor) throw new Error(`${domain}: legacy cursor missing; refusing to replay an already counted log`);
    if (cursor.inode === current.ino) {
      importPart(file, domain, site.owner, id, gen, cursor.offset);
      return;
    }
    const rotated = `${file}.1`;
    if (!existsSync(rotated) || statSync(rotated).ino !== cursor.inode) throw new Error(`${domain}: rotated legacy log unavailable; manual cutover needed to avoid double counting`);
    importPart(rotated, domain, site.owner, id, generation(statSync(rotated)), cursor.offset);
    importPart(file, domain, site.owner, id, gen, 0);
    return;
  }
  if (prior?.generation.startsWith(`${gen}-truncated-`)) gen = prior.generation;
  if (prior && prior.generation !== gen && !prior.generation.startsWith(`${generation(current)}-truncated-`)) {
    const rotated = `${file}.1`;
    if (existsSync(rotated) && generation(statSync(rotated)) === prior.generation) {
      importPart(rotated, domain, site.owner, id, prior.generation, prior.nextOffset ?? 0);
    } else {
      say(`${domain}: previous log generation unavailable; a collection gap is possible`);
    }
  }
  let offset = states.find((s) => s.generation === gen)?.nextOffset ?? 0;
  if (offset > current.size) {
    gen = `${generation(current)}-truncated-${Math.round(current.mtimeMs).toString(36)}`;
    offset = 0;
    say(`${domain}: log truncated in place; starting a new generation`);
  }
  importPart(file, domain, site.owner, id, gen, offset);
}

try {
  if (!SOURCES.length) say("LOG_IMPORT_SOURCES is empty");
  for (const { file, domain } of SOURCES) importOne(file, domain);
  closeDb();
} catch (err) {
  say(`FATAL: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
  closeDb();
  process.exitCode = 1;
}
