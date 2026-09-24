/** Server-only integration. Keep the write token in a server environment variable. */
export class TrackingServerClient {
  constructor(private readonly origin: string, private readonly domain: string, private readonly outcomeToken: string, private readonly toolToken?: string) {}

  private async send(path: string, token: string, payload: unknown) {
    const response = await fetch(`${this.origin.replace(/\/$/, "")}/api/${path}/${encodeURIComponent(this.domain)}`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Tracking server returned ${response.status}`);
    return response.json() as Promise<{ ok: true; result: "created" | "duplicate" }>;
  }

  inquiryCreated(input: { receiptId: string; occurredAt?: number; taskId?: string; invocationId?: string }) {
    return this.send("outcomes", this.outcomeToken, { receiptId: input.receiptId, kind: "inquiry_created", status: "confirmed", occurredAt: input.occurredAt ?? Date.now(), taskId: input.taskId, invocationId: input.invocationId });
  }

  remoteToolCalled(input: { invocationId: string; taskId?: string; occurredAt?: number; toolName: string; technicalOutcome: "attempted" | "completed" | "failed" | "cancelled" | "timed_out" | "unknown"; actorKind: "agent" | "human" | "unknown" }) {
    if (!this.toolToken) throw new Error("Tool telemetry token is not configured");
    return this.send("server-tools", this.toolToken, { ...input, occurredAt: input.occurredAt ?? Date.now() });
  }
}
