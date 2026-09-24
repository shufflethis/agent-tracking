import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { TrackingServerClient } from "./tracking-client";

/** A local example: the application creates a durable inquiry before reporting it. */
export async function createInquiry(input: { taskId?: string; invocationId?: string }, saveInquiry: (id: string) => Promise<void>, tracking: TrackingServerClient) {
  const receiptId = randomUUID();
  await saveInquiry(receiptId); // Replace with your database transaction. This must actually succeed.
  await tracking.inquiryCreated({ receiptId, taskId: input.taskId, invocationId: input.invocationId });
  return receiptId;
}

if (process.argv[1]?.endsWith("example.ts")) {
  const origin = process.env.TRACKING_ORIGIN ?? "http://localhost:3000";
  const domain = process.env.TRACKING_SITE ?? "example.com";
  const token = process.env.TRACKING_OUTCOME_TOKEN;
  if (!token) throw new Error("Set TRACKING_OUTCOME_TOKEN on the server");
  const file = process.env.TRACKING_EXAMPLE_DB ?? join(process.cwd(), ".data", "inquiry-example.sqlite");
  mkdirSync(dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec("create table if not exists inquiries (id text primary key, created_at integer not null)");
  createInquiry({}, async (id) => {
    database.prepare("insert into inquiries (id, created_at) values (?, ?)").run(id, Date.now());
    console.log(`Local inquiry persisted: ${id}`);
  }, new TrackingServerClient(origin, domain, token))
    .then((id) => console.log(`Confirmed receipt sent: ${id}`))
    .finally(() => database.close());
}
