// A minimal OTLP/HTTP JSON interoperability example, using synthetic metadata only.
// Sends two related spans to the installation configured by `agenttracking login`.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const config = JSON.parse(readFileSync(join(process.env.AGENTTRACKING_HOME ?? join(homedir(),'.agenttracking'),'config.json'),'utf8'));
const traceId=randomBytes(16).toString('hex');const parent=randomBytes(8).toString('hex');const child=randomBytes(8).toString('hex');
const now=Date.now();const nano=ms=>String(BigInt(ms)*1000000n);
const attr=(key,value)=>({key,value:{stringValue:value}});
const span=(spanId,operation,start,end,parentSpanId)=>({traceId,spanId,...(parentSpanId?{parentSpanId}:{}),startTimeUnixNano:nano(start),endTimeUnixNano:nano(end),status:{code:1},attributes:[attr('gen_ai.operation.name',operation)]});
const resource=(service,spans)=>({resource:{attributes:[attr('service.name',service),attr('service.version','synthetic-v1')]},scopeSpans:[{scope:{name:'agenttracking-example'},spans}]});
const response=await fetch(`${config.origin}/api/agents/otlp/v1/traces`,{method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify({resourceSpans:[resource('synthetic-agent',[span(parent,'invoke_agent',now-100,now)]),resource('synthetic-backend',[span(child,'execute_tool',now-80,now-20,parent)])]}),redirect:'error',signal:AbortSignal.timeout(10000)});
if(!response.ok)throw Error(`Trace export failed: HTTP ${response.status}`);
const receipt=await response.json();
if(receipt.partialSuccess?.rejectedSpans)throw Error('One or more synthetic spans were rejected');
console.log(`Two synthetic spans accepted. Open ${config.origin}/app/fleet/telemetry`);
