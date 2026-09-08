import { currentAccount } from "@/lib/tracking/auth";
import { mintApiToken } from "@/lib/tracking/api-token";
import { setApiToken } from "@/lib/tracking/db";

export const runtime = "nodejs";

/**
 * The account's API token: POST creates or replaces it and returns it once,
 * DELETE revokes it. Session only; a token cannot mint another token.
 */

export async function POST() {
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  const { token, hash } = mintApiToken();
  setApiToken(account.email, hash);
  return Response.json({ ok: true, token, replaced: Boolean(account.api_token_hash) });
}

export async function DELETE() {
  const account = await currentAccount();
  if (!account) return Response.json({ ok: false, detail: "Sign in first." }, { status: 401 });
  setApiToken(account.email, null);
  return Response.json({ ok: true });
}
