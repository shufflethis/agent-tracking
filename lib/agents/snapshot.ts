/** Server-side allowlist: never persist arbitrary snapshot properties. */
export type Snapshot = {
  fingerprint: string; cliVersion: string; nodeVersion: string;
  files: { scope: string; state: "present" | "missing" | "unreadable"; fingerprint?: string }[];
  mcpServers: number; plugins: number; allowRules: number; askRules: number; denyRules: number;
};
const HASH = /^[0-9a-f]{64}$/;
export function parseSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, any>;
  if (typeof r.fingerprint !== "string" || !HASH.test(r.fingerprint) || !Array.isArray(r.files) || r.files.length > 5) return null;
  if (![r.cliVersion, r.nodeVersion].every(v => typeof v === "string" && /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(v) && v.length < 40)) return null;
  const files: Snapshot["files"] = []; const scopes = new Set<string>();
  for (const f of r.files) {
    if (!f || !["user_settings", "project_settings", "local_settings", "project_mcp", "project_instructions"].includes(f.scope) || scopes.has(f.scope)) return null;
    if (!["present", "missing", "unreadable"].includes(f.state)) return null;
    if (f.fingerprint !== undefined && (typeof f.fingerprint !== "string" || !HASH.test(f.fingerprint))) return null;
    if (f.state === "present" && !f.fingerprint) return null;
    scopes.add(f.scope); files.push({ scope: f.scope, state: f.state, ...(f.fingerprint ? { fingerprint: f.fingerprint } : {}) });
  }
  const counts = ["mcpServers", "plugins", "allowRules", "askRules", "denyRules"] as const;
  if (counts.some(k => !Number.isInteger(r[k]) || r[k] < 0 || r[k] > 50000)) return null;
  return { fingerprint: r.fingerprint, cliVersion: r.cliVersion, nodeVersion: r.nodeVersion, files,
    mcpServers: r.mcpServers, plugins: r.plugins, allowRules: r.allowRules, askRules: r.askRules, denyRules: r.denyRules };
}
