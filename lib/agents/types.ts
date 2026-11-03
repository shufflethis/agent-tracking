import type { Snapshot } from "./snapshot";
/** Shared shapes of the agent-monitoring subsystem. The CLI keeps a copy in cli/src/event.ts; a test checks they agree. */

export type AgentKind = "claude" | "cron" | "custom";
export const AGENT_KINDS: readonly AgentKind[] = ["claude", "cron", "custom"];

export type AgentEventType =
  | "session_start" | "tool_start" | "tool_end" | "turn_end" | "subagent_end" | "notification" | "session_end"
  | "cron_start" | "cron_end" | "turn_start" | "turn_error" | "waiting" | "subagent_start" | "config_snapshot" | "kernel_event";
export const AGENT_EVENT_TYPES: readonly AgentEventType[] = [
  "session_start", "tool_start", "tool_end", "turn_end", "subagent_end", "notification", "session_end", "cron_start", "cron_end", "turn_start", "turn_error", "waiting", "subagent_start", "config_snapshot", "kernel_event",
];

export type RunStatus = "running" | "ok" | "failed" | "hung" | "missed";

export type AgentEvent = {
  snapshot?: Snapshot;
  kernel?: { operation: "process_exec" | "file_open" | "network_connect"; processId: string };
  callId?: string; childId?: string; dataLoss?: boolean;
  checkName?: string; checkVersion?: string;
  v: 1;
  id: string;
  type: AgentEventType;
  at: number;
  agent: { kind: AgentKind; name: string; host: string };
  /** HMAC hex (claude) or a random id (cron); 16-64 of [0-9a-f-]. */
  run: string;
  /** tool_start / tool_end only. */
  tool?: string;
  /** tool_end only. */
  ok?: boolean;
  /** cron_end only, 0-255. */
  exitCode?: number;
  /** cron_end only, up to 7 days. */
  durationMs?: number;
  /** cron_start only, 1 minute to 31 days. */
  expectEveryMs?: number;
  /** cron_end only, at most 4000 characters, already masked by the CLI. */
  tail?: string;
};

export const AGENT_LIMIT = 50;
export const AGENT_EVENTS_PER_MONTH = 50_000;
export const MAX_BATCH = 100;
