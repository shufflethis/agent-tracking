// Explicit Linux integration check. Runs only synthetic processes and a loopback socket.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { observationProgram, parseKernelLine } from '../cli/dist/observe.js';
const directory = mkdtempSync(join(tmpdir(),'agent-ebpf-check-'));
const fixture = join(directory,'fixture.txt'); writeFileSync(fixture,'synthetic test data');
const server = createServer(socket=>socket.end()); await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port = server.address().port;
const code = `const fs=require('node:fs'),net=require('node:net'),cp=require('node:child_process'); setInterval(()=>{fs.readFileSync(process.argv[1]);const s=net.connect(Number(process.argv[2]),'127.0.0.1');s.on('error',()=>{});s.on('connect',()=>s.end());cp.spawn('/bin/true');},300);`;
const target=spawn(process.execPath,['-e',code,fixture,String(port)],{stdio:'ignore'});
const outsider=spawn(process.execPath,['-e',code,fixture,String(port)],{stdio:'ignore'});
const child=spawn('bpftrace',['-q','-e',observationProgram(target.pid,5,500)],{stdio:['ignore','pipe','pipe']});
let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);
const timeout=setTimeout(()=>child.kill('SIGKILL'),30000);
try {
 const code=await new Promise(resolve=>{child.on('error',()=>resolve(1));child.on('close',resolve)});
 assert.equal(code,0,stderr.slice(0,3000));
 const events=stdout.split('\n').map(parseKernelLine).filter(Boolean);
 for(const operation of ['file_open','network_connect','process_exec'])assert.ok(events.some(e=>e.operation===operation),`Missing ${operation}: ${stderr}`);
 assert.ok(!events.some(e=>e.pid===outsider.pid),'unselected process was observed');
 assert.ok(events.length<=500);
 const received=[];
 const receiver=createHttpServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{received.push(...JSON.parse(body).events);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({accepted:JSON.parse(body).events.length}));});});
 await new Promise(r=>receiver.listen(0,'127.0.0.1',r));
 writeFileSync(join(directory,'config.json'),JSON.stringify({origin:`http://127.0.0.1:${receiver.address().port}`,host:'synthetic',token:'atk_fixture',secret:'a'.repeat(64)}),{mode:0o600});
 try {
   const cli=spawn(process.execPath,[new URL('../cli/dist/cli.js',import.meta.url).pathname,'observe','--pid',String(target.pid),'--name','synthetic-linux','--seconds','3','--max-events','100'],{env:{...process.env,AGENTTRACKING_HOME:directory},stdio:['ignore','pipe','pipe']});
   let diagnostics='';cli.stdout.on('data',c=>diagnostics+=c);cli.stderr.on('data',c=>diagnostics+=c);
   const cliTimeout=setTimeout(()=>cli.kill('SIGKILL'),20000);
   const status=await new Promise(r=>cli.on('close',r));clearTimeout(cliTimeout);
   assert.equal(status,0,diagnostics);assert.ok(received.some(e=>e.type==='session_start'));assert.ok(received.some(e=>e.type==='session_end'));
   assert.ok(received.some(e=>e.kernel?.operation==='network_connect'));
   assert.doesNotMatch(JSON.stringify(received),/fixture.txt|127\.0\.0\.1|"pid"/);
 } finally {receiver.close();}
 console.log(JSON.stringify({cliUploadPassed:true,passed:true,events:events.length,operations:[...new Set(events.map(e=>e.operation))],outsiderExcluded:true}));
} finally {clearTimeout(timeout);child.kill('SIGINT');target.kill();outsider.kill();server.close();}
