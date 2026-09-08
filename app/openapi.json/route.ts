import { OPENAPI } from "@/lib/agent-card";

export const revalidate = 3600;

export function GET() {
  return new Response(JSON.stringify(OPENAPI), { headers: { "content-type": "application/vnd.oai.openapi+json; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
