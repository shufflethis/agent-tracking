/** Copy of lib/agents/types.ts AgentEvent. cli/src/hook.test.ts checks the server accepts what the CLI builds. */
export type AgentKind = "claude" | "cron" | "custom";
export type AgentEventType =
  | "session_start" | "tool_start" | "tool_end" | "turn_end" | "subagent_end" | "notification" | "session_end"
  | "cron_start" | "cron_end";
export type AgentEvent = {
  v: 1; id: string; type: AgentEventType; at: number;
  agent: { kind: AgentKind; name: string; host: string };
  run: string; tool?: string; ok?: boolean; exitCode?: number; durationMs?: number; expectEveryMs?: number; tail?: string;
};

/** Labels the server accepts: /^[\w .:/@-]{1,64}$/. */
export const label = (value: string, fallback = "unknown") => value.replace(/[^\w .:/@-]/g, "-").slice(0, 64) || fallback;
