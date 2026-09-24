import { MEASUREMENT_VERSION } from "./measurement";

/** Shared, additive explanation for counters created before trusted outcomes exist. */
export const REPORTING_DEFINITIONS = {
  version: MEASUREMENT_VERSION,
  legacyConversionKind: "conversion",
  legacyConversionMeaning: "Unverified browser goal signal; neither a confirmed business outcome nor proof of an agent actor.",
  legacyBoundary: "All existing daily conversion rows use the legacy definition. They cannot be upgraded from aggregate counts.",
  interactionsMeaning: "Legacy sum of referrals, fetches, observed tool calls and unverified goal signals; categories may overlap and are not distinct agents.",
} as const;

export function reportingTotals(totals: { conversions: number }) {
  return {
    legacyGoalSignals: totals.conversions,
    confirmedBusinessOutcomes: null,
    confirmedAgentOutcomes: null,
  };
}
