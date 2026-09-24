import { MEASUREMENT_VERSION } from "./measurement";

/** Shared, additive explanation for counters created before trusted outcomes exist. */
export const REPORTING_DEFINITIONS = {
  version: MEASUREMENT_VERSION,
  legacyConversionKind: "conversion",
  legacyConversionMeaning: "Unverified browser goal signal; neither a confirmed business outcome nor proof of an agent actor.",
  legacyBoundary: "All existing daily conversion rows use the legacy definition. They cannot be upgraded from aggregate counts.",
  legacyFetchMeaning: "The fetches field contains historical UA-classified fetch claims without a persisted per-request IP match. New IP-confirmed requests are in verifiedFetches.",
  verifiedFetchMeaning: "A request's source IP matched a fresh provider-published range; this does not prove content understanding or a specific language model.",
  goalAttemptsMeaning: "Observed browser goal actions since protocol v2; actor and business outcome remain unconfirmed.",
  formAttemptsMeaning: "Observed browser form submits with a toolname marker; this is not proof of an agent invocation or successful completion.",
  interactionsMeaning: "Legacy sum of referrals, fetches, observed tool calls and unverified goal signals; categories may overlap and are not distinct agents.",
  eventUsageMeaning: "One technical tool invocation or one IP-verified HTML fetch counts toward monthly usage. Registrations, checks, simulations, referrals and unverified UA claims are free. A fresh log source takes priority over browser fetch observations; cross-source request identity is unavailable.",
  quotaGapMeaning: "Quota-reached records indicate data omitted from confirmed event counters. Free setup and verification state continues to be recorded.",
  sessionMeaning: "Estimated daily distinct salted address and browser-class hashes with tool calls; not distinct people or agents.",
  burstMeaning: "At least three distinct relevant HTML paths within one imported batch and 30-second gaps; no query or intent can be inferred.",
} as const;

export function reportingTotals(totals: { conversions: number }) {
  return {
    legacyGoalSignals: totals.conversions,
    confirmedBusinessOutcomes: null,
    confirmedAgentOutcomes: null,
  };
}
