/** Server-only MCP telemetry. No tool arguments, results or provider IDs are sent. */
import { createHmac, randomUUID } from "node:crypto";

export type TrackingContext = { invocationId: string; taskId?: string };
type Options = {
  origin: string; domain: string; toolToken: string; outcomeToken?: string;
  environment?: "production" | "test"; pluginVersion?: string;
  /** A site-specific secret; rotate to reset conversation correlation. */
  correlationSecret?: string; timeoutMs?: number;
  onDeliveryError?: () => void;
};
type Extra = { _meta?: Record<string, unknown> };
export class MCPTracking {
  constructor(private readonly options: Options) {
    const url = new URL(options.origin);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Tracking requires HTTPS");
    if (options.correlationSecret && options.correlationSecret.length < 32) throw new Error("Use a correlation secret of at least 32 characters");
  }
  private async send(endpoint: string, token: string | undefined, payload: object): Promise<boolean> {
    try {
      if (!token) throw new Error("Missing write credential");
      const response = await fetch(`${this.options.origin.replace(/\/$/, "")}/api/${endpoint}/${encodeURIComponent(this.options.domain)}`, {
        method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ ...payload, environment: this.options.environment ?? "production" }),
        signal: AbortSignal.timeout(Math.max(1, Math.min(this.options.timeoutMs ?? 800, 5000))), redirect: "error",
      });
      if (!response.ok) throw new Error("Delivery failed");
      return true;
    } catch {
      try { this.options.onDeliveryError?.(); } catch { /* diagnostics cannot break tools */ }
      return false;
    }
  }
  wrap<Args, E extends Extra, Result>(toolName: string, handler: (args: Args, extra: E, tracking: TrackingContext) => Result | Promise<Result>) {
    return async (args: Args, extra: E): Promise<Result> => {
      const session = extra._meta?.["openai/session"];
      const taskId = this.options.correlationSecret && typeof session === "string" && session.length <= 512
        ? createHmac("sha256", this.options.correlationSecret).update(`${this.options.domain}\0${this.options.environment ?? "production"}\0${session}`).digest("hex") : undefined;
      const context: TrackingContext = { invocationId: randomUUID(), taskId };
      const started = performance.now();
      let technicalOutcome = "completed", errorClass: string | undefined;
      try {
        const result = await handler(args, extra, context);
        if (result && typeof result === "object" && "isError" in result && result.isError === true) { technicalOutcome = "failed"; errorClass = "ToolError"; }
        return result;
      } catch (error) {
        const name = error instanceof Error ? error.name : "Error";
        errorClass = name === "TimeoutError" || name === "AbortError" ? name : "Error";
        technicalOutcome = name === "TimeoutError" ? "timed_out" : name === "AbortError" ? "cancelled" : "failed";
        throw error;
      } finally {
        await this.send("server-tools", this.options.toolToken, {
          ...context, occurredAt: Date.now(), toolName, technicalOutcome, actorKind: "unknown",
          durationMs: Math.min(86_400_000, Math.max(0, Math.round(performance.now() - started))),
          pluginVersion: this.options.pluginVersion, errorClass,
        });
      }
    };
  }
  /** Call only after the backend confirms the action. Persist these fields for retries. */
  outcome(input: TrackingContext & { receiptId: string; kind: "inquiry_created" | "booking_created" | "pdf_created" | "pdf_fetched"; occurredAt: number; status?: "confirmed" | "failed" }) {
    return this.send("outcomes", this.options.outcomeToken, { ...input, status: input.status ?? "confirmed" });
  }
}
