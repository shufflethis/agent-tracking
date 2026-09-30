import { currentAccount } from "@/lib/tracking/auth";
import { readContentChecks, writeContentChecks } from "@/lib/tracking/content-checks-route";

export const runtime = "nodejs";

type Context = { params: Promise<{ domain: string }> };

export async function GET(request: Request, { params }: Context) {
  return readContentChecks(request, params, (await currentAccount())?.email ?? null);
}

export async function POST(request: Request, { params }: Context) {
  return writeContentChecks(request, params, (await currentAccount())?.email ?? null);
}
