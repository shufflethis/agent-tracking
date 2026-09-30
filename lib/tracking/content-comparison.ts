import type { ContentCapture } from "./content-checks";

/** Compare immutable criteria snapshots; this module also runs in the dashboard. */
export function compareContentCaptures(before: ContentCapture, after: ContentCapture) {
  const invalidPair = before.domain !== after.domain || before.pagePath !== after.pagePath ||
    before.runId === after.runId || before.contentVersion === after.contentVersion;
  if (invalidPair) return { valid: false, methodChanged: false, verifierChanged: false, checksChanged: false, uncheckable: false, rows: [] };
  const later = new Map(after.results.map((result) => [result.checkId, result]));
  let checksChanged = before.results.length !== after.results.length;
  const rows = before.results.flatMap((old) => {
    const next = later.get(old.checkId);
    if (!next) { checksChanged = true; return []; }
    if (old.expectedText !== next.expectedText || JSON.stringify(old.alternatives) !== JSON.stringify(next.alternatives)) {
      checksChanged = true;
      return [];
    }
    return [{ old, next }];
  });
  return {
    valid: true,
    methodChanged: before.method !== after.method,
    verifierChanged: before.verifierVersion !== after.verifierVersion,
    checksChanged,
    uncheckable: [...before.results, ...after.results].some((result) => result.status === "uncheckable"),
    rows,
  };
}
