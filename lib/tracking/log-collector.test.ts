import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { addSite, closeDb, ensureAccount, logAttemptPaths, logSourceStates } from "./db";

const ua = "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)";
const logLine = (time: string, path: string) => `1.1.1.1 - - [${time}] "GET ${path} HTTP/1.1" 200 1234 "-" "${ua}"\n`;

describe("local log collector", () => {
  it("continues after append and rotation without recounting a retry", () => {
    const dir = mkdtempSync(join(tmpdir(), "agent-log-collector-"));
    const file = join(dir, "access.log");
    const dbFile = join(dir, "tracking.sqlite");
    const now = Date.UTC(2026, 8, 8, 12);
    process.env.TRACKING_DB = dbFile;
    closeDb();
    ensureAccount("collector@x.com", now);
    addSite("collector.example", "collector@x.com", now);
    closeDb();
    const run = () => {
      const child = spawnSync(process.execPath, ["--import", "tsx", "scripts/log-import.ts"], {
        cwd: process.cwd(), env: { ...process.env, TRACKING_DB: dbFile, LOG_IMPORT_SOURCES: `${file}=collector.example` }, encoding: "utf8",
      });
      assert.equal(child.status, 0, child.stderr || child.stdout);
    };
    try {
      writeFileSync(file, logLine("08/Sep/2026:06:00:10 +0200", "/one"));
      run();
      run();
      appendFileSync(file, logLine("08/Sep/2026:06:00:00 +0200", "/late"));
      run();
      renameSync(file, `${file}.1`);
      appendFileSync(`${file}.1`, logLine("08/Sep/2026:06:00:11 +0200", "/old-tail"));
      writeFileSync(file, logLine("08/Sep/2026:06:00:12 +0200", "/new"));
      run();
      run();
      assert.equal(logAttemptPaths("collector.example", 30, now).reduce((n, a) => n + a.count, 0), 4);
      assert.equal(logSourceStates("collector.example").length, 2);
    } finally {
      closeDb();
      delete process.env.TRACKING_DB;
    }
  });
});
