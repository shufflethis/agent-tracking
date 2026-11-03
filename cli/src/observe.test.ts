import assert from "node:assert/strict";
import { test } from "node:test";
import { observationProgram, parseKernelLine } from "./observe.js";
test("kernel probes are scoped, bounded and never read path, argument or address data",()=>{
 const p=observationProgram(12345,60,1000);
 assert.match(p,/pid == 12345/);assert.match(p,/interval:s:60/);assert.match(p,/@total >= 1000/);
 assert.doesNotMatch(p,/str\(|args->filename|args->uservaddr|args->argv|system\(|signal\(/);
 for(const pid of [0,1,1.5,NaN])assert.throws(()=>observationProgram(pid,60,1000));
 assert.throws(()=>observationProgram(123,3601,1000));assert.throws(()=>observationProgram(123,60,10001));
});
test("kernel ingestion discards raw addresses, filenames and unexpected operations",()=>{
 assert.deepEqual(parseKernelLine('{"operation":"file_open","pid":123,"path":"/private/key"}'),{operation:"file_open",pid:123});
 assert.equal(parseKernelLine('{"operation":"read_memory","pid":123}'),null);
 assert.equal(parseKernelLine('garbage'),null);assert.equal(parseKernelLine('{"operation":"file_open","pid":-1}'),null);
});
