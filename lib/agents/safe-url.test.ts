import assert from "node:assert/strict";
import { test } from "node:test";
import { isPublicAddress, resolvePublicTarget, webhookHostAllowed } from "./safe-url";

test("private, loopback, link-local and special ranges are not public", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::", "fe80::1", "fc00::1", "fd12::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "224.0.0.1", "255.255.255.255"]) {
    assert.equal(isPublicAddress(ip), false, ip);
  }
  for (const ip of ["1.1.1.1", "8.8.8.8", "172.32.0.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(ip), true, ip);
});

test("slack and discord are pinned to their own hosts, generic to https on 443", () => {
  assert.equal(webhookHostAllowed("slack", new URL("https://hooks.slack.com/services/x")), true);
  assert.equal(webhookHostAllowed("slack", new URL("https://evil.example/hooks.slack.com")), false);
  assert.equal(webhookHostAllowed("discord", new URL("https://discord.com/api/webhooks/1/x")), true);
  assert.equal(webhookHostAllowed("discord", new URL("https://discordapp.com/api/webhooks/1/x")), true);
  assert.equal(webhookHostAllowed("discord", new URL("https://discord.com.evil.example/api")), false);
  assert.equal(webhookHostAllowed("generic", new URL("https://example.com/hook")), true);
  assert.equal(webhookHostAllowed("generic", new URL("https://example.com:3200/hook")), false);
  assert.equal(webhookHostAllowed("generic", new URL("https://user:pw@example.com/hook")), false);
});

test("targets that resolve to internal addresses are refused", async () => {
  const resolver = (map: Record<string, string[]>) => async (host: string) => (map[host] ?? []).map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
  assert.equal(await resolvePublicTarget("https://localhost/x", resolver({ localhost: ["127.0.0.1"] })), null);
  assert.equal(await resolvePublicTarget("https://127.0.0.1/x", resolver({})), null);
  assert.equal(await resolvePublicTarget("https://[::1]/x", resolver({})), null);
  assert.equal(await resolvePublicTarget("https://mixed.example/x", resolver({ "mixed.example": ["1.1.1.1", "10.0.0.5"] })), null);
  assert.equal(await resolvePublicTarget("https://nothing.example/x", resolver({})), null);
  assert.equal(await resolvePublicTarget("http://ok.example/x", resolver({ "ok.example": ["1.1.1.1"] })), null);
  assert.deepEqual(await resolvePublicTarget("https://OK.example./x", resolver({ "ok.example": ["1.1.1.1"] })), { address: "1.1.1.1", family: 4, host: "ok.example" });
});
