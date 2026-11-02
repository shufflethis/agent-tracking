import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

/**
 * Outbound webhook safety. A webhook URL is chosen by the account owner and
 * fetched by this server, so it must never reach the machine itself or its
 * private network (this host runs internal admin APIs on localhost).
 *
 * Slack and Discord are pinned to their hosts; a generic webhook must be
 * https on port 443 and resolve only to public addresses. The request then
 * connects to the address that was checked, so DNS rebinding between check
 * and connect cannot swap it.
 */

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96], ["2001:db8::", 32]] as const) blocked.addSubnet(net, prefix, "ipv6");

export function isPublicAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return isPublicAddress(mapped[1]);
  const family = isIP(ip);
  if (!family) return false;
  return !blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

const HOSTS: Record<string, string[]> = { slack: ["hooks.slack.com"], discord: ["discord.com", "discordapp.com"] };

export function webhookHostAllowed(kind: string, url: URL): boolean {
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  return HOSTS[kind] ? HOSTS[kind].includes(host) : true;
}

type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
const systemResolver: Resolver = (host) => lookup(host, { all: true, verbatim: true });

export async function resolvePublicTarget(raw: string, resolve: Resolver = systemResolver): Promise<{ address: string; family: number; host: string } | null> {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!webhookHostAllowed("generic", url)) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host) ? { address: host, family: isIP(host), host } : null;
  let addresses: { address: string; family: number }[];
  try { addresses = await resolve(host); } catch { return null; }
  if (!addresses.length || !addresses.every((a) => isPublicAddress(a.address))) return null;
  return { address: addresses[0].address, family: addresses[0].family, host };
}

/** POST JSON to a checked public https URL, connecting to the checked address. Resolves to whether it got a 2xx. */
export async function postJsonPinned(raw: string, body: string, timeoutMs = 5000, resolve: Resolver = systemResolver): Promise<boolean> {
  const target = await resolvePublicTarget(raw, resolve);
  if (!target) return false;
  const url = new URL(raw);
  return new Promise((done) => {
    const req = request(
      {
        method: "POST", host: target.host, servername: isIP(target.host) ? undefined : target.host, port: 443,
        path: `${url.pathname}${url.search}`,
        headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
        lookup: (_host, _opts, cb) => cb(null, target.address, target.family),
        timeout: timeoutMs,
      },
      (res) => { res.resume(); done((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300); },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(false));
    req.end(body);
  });
}
