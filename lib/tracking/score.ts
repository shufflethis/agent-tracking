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

export type Scored = { ok: true; score: number; grade: string } | { ok: false; detail: string };

export async function fetchScore(domain: string, fetchImpl: typeof fetch = fetch): Promise<Scored> {
  if (!CHECK_ORIGIN) return { ok: false, detail: "No check service is configured." };
  let res: Response;
  try {
    res = await fetchImpl(`${CHECK_ORIGIN}/api/scan?url=${encodeURIComponent(domain)}`, {
      headers: { accept: "application/json", "user-agent": "agent-tracking score refresh" },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "The check service did not answer." };
  }
  if (!res.ok) return { ok: false, detail: `The check service answered ${res.status}.` };
  const data = (await res.json().catch(() => null)) as { score?: unknown; grade?: unknown } | null;
  if (!data || typeof data.score !== "number" || typeof data.grade !== "string") return { ok: false, detail: "The check service answered without a score." };
  return { ok: true, score: Math.round(data.score), grade: data.grade };
}
