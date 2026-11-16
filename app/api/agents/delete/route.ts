import { NextResponse } from "next/server";
import { formRequest } from "@/lib/agents/form-route";
import { deleteAgent } from "@/lib/agents/store";
import { SITE_ORIGIN } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const r = await formRequest(request);
  if (r instanceof Response) return r;
  deleteAgent(r.account.email, String(r.form.get("agentId") ?? ""));
  return NextResponse.redirect(new URL("/app/fleet", SITE_ORIGIN), 303);
}
