import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { addSite, closeDb, db, ensureAccount, setApiToken } from "./db";
import { createSiteInvite, acceptSiteInvite, canReadSite, readableSites, revokeSiteInvite, revokeSiteReader, siteRole } from "./site-access";
import { saveFinding, findingsFor } from "./findings";
import { statsFor } from "./stats-api";
import { siteReport } from "./site-report";
import { hashApiToken } from "./api-token";
import { GET as reportGet } from "../../app/api/report/[domain]/route";
import { DIAGNOSTIC_RECIPES, RECIPE_CATALOG_VERSION } from "./diagnostic-recipes";

const NOW = Date.UTC(2026, 8, 25, 12);
const beforeId = "run_before_1234567890", afterId = "run_after_12345678901", fixId = "fix_1234567890123456", findingId = "finding_123456789012";

describe("site readers and private findings", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:"; closeDb();
    for (const email of ["owner@example.com", "reader@example.com", "stranger@example.com"]) ensureAccount(email, NOW);
    addSite("client.example", "owner@example.com", NOW); addSite("other.example", "owner@example.com", NOW);
    setApiToken("reader@example.com", hashApiToken("wmt_reader_test_1234567890"));
    setApiToken("stranger@example.com", hashApiToken("wmt_stranger_test_1234567890"));
  });
  after(() => { closeDb(); delete process.env.TRACKING_DB; });

  it("requires the addressed account, expires and revokes links, grants one site", () => {
    assert.equal(createSiteInvite("client.example", "stranger@example.com", "reader@example.com"), null);
    const expired = createSiteInvite("client.example", "owner@example.com", "reader@example.com", NOW - 8 * 86_400_000)!;
    assert.equal(acceptSiteInvite(expired.token, "reader@example.com", NOW), null);
    const wrong = createSiteInvite("client.example", "owner@example.com", "reader@example.com", NOW)!;
    assert.equal(acceptSiteInvite(wrong.token, "stranger@example.com", NOW), null);
    assert.equal(revokeSiteInvite("client.example", "owner@example.com", wrong.inviteId), true);
    assert.equal(acceptSiteInvite(wrong.token, "reader@example.com", NOW), null);
    const invite = createSiteInvite("client.example", "owner@example.com", "reader@example.com", NOW)!;
    assert.equal(acceptSiteInvite(invite.token, "reader@example.com", NOW), "client.example");
    assert.equal(acceptSiteInvite(invite.token, "reader@example.com", NOW), null);
    assert.equal(siteRole("client.example", "reader@example.com"), "reader");
    assert.equal(canReadSite("other.example", "reader@example.com"), false);
    assert.deepEqual(readableSites("reader@example.com").map((s) => s.domain), ["client.example"]);
    assert.ok(statsFor("client.example", ensureAccount("reader@example.com"), 30, NOW));
    assert.equal(statsFor("other.example", ensureAccount("reader@example.com"), 30, NOW), null);
  });

  it("keeps report export private and revocable", async () => {
    const request = (token: string) => new Request("http://localhost/api/report/client.example", { headers: { authorization: `Bearer ${token}` } });
    const params = { params: Promise.resolve({ domain: "client.example" }) };
    assert.equal((await reportGet(request("wmt_reader_test_1234567890"), params)).status, 200);
    assert.equal((await reportGet(request("wmt_stranger_test_1234567890"), params)).status, 403);
    assert.equal(revokeSiteReader("client.example", "owner@example.com", "reader@example.com"), true);
    assert.equal((await reportGet(request("wmt_reader_test_1234567890"), params)).status, 403);
  });

  it("tracks evidence, correction and genuine retest without crossing sites", () => {
    const insert = db().prepare(`insert into task_runs (domain, run_id, task_kind, target_url, mode, status, started_at, finished_at, deadline_at, result, steps_json, synthetic)
      values (?, ?, 'inquiry_form', 'https://test.client.example/contact', 'deterministic_browser', 'finished', ?, ?, ?, ?, '[]', 1)`);
    insert.run("client.example", beforeId, NOW, NOW + 100, NOW + 1000, "failed");
    insert.run("client.example", afterId, NOW + 200, NOW + 300, NOW + 1200, "passed");
    db().prepare("insert into task_fixes (domain, fix_id, before_run_id, after_run_id, description, created_at) values (?, ?, ?, ?, ?, ?)")
      .run("client.example", fixId, beforeId, afterId, "Fixed missing success marker", NOW + 400);
    const basic = { findingId, taskRunId: beforeId, evidenceRefs: [`run:${beforeId}`], category: "form_discovery", recipeId: "form_discovery_marker_v1", description: "Success marker absent", assignee: "owner@example.com", status: "open" };
    assert.equal(saveFinding("client.example", "owner@example.com", basic, NOW).status, "open");
    assert.throws(() => saveFinding("client.example", "owner@example.com", { ...basic, recipeId: "tool_schema_required_v1" }, NOW), /invalid_recipe/);
    assert.throws(() => saveFinding("client.example", "reader@example.com", { ...basic, status: "fixed" }, NOW + 1), /site_forbidden/);
    assert.throws(() => saveFinding("other.example", "owner@example.com", basic, NOW + 1), /task_run_missing/);
    assert.throws(() => saveFinding("client.example", "owner@example.com", { ...basic, status: "retest_confirmed" }, NOW + 1), /retest_not_confirmed/);
    const confirmed = saveFinding("client.example", "owner@example.com", { ...basic, status: "retest_confirmed", fixId, correction: "Added result marker after local save", retestRunId: afterId }, NOW + 2);
    assert.equal(confirmed.status, "retest_confirmed");
    assert.equal(findingsFor("client.example").length, 1);
    assert.equal(siteReport("client.example", 30, NOW + 3)?.openPoints.length, 0);
    assert.equal(siteReport("client.example", 30, NOW + 3)?.recipeCatalog.version, RECIPE_CATALOG_VERSION);
    assert.ok(DIAGNOSTIC_RECIPES.every((recipe) => recipe.catalogStatus === "suggestion"));
    assert.ok(DIAGNOSTIC_RECIPES.every((recipe) => !JSON.stringify(recipe).includes("client.example")));
  });
});
