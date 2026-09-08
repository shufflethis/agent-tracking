import { AGENT_CARD } from "@/lib/agent-card";

export const revalidate = 3600;

/** Both A2A paths return the same document: agent-card.json is the registered address, agent.json is where earlier clients look. */
export function GET() {
  return new Response(JSON.stringify(AGENT_CARD), { headers: { "content-type": "application/a2a+json; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
