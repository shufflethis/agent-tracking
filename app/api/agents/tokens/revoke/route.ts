import { backTo, formRequest } from "@/lib/agents/form-route";
import { revokeAgentToken } from "@/lib/agents/tokens";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  revokeAgentToken(r.account.email, String(r.form.get("id") ?? ""));
  return backTo(request, "/app/fleet/settings");
}
