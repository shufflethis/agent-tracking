import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../tracking/db";
import { agentTokenOwner, approveDeviceLogin, listAgentTokens, mintAgentToken, pollDeviceLogin, revokeAgentToken, startDeviceLogin } from "./tokens";
import { owner, withDb } from "./test-db";

test("agent token round-trip and revoke", () => withDb(() => {
  const o = owner();
  const { id, token } = mintAgentToken(o, "server1");
  assert.match(token, /^atk_[A-Za-z0-9_-]{32}$/);
  assert.deepEqual(agentTokenOwner(token), { owner: o, tokenId: id });
  assert.doesNotMatch(JSON.stringify(db().prepare("select * from agent_tokens").all()), new RegExp(token));
  assert.equal(listAgentTokens(o)[0].hostLabel, "server1");
  assert.equal(revokeAgentToken("someone@else.example", id), false);
  assert.equal(revokeAgentToken(o, id), true);
  assert.equal(agentTokenOwner(token), null);
  assert.equal(agentTokenOwner("wmt_notours"), null);
  assert.equal(agentTokenOwner(null), null);
}));

test("device flow hands out the token once", () => withDb(() => {
  const o = owner();
  const now = 1_000_000;
  const start = startDeviceLogin("laptop", now);
  assert.match(start.userCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
  assert.deepEqual(pollDeviceLogin(start.deviceCode, now + 1000), { status: "pending" });
  assert.equal(approveDeviceLogin(start.userCode.toLowerCase(), o, now + 2000), "approved");
  const got = pollDeviceLogin(start.deviceCode, now + 3000);
  assert.equal(got.status, "approved");
  assert.ok(got.status === "approved" && agentTokenOwner(got.token)?.owner === o);
  assert.deepEqual(pollDeviceLogin(start.deviceCode, now + 4000), { status: "expired" });
  assert.equal(listAgentTokens(o)[0].hostLabel, "laptop");
  assert.doesNotMatch(JSON.stringify(db().prepare("select * from agent_device_codes").all()), new RegExp(start.deviceCode));
}));

test("device code expires after 10 minutes", () => withDb(() => {
  const o = owner();
  const start = startDeviceLogin("laptop", 0);
  assert.equal(approveDeviceLogin(start.userCode, o, 11 * 60_000), "expired");
  assert.deepEqual(pollDeviceLogin(start.deviceCode, 11 * 60_000), { status: "expired" });
  assert.equal(approveDeviceLogin("ZZZZ-ZZZZ", o, 0), "unknown");
}));
