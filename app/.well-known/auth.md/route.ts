import { AUTH_MD } from "@/lib/auth-doc";

export const revalidate = 3600;

export function GET() {
  return new Response(AUTH_MD, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
