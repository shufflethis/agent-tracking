import { buildInstallScript } from "@/lib/agents/install-script";

export const revalidate = 300;

export function GET() {
  return new Response(buildInstallScript(), {
    status: 200,
    headers: {
      "content-type": "text/x-shellscript; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
