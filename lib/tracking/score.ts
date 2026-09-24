import { CHECK_ORIGIN } from "@/lib/site";

/**
 * The agent readiness score, from the sister product over HTTP.
 *
 * webmcp-tool.com crawls the site and answers with a score out of 100 and a
 * grade; this installation stores the two numbers beside the agent counts so
 * the overview can say "agents call your tools, and the site itself is a B".
 * Nothing about the visitor data leaves this server for it: the request
 * carries the domain and nothing else.
 */

export type Scored = { ok: true; score: number; grade: string } | { ok: false; detail: string; code: "disabled" | "network_error" | "http_error" | "invalid_response" };

export async function fetchScore(domain: string, fetchImpl: typeof fetch = fetch): Promise<Scored> {
  if (!CHECK_ORIGIN) return { ok: false, detail: "No check service is configured.", code: "disabled" };
  let res: Response;
  try {
    res = await fetchImpl(`${CHECK_ORIGIN}/api/scan?url=${encodeURIComponent(domain)}`, {
      headers: { accept: "application/json", "user-agent": "agent-tracking score refresh" },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "The check service did not answer.", code: "network_error" };
  }
  if (!res.ok) return { ok: false, detail: `The check service answered ${res.status}.`, code: "http_error" };
  const data = (await res.json().catch(() => null)) as { score?: unknown; grade?: unknown } | null;
  if (!data || typeof data.score !== "number" || !Number.isFinite(data.score) || data.score < 0 || data.score > 100 || typeof data.grade !== "string" || !/^[A-F][+-]?$/.test(data.grade)) return { ok: false, detail: "The check service answered without a valid score.", code: "invalid_response" };
  return { ok: true, score: Math.round(data.score), grade: data.grade };
}
