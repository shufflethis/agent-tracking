import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureSnapshot } from "./snapshot.js";
import { parseSnapshot } from "../../lib/agents/snapshot";
const cfg = { secret: "a".repeat(64), origin: "https://example.invalid", token: "atk_test", host: "fixture" };
test("snapshots hash secrets and rules locally, report counts and detect drift", () => {
  const home = mkdtempSync(join(tmpdir(), "snapshot-")); const cwd = join(home,"project");
  mkdirSync(join(home,".claude")); mkdirSync(join(cwd,".claude"),{recursive:true});
  writeFileSync(join(home,".claude/settings.json"),JSON.stringify({permissions:{allow:["Bash(secret command)"],deny:["Read(private)"]},enabledPlugins:{"private-name":true},env:{PASSWORD:"very-secret"}}));
  writeFileSync(join(cwd,".mcp.json"),JSON.stringify({mcpServers:{private:{env:{TOKEN:"another-secret"},url:"https://private.invalid"}}}));
  const a=captureSnapshot(cfg,cwd,home); assert.equal(a.mcpServers,1); assert.equal(a.plugins,1); assert.equal(a.allowRules,1);
  assert.equal(a.fingerprint,captureSnapshot(cfg,cwd,home).fingerprint);
  assert.doesNotMatch(JSON.stringify(a),/very-secret|another-secret|private-name|private.invalid|secret command|PASSWORD|TOKEN/);
  assert.notEqual(a.fingerprint,captureSnapshot({...cfg,secret:"b".repeat(64)},cwd,home).fingerprint);
  writeFileSync(join(cwd,"CLAUDE.md"),"private instructions");
  assert.notEqual(a.fingerprint,captureSnapshot(cfg,cwd,home).fingerprint);
  assert.deepEqual(parseSnapshot({...a,env:{TOKEN:"secret"}}),a);
});
test("missing, oversized and symlink files are explicit without reading targets", () => {
  const home=mkdtempSync(join(tmpdir(),"snapshot-"));mkdirSync(join(home,".claude"));
  writeFileSync(join(home,"large"),"x".repeat(300000));symlinkSync(join(home,"large"),join(home,".claude/settings.json"));
  const result=captureSnapshot(cfg,home,home);
  assert.equal(result.files[0].state,"unreadable");assert.equal(result.files.find(f=>f.scope==="project_mcp")?.state,"missing");
  assert.equal(parseSnapshot({...result,files:[...result.files,result.files[0]]}),null);
});
