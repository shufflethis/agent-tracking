import assert from "node:assert/strict";
import { test } from "node:test";
import { db, monthKey, pruneRaw } from "../tracking/db";
import { parseOtlp, recordSpans, traceDetail, traceList } from "./otlp";
import { withDb, owner } from "./test-db";
const NOW=Date.now();const ns=(n:number)=>String(BigInt(n)*1000000n);
const span=(id="1".repeat(16))=>({traceId:"a".repeat(32),spanId:id,startTimeUnixNano:ns(NOW-10),endTimeUnixNano:ns(NOW),status:{code:1},name:"private prompt",attributes:[{key:"gen_ai.operation.name",value:{stringValue:"execute_tool"}},{key:"gen_ai.tool.name",value:{stringValue:"lookup"}},{key:"gen_ai.input.messages",value:{stringValue:"secret"}}],events:[{name:"password"}]});
const payload=(spans:unknown[])=>({resourceSpans:[{resource:{attributes:[{key:"service.name",value:{stringValue:"fixture"}},{key:"service.version",value:{stringValue:"v1"}}]},scopeSpans:[{spans}]}]});
test("OTLP drops payloads and links services using account-scoped trace/parent IDs",()=>withDb(()=>{
 const o=owner();const raw=payload([span(),{...span("2".repeat(16)),parentSpanId:"1".repeat(16),status:{code:2}}]);
 const parsed=parseOtlp(raw,o,NOW);assert.ok(typeof parsed!=="string");assert.equal(parsed.rejected,0);
 assert.doesNotMatch(JSON.stringify(parsed),/private prompt|secret|password/);
 assert.equal(parsed.spans[1].parentId,parsed.spans[0].id);
 recordSpans(o,parsed.spans,NOW);assert.equal(recordSpans(o,parsed.spans,NOW).accepted,0);
 const trace=traceList(o)[0];assert.equal(trace.spans,2);assert.equal(trace.errors,1);
 assert.equal(traceDetail("stranger",trace.id),null);assert.equal(traceDetail(o,trace.id)?.spans.length,2);
 const other=parseOtlp(raw,"stranger",NOW);assert.ok(typeof other!=="string");assert.notEqual(other.spans[0].traceId,trace.id);
 assert.equal((db().prepare("select count from agent_usage").get() as {count:number}).count,2);
 pruneRaw(NOW+31*86400000);assert.equal(traceList(o).length,0);
}));
test("OTLP validates IDs, nanoseconds, batch limits and preserves unknown status",()=>{
 assert.equal(parseOtlp(null,"o",NOW),"invalid");assert.deepEqual(parseOtlp({},"o",NOW),{spans:[],rejected:0});
 assert.equal(parseOtlp(payload(Array.from({length:101},()=>span())),"o",NOW),"too_large");
 const p=parseOtlp(payload([{...span(),traceId:"0".repeat(32)},{...span(),endTimeUnixNano:ns(NOW-100)},{...span(),startTimeUnixNano:"NaN"},{...span(),status:{}}]),"o",NOW);
 assert.ok(typeof p!=="string");assert.equal(p.rejected,3);assert.equal(p.spans[0].status,0);
});
test("OTLP quota refusal is atomic and duplicate deliveries do not spend quota",()=>withDb(()=>{
 const o=owner();const p=parseOtlp(payload([span()]),o,NOW);assert.ok(typeof p!=="string");
 db().prepare("insert into agent_usage(owner,month,count) values(?,?,?)").run(o,monthKey(NOW),50000);
 assert.equal(recordSpans(o,p.spans,NOW).quota,true);assert.equal(traceList(o).length,0);
}));
