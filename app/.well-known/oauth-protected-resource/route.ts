import { PROTECTED_RESOURCE } from "@/lib/auth-doc";

export const revalidate = 3600;

export function GET() {
  return Response.json(PROTECTED_RESOURCE, { headers: { "cache-control": "public, max-age=3600" } });
}
