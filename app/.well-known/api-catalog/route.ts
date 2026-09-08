import { API_CATALOG } from "@/lib/agent-card";

export const revalidate = 3600;

/** RFC 9727: one address that says where the API descriptions are. */
export function GET() {
  return new Response(JSON.stringify(API_CATALOG), { headers: { "content-type": "application/linkset+json; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
