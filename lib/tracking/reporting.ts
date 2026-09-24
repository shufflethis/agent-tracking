import { MEASUREMENT_VERSION } from "./measurement";

/** Shared, additive explanation for counters created before trusted outcomes exist. */
export const REPORTING_DEFINITIONS = {
  version: MEASUREMENT_VERSION,
  legacyConversionKind: "conversion",
  legacyConversionMeaning: "Unverified browser goal signal; neither a confirmed business outcome nor proof of an agent actor.",
  legacyBoundary: "All existing daily conversion rows use the legacy definition. They cannot be upgraded from aggregate counts.",
  goalAttemptsMeaning: "Observed browser goal actions since protocol v2; actor and business outcome remain unconfirmed.",
  formAttemptsMeaning: "Observed browser form submits with a toolname marker; this is not proof of an agent invocation or successful completion.",
  interactionsMeaning: "Legacy sum of referrals, fetches, observed tool calls and unverified goal signals; categories may overlap and are not distinct agents.",
} as const;

export function reportingTotals(totals: { conversions: number }) {
  return {
    legacyGoalSignals: totals.conversions,
    confirmedBusinessOutcomes: null,
    confirmedAgentOutcomes: null,
  };
}
