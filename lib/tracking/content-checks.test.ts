import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { addSite, closeDb, db, ensureAccount, pruneRaw, removeSite } from "./db";
import { contentCapturesFor, contentChecksFor, createContentCheck, evaluateContentChecks, normalizePagePath, recordContentCapture, visibleHtmlText } from "./content-checks";

describe("versioned visible HTML fact checks", () => {
  before(() => {
    process.env.TRACKING_DB = ":memory:";
    closeDb();
    ensureAccount("facts@example.com");
    ensureAccount("other@example.com");
    addSite("facts.example", "facts@example.com");
    addSite("other.example", "other@example.com");
  });
  after(() => { closeDb(); delete process.env.TRACKING_DB; });

  it("extracts visible body text and excludes executable and explicitly hidden markup", () => {
    assert.equal(visibleHtmlText(`<html><head><title>Ignored</title></head><body><p>Prix <strong>de lancement</strong></p><script>secret price</script><style>.x{color:red}</style><template>draft</template><div hidden>hidden</div><span aria-hidden="true">also hidden</span><i style="display: none">not displayed</i></body></html>`), "Prix de lancement");
  });

  it("distinguishes a visible phrase, an absent phrase, a script-only phrase and an unprocessable capture", () => {
    const checks = [
      { checkId: "visible", label: "price", expectedText: "€99 per month", alternatives: [] },
      { checkId: "absent", label: "support", expectedText: "24/7 support", alternatives: [] },
      { checkId: "script", label: "hidden price", expectedText: "€149 per month", alternatives: [] },
    ];
    const result = evaluateContentChecks({ html: `<body><p>Plans start at <b>€99</b> per month.</p><script>const price = "€149 per month"</script></body>`, checks });
    assert.deepEqual(result.results.map((row) => row.status), ["found", "not_found", "not_found"]);
    assert.equal(result.results[0].matchedText, "€99 per month");
    assert.match(result.results[0].evidence ?? "", /Plans start at/);
    const uncheckable = evaluateContentChecks({ html: "<body><script>not visible text</script></body>", checks, parseHtml: () => { throw new Error("fixture parse failure"); } });
    assert.ok(uncheckable.results.every((row) => row.status === "uncheckable" && row.matchedText === null && row.evidence === null));
  });

  it("normalizes same-origin page paths and rejects malformed or external paths", () => {
    assert.equal(normalizePagePath("/offers/../pricing", "facts.example"), "/pricing");
    assert.throws(() => normalizePagePath("//outside.example/path", "facts.example"), /invalid_page_path/);
    assert.throws(() => normalizePagePath("/pricing?draft=1", "facts.example"), /invalid_page_path/);
  });

  it("excludes a hidden body and marks empty or overly complex captures uncheckable", () => {
    assert.equal(visibleHtmlText('<body hidden><p>Secret</p></body>'), "");
    assert.equal(visibleHtmlText('<body style="display:none"><p>Secret</p></body>'), "");
    const checks = [{ checkId: "price", label: "Price", expectedText: "$99", alternatives: [] }];
    for (const html of ["", "<script>$99</script>", "<div>".repeat(260) + "$99" + "</div>".repeat(260)]) {
      const result = evaluateContentChecks({ html, checks });
      assert.equal(result.results[0].status, "uncheckable");
      assert.equal(result.results[0].evidence, null);
    }
  });

  it("matches normalized literal alternatives and keeps full long evidence with Unicode offsets", () => {
    const expectedText = "x".repeat(240);
    const checks = [{ checkId: "long", label: "Long", expectedText, alternatives: [] }];
    const result = evaluateContentChecks({ html: `<p>${"İ ".repeat(80)}${expectedText} suffix</p>`, checks });
    assert.equal(result.results[0].status, "found");
    assert.ok(result.results[0].evidence?.includes(expectedText));
    assert.ok((result.results[0].evidence?.length ?? 0) <= 400);
    const alternative = evaluateContentChecks({ html: '<p>Plan: 99&nbsp;USD/month (monthly).</p>', checks: [{ ...checks[0], expectedText: "$99 per month", alternatives: ["99 USD/MONTH (monthly)."] }] });
    assert.equal(alternative.results[0].status, "found");
    assert.equal(alternative.results[0].matchedText, "99 USD/MONTH (monthly).");
    assert.equal(evaluateContentChecks({ html: '<p>99 USD/month (monthly)X</p>', checks: [{ ...checks[0], expectedText: "99 USD/month (monthly).", alternatives: [] }] }).results[0].status, "not_found");
  });

  it("stores immutable, idempotent evidence with content versions and site ownership", () => {
    const check = createContentCheck({ domain: "facts.example", owner: "facts@example.com", pagePath: "/pricing", label: "Monthly price", expectedText: "$99 per month", alternatives: ["99 USD/month"] });
    assert.deepEqual(check.alternatives, ["99 USD/month"]);
    assert.throws(() => createContentCheck({ domain: "facts.example", owner: "other@example.com", pagePath: "/pricing", label: "Price", expectedText: "$99" }), /site_forbidden/);

    const runId = "0468a40b-a467-4d2b-8ec0-5da67317553b";
    const first = recordContentCapture({ domain: "facts.example", owner: "facts@example.com", runId, pagePath: "/pricing", contentVersion: "release-a", html: `<body><p>Plans start at $99 per month.</p></body>`, now: 1000 });
    assert.equal(first.results[0].status, "found");
    assert.equal(recordContentCapture({ domain: "facts.example", owner: "facts@example.com", runId, pagePath: "/pricing", contentVersion: "release-a", html: `<body><p>Plans start at $99 per month.</p></body>`, now: 2000 }).capturedAt, 1000);
    assert.throws(() => recordContentCapture({ domain: "facts.example", owner: "facts@example.com", runId, pagePath: "/pricing", contentVersion: "release-b", html: `<body><p>Plans start at $99 per month.</p></body>` }), /capture_id_conflict/);

    const second = recordContentCapture({ domain: "facts.example", owner: "facts@example.com", runId: "0468a40b-a467-4d2b-8ec0-5da67317554b", pagePath: "/pricing", contentVersion: "release-b", html: `<body><p>Contact us about pricing.</p></body>`, now: 3000 });
    assert.equal(second.results[0].status, "not_found");
    assert.equal(second.results[0].expectedText, first.results[0].expectedText);
    const stored = db().prepare("select html_snapshot from content_captures where domain=? and run_id=?").get("facts.example", runId) as { html_snapshot: string };
    assert.equal(stored.html_snapshot, `<body><p>Plans start at $99 per month.</p></body>`);
    assert.equal(JSON.stringify(contentCapturesFor("facts.example")).includes("html_snapshot"), false);
    assert.equal(contentChecksFor("other.example").length, 0);
    assert.deepEqual(contentCapturesFor("other.example"), []);
    assert.equal(contentCapturesFor("facts.example", "/pricing").length, 2);
    createContentCheck({ domain: "facts.example", owner: "facts@example.com", pagePath: "/pricing", label: "Support", expectedText: "24/7 support" });
    assert.deepEqual(recordContentCapture({ domain: "facts.example", owner: "facts@example.com", runId, pagePath: "/pricing", contentVersion: "release-a", html: `<body><p>Plans start at $99 per month.</p></body>` }).results, first.results);

    pruneRaw(3000 + 90 * 86_400_000 + 1);
    const expired = db().prepare("select html_snapshot from content_captures where domain=? and run_id=?").get("facts.example", runId) as { html_snapshot: string };
    assert.equal(expired.html_snapshot, "");
    assert.equal(contentCapturesFor("facts.example", "/pricing").find((capture) => capture.runId === runId)?.results[0].status, "found");

    assert.equal(removeSite("facts.example", "facts@example.com"), true);
    assert.deepEqual(contentChecksFor("facts.example"), []);
    assert.deepEqual(contentCapturesFor("facts.example"), []);
  });

  it("enforces page/site check counts, HTML size and capture frequency without blocking identical retries", () => {
    addSite("limits.example", "facts@example.com");
    const create = (pagePath: string) => createContentCheck({ domain: "limits.example", owner: "facts@example.com", pagePath, label: "Price", expectedText: "$99" });
    for (let index = 0; index < 20; index += 1) create("/pricing");
    assert.throws(() => create("/pricing"), /page_check_limit/);
    for (let index = 0; index < 30; index += 1) create(`/page-${index}`);
    assert.throws(() => create("/another"), /site_check_limit/);
    const input = { domain: "limits.example", owner: "facts@example.com", pagePath: "/pricing", contentVersion: "v1", html: "<p>$99</p>", now: 1000 };
    const runId = "0468a40b-a467-4d2b-8ec0-5da67317553b";
    assert.throws(() => recordContentCapture({ ...input, runId, html: "x".repeat(256 * 1024 + 1) }), /capture_too_large/);
    for (let index = 0; index < 20; index += 1) recordContentCapture({ ...input, runId: `0468a40b-a467-4d2b-8ec0-${index.toString(16).padStart(12, "0")}` });
    assert.throws(() => recordContentCapture({ ...input, runId }), /capture_rate_limit/);
    assert.equal(recordContentCapture({ ...input, runId: "0468a40b-a467-4d2b-8ec0-000000000000" }).results[0].status, "found");
  });
});
