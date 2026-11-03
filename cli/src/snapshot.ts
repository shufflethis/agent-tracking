import { constants, closeSync, fstatSync, openSync, readSync } from "node:fs";
import { createHmac } from "node:crypto";
import { homedir } from "node:os";
import { join, isAbsolute } from "node:path";
import type { Config } from "./config.js";

export type Snapshot = {
  fingerprint: string; cliVersion: string; nodeVersion: string;
  files: { scope: string; state: "present" | "missing" | "unreadable"; fingerprint?: string }[];
  mcpServers: number; plugins: number; allowRules: number; askRules: number; denyRules: number;
};
export const CLI_VERSION = "0.3.0";
const MAX_BYTES = 256 * 1024;

/** Fixed files only. No recursive scan, file contents, paths, commands, rules or environment values leave this function. */
export function captureSnapshot(cfg: Config, cwd: string, userHome = homedir()): Snapshot {
  const digest = (value: string | Buffer) => createHmac("sha256", cfg.secret).update(value).digest("hex");
  const files: Snapshot["files"] = [];
  const totals = { mcpServers: 0, plugins: 0, allowRules: 0, askRules: 0, denyRules: 0 };
  const inputs = [
    ["user_settings", join(userHome, ".claude/settings.json")],
    ...(isAbsolute(cwd) ? [
      ["project_settings", join(cwd, ".claude/settings.json")], ["local_settings", join(cwd, ".claude/settings.local.json")],
      ["project_mcp", join(cwd, ".mcp.json")], ["project_instructions", join(cwd, "CLAUDE.md")],
    ] : []),
  ];
  for (const [scope, path] of inputs) {
    let fd: number | undefined;
    try {
      fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error("unsupported_file");
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      let length = 0;
      while (length < buffer.length) { const n = readSync(fd, buffer, length, buffer.length - length, null); if (!n) break; length += n; }
      const raw = buffer.subarray(0, length);
      if (raw.length > MAX_BYTES) throw new Error("oversized_file");
      files.push({ scope, state: "present", fingerprint: digest(raw) });
      if (scope.endsWith("instructions")) continue;
      let value: any;
      try { value = JSON.parse(raw.toString("utf8")); } catch { files[files.length - 1].state = "unreadable"; continue; }
      const count = (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? Math.min(Object.keys(v).length, 10000) : 0;
      totals.mcpServers += count(value?.mcpServers);
      totals.plugins += value?.enabledPlugins && typeof value.enabledPlugins === "object" ? Math.min(Object.values(value.enabledPlugins).filter(v => v === true).length, 10000) : 0;
      for (const [key, target] of [["allow", "allowRules"], ["ask", "askRules"], ["deny", "denyRules"]] as const) {
        if (Array.isArray(value?.permissions?.[key])) totals[target] += Math.min(value.permissions[key].length, 10000);
      }
    } catch (error) {
      files.push({ scope, state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "unreadable" });
    } finally { if (fd !== undefined) closeSync(fd); }
  }
  return { fingerprint: digest(JSON.stringify(files)), cliVersion: CLI_VERSION, nodeVersion: process.versions.node, files, ...totals };
}
