import { closeDb, db, ensureAccount, setAgentPlan } from "../tracking/db";

/** Test utility: run `fn` against a fresh in-memory tracking store. */
export async function withDb<T>(fn: () => T | Promise<T>): Promise<T> {
  const old = process.env.TRACKING_DB;
  const oldSecret = process.env.UNLOCK_SECRET;
  process.env.TRACKING_DB = ":memory:";
  process.env.UNLOCK_SECRET ||= "test-unlock-secret-for-agent-tests-0123456789";
  closeDb();
  try {
    db();
    return await fn();
  } finally {
    closeDb();
    if (old === undefined) delete process.env.TRACKING_DB; else process.env.TRACKING_DB = old;
    if (oldSecret === undefined) delete process.env.UNLOCK_SECRET; else process.env.UNLOCK_SECRET = oldSecret;
  }
}

export const owner = (email = "owner@example.com") => ensureAccount(email).email;

/** An account on agent monitoring Pro, for tests of Pro features (webhooks, OTLP, checks). */
export const proOwner = (email = "owner@example.com") => { const o = owner(email); setAgentPlan(o, "pro"); return o; };
