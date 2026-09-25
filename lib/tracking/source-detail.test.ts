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

test("a selected page gets its complete daily history and matching events, not the source's recent sample",()=>{
 const earlier=Date.UTC(2026,8,23,22,30); // 24 September in Berlin
 db().prepare("insert into events(domain,t,kind,path,source,transport) values('one.example',?,'view','/pricing','chatgpt','browser')").run(earlier);
 const detail=sourceDetail("one.example","referral:chatgpt",7,now,"/pricing")!;
 assert.equal(detail.selected?.count,3);
 assert.equal(detail.selected?.firstAt,earlier);
 assert.equal(detail.selected?.activeDays,2);
 assert.deepEqual(detail.selected?.timeline.filter(d=>d.count),[{day:"2026-09-24",count:1},{day:"2026-09-25",count:2}]);
 assert.equal(detail.selected?.recent.length,3);
 assert.ok(detail.selected?.recent.every(r=>r.path==="/pricing"));
 assert.deepEqual(detail.selected?.transports,[{transport:"unknown",count:2},{transport:"browser",count:1}]);
 const protectedGroup=sourceDetail("one.example","referral:chatgpt",7,now,"/[redacted]")!;
 assert.equal(protectedGroup.selected?.count,1);
 assert.doesNotMatch(JSON.stringify(protectedGroup),/alice|secret|private/);
 assert.equal(sourceDetail("one.example","referral:chatgpt",7,now,"/other-tenant")?.selected,null);
 assert.equal(sourceDetail("one.example","referral:chatgpt",7,now,"/pricing' OR 1=1")?.selected,null);
});

test("previous-period comparisons use the same source and non-overlapping Berlin calendar windows",()=>{
 const insert=db().prepare("insert into daily(domain,day,kind,name,count) values(?,?,?,?,?)");
 insert.run("one.example","2026-09-18","ai_referral","chatgpt",12);
 insert.run("one.example","2026-09-11","ai_referral","chatgpt",99); // before previous period
 insert.run("one.example","2026-09-18","ai_referral","perplexity",42);
 insert.run("two.example","2026-09-18","ai_referral","chatgpt",66);
 const detail=sourceDetail("one.example","referral:chatgpt",7,now)!;
 assert.equal(detail.previous.referrals,12);
 assert.equal(detail.totals.referrals,105);
 assert.equal(detail.previous.verified,0);
});
