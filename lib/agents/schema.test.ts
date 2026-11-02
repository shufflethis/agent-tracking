import assert from "node:assert/strict";
import { test } from "node:test";
import { db, pruneRaw } from "../tracking/db";
import { owner, withDb } from "./test-db";

const cols = (table: string) => new Set((db().prepare(`pragma table_info(${table})`).all() as { name: string }[]).map((c) => c.name));

test("migration 19 creates agent tables", () => withDb(() => {
  for (const t of ["agent_tokens", "agent_device_codes", "agents", "agent_runs", "agent_events", "agent_daily", "agent_usage"]) {
    assert.ok(cols(t).size > 0, `${t} missing`);
  }
  const a = cols("accounts");
  for (const c of ["briefing_hour", "briefing_last_day", "webhook_kind", "webhook_url", "webhook_chat_id", "alerts_email"]) assert.ok(a.has(c), c);
  assert.ok(cols("agent_runs").has("open_tools"));
}));

test("pruneRaw expires agent data on its own clock", () => withDb(() => {
  const now = Date.UTC(2026, 10, 2, 12);
  const day = 86_400_000;
  const o = owner();
  const d = db();
  d.prepare("insert into agents (id, owner, kind, name, host, first_seen, last_seen) values ('a1', ?, 'cron', 'job', 'h', ?, ?)").run(o, now, now);
  const run = d.prepare("insert into agent_runs (id, agent_id, run_key, started_at, ended_at, status, last_event_at, last_event_type, tail, tail_at) values (?, 'a1', ?, ?, ?, 'ok', ?, 'cron_end', ?, ?)");
  run.run("r91", "k91", now - 91 * day, now - 91 * day, now - 91 * day, null, null);
  run.run("r89", "k89", now - 89 * day, now - 89 * day, now - 89 * day, "old tail", now - 8 * day);
  run.run("rnew", "knew", now, now, now, "fresh tail", now - day);
  const ev = d.prepare("insert into agent_events (id, owner, run_id, at, received_at, type) values (?, ?, 'r89', ?, ?, 'cron_end')");
  ev.run("e31", o, now - 31 * day, now - 31 * day);
  ev.run("e29", o, now - 29 * day, now - 29 * day);
  pruneRaw(now);
  const runs = (d.prepare("select id, tail from agent_runs order by id").all() as { id: string; tail: string | null }[]);
  assert.deepEqual(runs.map((r) => r.id), ["r89", "rnew"]);
  assert.equal(runs[0].tail, null);
  assert.equal(runs[1].tail, "fresh tail");
  assert.deepEqual((d.prepare("select id from agent_events").all() as { id: string }[]).map((r) => r.id), ["e29"]);
}));
