import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { addSite, closeDb, ensureAccount } from "./db";
import { acceptSiteInvite, createSiteInvite, revokeSiteReader } from "./site-access";
import { readContentChecks, writeContentChecks } from "./content-checks-route";
import { MAX_CAPTURE_BYTES } from "./content-checks";

describe("private fact-check HTTP boundary", () => {
  const domain = "private-facts.example";
  const owner = "owner@example.com", reader = "reader@example.com", stranger = "stranger@example.com";
  const params = Promise.resolve({ domain });
  const get = (email: string | null, target = params) => readContentChecks(new Request(`http://localhost/api/content-checks/${domain}`), target, email);
  const post = (email: string | null, body: unknown) => writeContentChecks(new Request(`http://localhost/api/content-checks/${domain}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }), params, email);
  before(() => {
    process.env.TRACKING_DB = ":memory:"; closeDb();
    for (const email of [owner, reader, stranger]) ensureAccount(email);
    addSite(domain, owner); addSite("stranger.example", stranger);
    const invite = createSiteInvite(domain, owner, reader)!;
    assert.equal(acceptSiteInvite(invite.token, reader), domain);
  });
  after(() => { closeDb(); delete process.env.TRACKING_DB; });

  it("allows private owner writes and reader reads while rejecting strangers, readers' writes and revoked access", async () => {
    const check = { action: "create", pagePath: "/pricing", label: "Price", expectedText: "$99", alternatives: [] };
    for (const email of [null, stranger, reader]) assert.equal((await post(email, check)).status, 403);
    assert.equal((await get(null)).status, 403);
    assert.equal((await get(stranger)).status, 403);
    assert.equal((await post(owner, check)).status, 201);
    const capture = { action: "capture", pagePath: "/pricing", contentVersion: "v1", runId: "0468a40b-a467-4d2b-8ec0-5da67317553b", html: '<body><p>$99</p><script>PRIVATE_RAW_MARKER</script></body>' };
    assert.equal((await post(reader, capture)).status, 403);
    const saved = await post(owner, capture);
    assert.equal(saved.status, 201);
    assert.equal((await saved.text()).includes("PRIVATE_RAW_MARKER"), false);
    const readable = await get(reader);
    assert.equal(readable.status, 200);
    const data = await readable.json();
    assert.equal(data.canEdit, false);
    assert.equal(data.captures[0].results[0].status, "found");
    assert.equal(JSON.stringify(data).includes("PRIVATE_RAW_MARKER"), false);
    assert.equal((await get(owner, Promise.resolve({ domain: "stranger.example" }))).status, 403);
    assert.equal((await post(owner, { ...capture, html: "<p>Changed</p>" })).status, 409);
    revokeSiteReader(domain, owner, reader);
    assert.equal((await get(reader)).status, 403);
  });

  it("rejects oversized uploads and malformed input without saving a successful result", async () => {
    assert.equal((await post(owner, { action: "capture", pagePath: "/pricing", contentVersion: "v2", runId: "0468a40b-a467-4d2b-8ec0-5da67317554b", html: "x".repeat(MAX_CAPTURE_BYTES + 1) })).status, 413);
    assert.equal((await post(owner, { action: "create", pagePath: "//outside.example", label: "Price", expectedText: "$99" })).status, 422);
    assert.equal((await post(owner, { action: "create", pagePath: "/pricing", label: "Price", expectedText: "$99", alternatives: Array(6).fill("99 USD") })).status, 422);
    assert.equal((await post(owner, [])).status, 400);
    assert.equal((await (await get(owner)).json()).captures.length, 1);
  });
});
