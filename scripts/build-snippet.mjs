// Build the core snippet within its five-kilobyte size budget.
import { readFileSync, writeFileSync } from "node:fs";
import { transformSync } from "esbuild";
const src = readFileSync(new URL("../snippet/agent.src.js", import.meta.url), "utf8");
const header = src.split("\n").slice(0, 2).join("\n");
const body = transformSync(src.split("\n").slice(2).join("\n"), {
  loader: "js", minify: true, target: "es2020", legalComments: "none", charset: "utf8",
}).code.trim();
writeFileSync(new URL("../public/agent.js", import.meta.url), `${header}\n${body}\n`);
console.log(`public/agent.js: ${Buffer.byteLength(body) + Buffer.byteLength(header) + 2} bytes`);
