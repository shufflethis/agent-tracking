// Strips comments and indentation from snippet/agent.src.js into public/agent.js.
// No minifier is a dependency of this project; the source is written so that
// every line ends in a token that makes joining lines safe (; { } , or a
// comment), and the size test in lib/tracking/tracking.test.ts guards the result.
import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync(new URL("../snippet/agent.src.js", import.meta.url), "utf8");
const header = src.split("\n").slice(0, 2).join("\n");
const body = src
  .split("\n")
  .slice(2)
  .map((l) => l.replace(/^\s+/, "").replace(/^\/\/.*$/, "").replace(/\s*\/\*.*?\*\/\s*$/, ""))
  .filter((l) => l.length > 0 && !/^\/\*/.test(l))
  .join("");
writeFileSync(new URL("../public/agent.js", import.meta.url), `${header}\n${body}\n`);
console.log(`public/agent.js: ${Buffer.byteLength(body) + Buffer.byteLength(header) + 2} bytes`);
