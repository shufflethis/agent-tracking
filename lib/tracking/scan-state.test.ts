import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { CHECK_ORIGIN } from "../site";
import { dataState } from "./data-state";
import { addSite, closeDb, dueScanSites, ensureAccount, getSite, markVerified, scanJob, scanSchedulerHeartbeat, startScanAttempt, finishScanAttempt } from "./db";
import { scanStatusText } from "./scan-display";

const NOW = Date.UTC(2026, 8, 25, 12);
const labels = { notScanned: "none", scanScheduled: "within 24h", scanPending: "planned", scanRunning: "running", scanFailed: "failed", scanDisabled: "disabled", scanUnscheduled: "unscheduled", scanSucceeded: "success" };

describe("scan lifecycle", () => {
  before(() => { process.env.TRACKING_DB = ":memory:"; closeDb(); });
  after(() => { closeDb(); delete process.env.TRACKING_DB; });

  it("ties the 24-hour label to a persisted job and a live cron heartbeat", () => {
    ensureAccount("scan@x.com", NOW);
    addSite("scan.example", "scan@x.com", NOW);
    markVerified("scan.example", NOW);
    const initial = scanJob("scan.example", NOW);
    assert.equal(initial?.status, CHECK_ORIGIN ? "unscheduled" : "disabled");
    assert.notEqual(scanStatusText(initial, labels, NOW), "within 24h");
    if (!CHECK_ORIGIN) return;
    scanSchedulerHeartbeat(NOW + 1);
    assert.equal(scanStatusText(scanJob("scan.example", NOW + 1), labels, NOW + 1), "within 24h");
    assert.deepEqual(dueScanSites(NOW + 1), ["scan.example"]);
    const id = startScanAttempt("scan.example", NOW + 2);
    assert.ok(id);
    assert.equal(scanJob("scan.example", NOW + 2)?.status, "running");
    finishScanAttempt("scan.example", id, { ok: false, code: "network_error" }, NOW + 3);
    assert.equal(scanJob("scan.example", NOW + 3)?.status, "failed");
    assert.equal(getSite("scan.example")?.last_score, null);
    scanSchedulerHeartbeat(NOW + 86_400_004);
    const retry = startScanAttempt("scan.example", NOW + 86_400_005);
    assert.ok(retry);
    finishScanAttempt("scan.example", retry, { ok: true, score: 85, grade: "B" }, NOW + 86_400_006);
    assert.equal(getSite("scan.example")?.last_score, 85);
    const nextDue = scanJob("scan.example", NOW + 86_400_006)?.dueAt;
    markVerified("scan.example", NOW + 86_400_007);
    assert.equal(scanJob("scan.example", NOW + 86_400_007)?.dueAt, nextDue, "reverification does not restart a 24-hour promise");
  });

  it("shows missing or stale data instead of a false zero", () => {
    const site = getSite("scan.example");
    assert.ok(site);
    const base = { acceptedBeacons: 0, quotaGaps: 0, logFresh: false, windowDays: 30, now: NOW };
    assert.equal(dataState(site, base), "no_data_yet");
    assert.equal(dataState(site, { ...base, acceptedBeacons: 1 }), "active");
    assert.equal(dataState(site, { ...base, quotaGaps: 1 }), "quota_reached");
    assert.equal(dataState({ ...site, last_beacon_at: NOW - 40 * 86_400_000 }, base), "source_stale");
    assert.equal(dataState({ ...site, log_since: NOW - 40 * 86_400_000 }, base), "source_stale");
  });
});
