import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CLI_FILE, CLI_SHA256, CLI_VERSION } from "./format";
import { buildInstallScript } from "./install-script";

function runSh(args: string[], input: string, env: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("/bin/sh", args, { env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += String(c); });
    child.stderr.on("data", (c) => { stderr += String(c); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

test("install.sh verifies SHA-256, installs native agenttracking launcher, and aborts on tampered tarball", async () => {
  const tgz = readFileSync(`public/downloads/${CLI_FILE}`);
  const server = createServer((req, res) => {
    if (req.url === `/downloads/${CLI_FILE}`) {
      res.writeHead(200, { "content-type": "application/gzip" });
      res.end(tgz);
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address() as { port: number };
  const origin = `http://127.0.0.1:${addr.port}`;

  try {
    const root = mkdtempSync(join(tmpdir(), "at-install-"));
    const home = join(root, "at-home");
    const binDir = join(root, "bin");

    // 1. Tampered hash must abort and never create binary
    const badScript = buildInstallScript({ origin, file: CLI_FILE, sha256: "0".repeat(64), version: CLI_VERSION });
    const bad = await runSh(["-s"], badScript, {
      ...process.env, HOME: root, AGENTTRACKING_HOME: home, AGENTTRACKING_BIN_DIR: binDir,
    });
    assert.notEqual(bad.code, 0);
    assert.match(bad.stderr, /Checksum mismatch/);
    assert.equal(existsSync(join(binDir, "agenttracking")), false);

    // 2. Valid hash installs launcher and runs forwarded subcommand (`doctor`)
    const goodScript = buildInstallScript({ origin, file: CLI_FILE, sha256: CLI_SHA256, version: CLI_VERSION });
    const ok = await runSh(["-s", "--", "doctor"], goodScript, {
      ...process.env, HOME: root, AGENTTRACKING_HOME: home, AGENTTRACKING_BIN_DIR: binDir, PATH: `${binDir}:${process.env.PATH}`,
    });
    assert.equal(ok.code, 0, ok.stderr);
    assert.match(ok.stdout, /SHA-256 verified/);
    assert.match(ok.stdout, /agenttracking doctor/);
    assert.equal(existsSync(join(binDir, "agenttracking")), true);
  } finally {
    server.close();
  }
});
