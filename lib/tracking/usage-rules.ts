/** Technical events that consume one monthly agent-event unit. */
export function browserUsage(kind: string, simulated: boolean, source: string | null, identityStatus: string | undefined, fetchesFromLog: boolean): 0 | 1 {
  if (simulated) return 0;
  if (kind === "tool_call") return 1;
  if (kind === "view" && source?.startsWith("agent:") && identityStatus === "verified" && !fetchesFromLog) return 1;
  return 0;
}

export function logUsage(identityStatus: string | undefined): 0 | 1 {
  return identityStatus === "verified" ? 1 : 0;
}
