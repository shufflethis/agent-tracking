import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { db, closeDb, ensureAccount, addSite } from "./db";
import { sourceDetail, sourceDetailHref, sourceWindowStart, parseSourceKey } from "./source-detail";
const now=Date.UTC(2026,8,25,12);
before(()=>{
 process.env.TRACKING_DB=":memory:";closeDb();ensureAccount("test@example.invalid");addSite("one.example","test@example.invalid");addSite("two.example","test@example.invalid");
 const event=db().prepare("insert into events(domain,t,kind,path,source,simulated) values(?,?,'view',?,?,?)");
 event.run("one.example",now-1000,"/pricing","chatgpt",0);event.run("one.example",now-2000,"/pricing?secret=private","chatgpt",0);
 event.run("one.example",now-3000,"/users/alice@example.com","chatgpt",0);
 event.run("one.example",now-3000,"/unrelated","perplexity",0);event.run("two.example",now-3000,"/other-tenant","chatgpt",0);
 event.run("one.example",now-3000,"/simulated","chatgpt",1);event.run("one.example",now+1000,"/future","chatgpt",0);
 event.run("one.example",now-3100,"/legacy","agent:bingbot-ai",0);
 const daily=db().prepare("insert into daily(domain,day,kind,name,count) values('one.example','2026-09-25',?,?,?)");
 daily.run("ai_referral","chatgpt",105);daily.run("ai_fetch","agent:bingbot-ai",65);
 db().prepare("insert into log_attempts(domain,day,agent,path,identity_status,method,status,result,resource,resource_basis,count) values('one.example','2026-09-25','gptbot','/pricing','verified','GET',403,'denied','html','extension',2)").run();
});
after(()=>{closeDb();delete process.env.TRACKING_DB;});
test("source detail isolates tenant, source and real events while merging redacted paths",()=>{
 const detail=sourceDetail("one.example","referral:chatgpt",30,now)!;
 assert.equal(detail.rawCount,3);assert.equal(detail.totals.referrals,105);
 assert.deepEqual(detail.pages.map(p=>[p.path,p.count]),[["/pricing",2],["/[redacted]",1]]);
 const json=JSON.stringify(detail);assert.doesNotMatch(json,/private|alice|unrelated|other-tenant|simulated|future/);
 assert.equal(detail.recent.length,3);assert.equal(detail.logPages.length,0);
});
test("legacy crawler details stay legacy and log-only sources are available without browser events",()=>{
 const legacy=sourceDetail("one.example","fetch:bingbot-ai",30,now)!;
 assert.equal(legacy.currentlyRecognized,false);assert.equal(legacy.totals.verified,0);assert.equal(legacy.totals.legacy,65);
 const log=sourceDetail("one.example","fetch:gptbot",30,now)!;
 assert.equal(log.rawCount,0);assert.equal(log.logPages[0].status,403);assert.equal(log.logPages[0].count,2);
});
test("invalid and empty selectors do not fall back to other sources",()=>{
 assert.equal(sourceDetail("one.example","referral:missing",30,now),null);
 const empty=sourceDetail("one.example","referral:chatgpt",7,now+10*86400000)!;
 assert.equal(empty.rawCount,0);assert.equal(empty.totals.referrals,0);
 assert.equal(sourceDetail("one.example","referral:chatgpt' OR 1=1",30,now),null);
 assert.equal(parseSourceKey("chatgpt"),null);
 assert.deepEqual(parseSourceKey("referral%3Achatgpt"),{kind:"referral",id:"chatgpt"});
 assert.equal(parseSourceKey("referral%ZZchatgpt"),null);
 assert.equal(sourceDetailHref("one.example","referral","chatgpt",7),"/app/one.example/agents/referral%3Achatgpt?days=7");
});
test("Berlin day boundaries include the full first day and handle daylight savings",()=>{
 assert.equal(sourceWindowStart("2026-09-25"),Date.UTC(2026,8,24,22));
 assert.equal(sourceWindowStart("2026-01-25"),Date.UTC(2026,0,24,23));
 assert.equal(sourceWindowStart("2026-10-25"),Date.UTC(2026,9,24,22));
 db().prepare("insert into daily(domain,day,kind,name,count) values('one.example','2026-10-26','ai_referral','chatgpt',1)").run();
 const detail=sourceDetail("one.example","referral:chatgpt",30,Date.UTC(2026,9,25,23,30))!;
 assert.equal(new Set(detail.timeline.map(d=>d.day)).size,30);
});
