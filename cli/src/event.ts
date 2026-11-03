import type { Snapshot } from "./snapshot.js";
/** Copy of lib/agents/types.ts AgentEvent. cli/src/hook.test.ts checks the server accepts what the CLI builds. */
export type AgentKind = "claude" | "cron" | "custom";
export type AgentEventType =
  | "session_start" | "tool_start" | "tool_end" | "turn_end" | "subagent_end" | "notification" | "session_end"
  | "cron_start" | "cron_end" | "turn_start" | "turn_error" | "waiting" | "subagent_start" | "config_snapshot" | "kernel_event";
export type AgentEvent = {
  snapshot?: Snapshot;
  kernel?: { operation: "process_exec" | "file_open" | "network_connect"; processId: string };
  callId?: string; childId?: string; dataLoss?: boolean;
  checkName?: string; checkVersion?: string;
  v: 1; id: string; type: AgentEventType; at: number;
  agent: { kind: AgentKind; name: string; host: string };
  run: string; tool?: string; ok?: boolean; exitCode?: number; durationMs?: number; expectEveryMs?: number; tail?: string;
};

/** Labels the server accepts: /^[\w .:/@-]{1,64}$/. */
export const label = (value: string, fallback = "unknown") => value.replace(/[^\w .:/@-]/g, "-").slice(0, 64) || fallback;
