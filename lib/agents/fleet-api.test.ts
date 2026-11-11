import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as getFleet } from "../../app/api/agents/fleet/route";
import { POST as postMcp } from "../../app/api/mcp/route";
import { mintApiToken } from "../tracking/api-token";
import { setApiToken } from "../tracking/db";
import { recordAgentEvents } from "./ingest";
import { saveNotifySettings } from "./store";
import { proOwner, withDb } from "./test-db";

test("GET /api/agents/fleet and MCP get_fleet_status return monitored fleet health and signals", () => withDb(async () => {
  const o = proOwner("fleet-mcp@example.com");
  saveNotifySettings(o, { briefingHour: 8, timezone: "America/New_York", alertsEmail: true, webhook: null });
  const { token, hash } = mintApiToken();
  setApiToken(o, hash);
  const now = Date.now();

  recordAgentEvents(o, [
    { v: 1, id: "ev-cron-fail-1", type: "cron_end", at: now - 5_000, agent: { kind: "cron", name: "nightly-sync", host: "srv-1" }, run: "a".repeat(32), exitCode: 2 },
    { v: 1, id: "ev-claude-s1", type: "session_start", at: now - 4_000, agent: { kind: "claude", name: "webapp", host: "mac-1" }, run: "b".repeat(32) },
    ...Array.from({ length: 5 }, (_, i) => ({
      v: 1 as const,
      id: `ev-claude-err-${i}`,
      type: "tool_end" as const,
      at: now - 3_000 + i * 100,
      agent: { kind: "claude" as const, name: "webapp", host: "mac-1" },
      run: "b".repeat(32),
      tool: "Bash",
      ok: false,
    })),
  ], now);

  // Unauthenticated -> 401
  const unauth = await getFleet(new Request("https://agenttracking.co/api/agents/fleet"));
  assert.equal(unauth.status, 401);

  // Authenticated REST -> 200
  const ok = await getFleet(new Request("https://agenttracking.co/api/agents/fleet", {
    headers: { authorization: `Bearer ${token}` },
  }));
  assert.equal(ok.status, 200);
  const body = await ok.json() as {
    timezone: string;
    counts: { total: number; problem: number };
    agents: { name: string; health: string }[];
    recentSignals: { kind: string }[];
  };
  assert.equal(body.timezone, "America/New_York");
  assert.equal(body.counts.total, 2);
  assert.equal(body.counts.problem, 2);
  assert.equal(body.recentSignals.length, 1);
  assert.equal(body.recentSignals[0].kind, "thrashing");

  // MCP tools/list exposes both get_fleet_status and get_agent_stats
  const listRes = await postMcp(new Request("https://agenttracking.co/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  }));
  const listJson = await listRes.json() as { result: { tools: { name: string }[] } };
  assert.deepEqual(listJson.result.tools.map((t) => t.name).sort(), ["get_agent_stats", "get_fleet_status"]);

  // MCP tools/call get_fleet_status
  const callRes = await postMcp(new Request("https://agenttracking.co/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_fleet_status", arguments: {} } }),
  }));
  const callJson = await callRes.json() as { result: { isError?: boolean; content: { type: string; text: string }[] } };
  assert.notEqual(callJson.result.isError, true);
  assert.equal((JSON.parse(callJson.result.content[0].text) as { counts: { total: number } }).counts.total, 2);
}));
