import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicAddress } from "@/lib/agents/safe-url";

/**
 * A site we track must be a public host. Whatever the name resolves to has to
 * be routable on the public internet, otherwise someone could register the
 * server's own neighbours and have the verifier fetch them.
 */
export function isPrivateAddress(ip: string): boolean {
  return !isPublicAddress(ip);
}

export async function resolvePublicHost(hostname: string): Promise<{ address: string; family: number }> {
  const clean = hostname.trim().toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (isIP(clean)) {
    if (isPrivateAddress(clean)) throw new Error(`${hostname} resolves to a private address. Only public sites can be tracked.`);
    return { address: clean, family: isIP(clean) };
  }
  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(clean, { all: true, verbatim: true });
  } catch {
    throw new Error(`${hostname} does not resolve.`);
  }
  if (addresses.length === 0) throw new Error(`${hostname} does not resolve.`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`${hostname} resolves to a private address. Only public sites can be tracked.`);
  }
  return { address: addresses[0].address, family: addresses[0].family };
}

export async function assertPublicHost(hostname: string): Promise<void> {
  await resolvePublicHost(hostname);
}
