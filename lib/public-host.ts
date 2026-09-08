import { lookup } from "node:dns/promises";

/**
 * A site we track must be a public host. Whatever the name resolves to has to
 * be routable on the public internet, otherwise someone could register the
 * server's own neighbours and have the verifier fetch them.
 */
export function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (/^f[cd]/.test(v6)) return true; // unique local
    if (/^fe[89ab]/.test(v6)) return true; // link local
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  const [a, b] = ip.split(".").map(Number);
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link local / cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

export async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new Error(`${hostname} does not resolve.`);
  }
  if (addresses.length === 0) throw new Error(`${hostname} does not resolve.`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`${hostname} resolves to a private address. Only public sites can be tracked.`);
  }
}
