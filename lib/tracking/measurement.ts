/**
 * The measurement contract shared by all ingest paths. A transport says where
 * the observation entered this installation; it does not identify who caused
 * the observed action. Identity and outcome are independent facts.
 */
export const MEASUREMENT_VERSION = 2;

export type Transport = "browser" | "log" | "server" | "test";
export type IdentityStatus = "unknown" | "claimed" | "verified" | "mismatch" | "missing" | "unavailable" | "stale";
export type TechnicalOutcome = "attempted" | "completed" | "failed" | "cancelled" | "timed_out" | "unknown";
export type BusinessOutcome = "confirmed" | "failed" | "unconfirmed" | "unknown";

export type IdentityEvidence = {
  method: "user_agent" | "ip_range" | "http_signature" | "authenticated_client";
  status: IdentityStatus;
  /** Version/hash of the source used to check the claim, when there was one. */
  sourceVersion?: string | null;
  sourceKey?: string | null;
  checkedAt?: number | null;
};

export type Measurement = {
  version: typeof MEASUREMENT_VERSION;
  /** Null only for legacy senders that cannot supply an idempotency key. */
  eventId: string | null;
  site: string;
  transport: Transport;
  occurredAt: number;
  receivedAt: number;
  actorClaim: string | null;
  identityStatus: IdentityStatus;
  identityEvidence: IdentityEvidence[];
  referralSource: string | null;
  action: string;
  technicalOutcome: TechnicalOutcome;
  businessOutcome: BusinessOutcome;
  taskId: string | null;
  invocationId: string | null;
  parentId: string | null;
  releaseId: string | null;
  toolVersion: string | null;
  schemaVersion: string | null;
  synthetic: boolean;
};

/** A bounded opaque identifier; the value itself cannot contain user content. */
export function eventId(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^[A-Za-z0-9_-]{16,64}$/.test(raw)) return null;
  return raw;
}
