import { sameOriginFormPost } from "@/lib/agents/form-route";
import { currentAccount } from "@/lib/tracking/auth";
import { readContentChecks, writeContentChecks } from "@/lib/tracking/content-checks-route";

export const runtime = "nodejs";

type Context = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Context) {
  return readContentChecks(request, params, (await currentAccount())?.email ?? null);
}

export async function POST(request: Request, { params }: Context) {
  if (!sameOriginFormPost(request)) return Response.json({ ok: false, detail: "Forbidden." }, { status: 403 });
  return writeContentChecks(request, params, (await currentAccount())?.email ?? null);
}
