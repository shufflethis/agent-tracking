import { ingestServerRequest } from "@/lib/tracking/server-route";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  return ingestServerRequest(request, params, "tool_telemetry");
}
