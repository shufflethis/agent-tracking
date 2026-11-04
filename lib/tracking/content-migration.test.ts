import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";
import { closeDb, db } from "./db";

it("upgrades a version-16 database without changing historical capture evidence", () => {
  const directory = mkdtempSync(join(tmpdir(), "content-migration-"));
  const previous = process.env.TRACKING_DB;
  process.env.TRACKING_DB = join(directory, "fixture.sqlite");
  closeDb();
  try {
    // Recreate the prior schema using an isolated local database.
    const fixture = db();
    fixture.exec("alter table content_captures drop column html_snapshot");
    fixture.exec("alter table server_outcomes drop column environment");
    for (const column of ["environment", "duration_ms", "plugin_version", "error_class"]) fixture.exec(`alter table server_tool_calls drop column ${column}`);
    fixture.exec("delete from schema_migrations where version>=17");
    fixture.prepare(`insert into content_captures
      (domain, run_id, page_path, content_version, content_hash, method, verifier_version, captured_at, results_json)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("fixture.example", "old-run", "/pricing", "v1", "old-hash", "visible-source-html-v1", "1", 1000, '[]');
    closeDb();
    const upgraded = db();
    const row = upgraded.prepare("select content_hash, verifier_version, results_json, html_snapshot from content_captures where run_id='old-run'").get() as Record<string, unknown> | undefined;
    assert.ok(row);
    assert.deepEqual({ ...row }, { content_hash: "old-hash", verifier_version: "1", results_json: "[]", html_snapshot: "" });
    assert.equal((upgraded.prepare("select max(version) as version from schema_migrations").get() as { version: number }).version, 24);
  } finally {
    closeDb();
    if (previous === undefined) delete process.env.TRACKING_DB;
    else process.env.TRACKING_DB = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
