import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "../../app/api/agents/otlp/v1/traces/route";
import { mintAgentToken } from "./tokens";
import { owner, withDb } from "./test-db";
import { traceList } from "./otlp";

test("OTLP endpoint authenticates, negotiates JSON, reports partial acceptance and deduplicates retries", () => withDb(async () => {
 const o=owner();const {token}=mintAgentToken(o,"fixture");
 const send=(body:unknown,headers:Record<string,string>={})=>POST(new Request("https://example.invalid/api/agents/otlp/v1/traces",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${token}`,...headers},body:JSON.stringify(body)}));
 assert.equal((await send({}, {authorization:"Bearer wrong"})).status,401);
 assert.equal((await send({}, {"content-type":"application/x-protobuf"})).status,415);
 assert.equal((await send({}, {"content-encoding":"gzip"})).status,415);
 const ns=String(BigInt(Date.now())*1000000n);
 const valid={traceId:"a".repeat(32),spanId:"b".repeat(16),startTimeUnixNano:ns,endTimeUnixNano:ns};
 const body={resourceSpans:[{scopeSpans:[{spans:[valid,{...valid,spanId:"bad"}]}]}]};
 const response=await send(body);assert.equal(response.status,200);assert.equal((await response.json()).partialSuccess.rejectedSpans,"1");
 await send(body);assert.equal(traceList(o)[0].spans,1);
}));
