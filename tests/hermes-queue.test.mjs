import {test} from 'node:test';
import a from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../server/worker.mjs';

const HOST='https://dongbaek-api.test';
const ORIGIN='https://imminchea1363-dotcom.github.io';
const OFFICE='office-secret-isolated-for-test-01234567890';
const AGENT='agent-secret-isolated-for-test-98765432100';
function env(){
 const sqlite=new DatabaseSync(':memory:');
 const DB={prepare(sql,args=[]){return{
  bind(...values){return DB.prepare(sql,values);},
  async first(){return sqlite.prepare(sql).get(...args)||null;},
  async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}
 };}};
 return {sqlite,DB,OFFICE_ACCESS_TOKEN:OFFICE,HERMES_AGENT_TOKEN:AGENT};
}
function office(path,body,token=OFFICE,origin=ORIGIN){
 return new Request(HOST+path,{method:body?'POST':'GET',
  headers:{Origin:origin,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
}
function agent(path,body,token=AGENT,origin=''){
 return new Request(HOST+path,{method:body?'POST':'GET',
  headers:{Authorization:'Bearer '+token,...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});
}
const task=(extra={})=>({id:crypto.randomUUID(),staffId:3,title:'홍보 초안',brief:'동백펜션 사진 설명 작성',output:'게시 전 검수용 문안',...extra});
test('Hermes mailbox: isolated credentials, durable claims, no automatic execution, SQLite caps',async()=>{
 const e=env();const realFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error('Hermes queue must never call an external API');};
 try{
  let reply=await worker.fetch(office('/api/hermes/tasks',task()),{...e,HERMES_AGENT_TOKEN:''});
  a.equal(reply.status,503);
  reply=await worker.fetch(office('/api/hermes/tasks',task(),'bad-secret'),e);a.equal(reply.status,401);
  reply=await worker.fetch(office('/api/hermes/tasks',task(),OFFICE,'https://evil.example'),e);a.equal(reply.status,403);
  reply=await worker.fetch(agent('/api/hermes/agent/next',null,OFFICE),e);a.equal(reply.status,401);
  reply=await worker.fetch(agent('/api/hermes/agent/next',null,AGENT,ORIGIN),e);a.equal(reply.status,403);
  reply=await worker.fetch(office('/api/hermes/tasks',task({staffId:11})),e);a.equal(reply.status,400);
  reply=await worker.fetch(office('/api/hermes/tasks',task({brief:'x'.repeat(6001)})),e);a.equal(reply.status,400);
  const t=task();
  reply=await worker.fetch(office('/api/hermes/tasks',t),e);a.equal(reply.status,201);
  const created=await reply.json();a.equal(created.status,'queued');a.equal(created.mode,'draft_only');
  reply=await worker.fetch(office('/api/hermes/tasks',t),e);a.equal(reply.status,200);a.equal((await reply.json()).reused,true);
  reply=await worker.fetch(office('/api/hermes/tasks',{...t,brief:'changed'}),e);a.equal(reply.status,409);
  reply=await worker.fetch(office('/api/hermes/tasks?id='+t.id),e);a.equal((await reply.json()).status,'queued');
  const polls=await Promise.all(Array.from({length:3},()=>worker.fetch(agent('/api/hermes/agent/next'),e)));
  const responses=await Promise.all(polls.map(x=>x.json()));
  a.equal(responses.filter(x=>x.task).length,1,'One task must not be claimed twice.');
  const claimed=responses.find(x=>x.task).task;
  a.equal(claimed.id,t.id);a.equal(claimed.mode,'draft_only');a.match(claimed.policy,/외부 게시/);
  a.equal(claimed.claimToken.length,36);
  a.equal((await (await worker.fetch(office('/api/hermes/tasks?id='+t.id),e)).json()).claimToken,undefined,'Never reveal claim token to browser.');
  reply=await worker.fetch(agent('/api/hermes/agent/result',{id:t.id,claimToken:crypto.randomUUID(),status:'completed',result:'bad'}),e);a.equal(reply.status,409);
  reply=await worker.fetch(agent('/api/hermes/agent/result',{id:t.id,claimToken:claimed.claimToken,status:'completed',result:'본문 초안'}),e);a.equal(reply.status,200);
  reply=await worker.fetch(agent('/api/hermes/agent/result',{id:t.id,claimToken:claimed.claimToken,status:'completed',result:'again'}),e);a.equal(reply.status,409);
  reply=await worker.fetch(agent('/api/hermes/agent/status',{id:t.id,claimToken:claimed.claimToken}),e);
  a.equal(reply.status,200);a.equal((await reply.json()).received,true);
  reply=await worker.fetch(agent('/api/hermes/agent/status',{id:t.id,claimToken:crypto.randomUUID()}),e);a.equal(reply.status,409);
  reply=await worker.fetch(office('/api/hermes/tasks?id='+t.id),e);const saved=await reply.json();
  a.equal(saved.status,'completed');a.equal(saved.result,'본문 초안');a.equal(saved.claimToken,undefined);
  a.equal((await (await worker.fetch(agent('/api/hermes/agent/next'),e)).json()).task,null);
  // Once claimed, a missing result never triggers automatic reassignment.
  const stuck=task({id:crypto.randomUUID()});
  await worker.fetch(office('/api/hermes/tasks',stuck),e);
  const taken=(await (await worker.fetch(agent('/api/hermes/agent/next'),e)).json()).task;
  a.equal(taken.id,stuck.id);
  a.equal((await (await worker.fetch(agent('/api/hermes/agent/next'),e)).json()).task,null);
  a.equal((await (await worker.fetch(office('/api/hermes/tasks?id='+stuck.id),e)).json()).status,'claimed');
  reply=await worker.fetch(agent('/api/hermes/agent/status',{id:stuck.id,claimToken:taken.claimToken}),e);
  a.equal((await reply.json()).received,false);
  // Backlog cap counts queued + claimed tasks.
  for(let i=0;i<24;i++){
   reply=await worker.fetch(office('/api/hermes/tasks',task()),e);a.equal(reply.status,201,'backlog item '+i);
  }
  reply=await worker.fetch(office('/api/hermes/tasks',task()),e);
  a.equal(reply.status,429);a.equal((await reply.json()).error,'queue_limit');
  a.equal(e.sqlite.prepare("SELECT COUNT(*) AS n FROM hermes_tasks WHERE status IN ('claimed','queued')").get().n,25);
  a.equal(e.sqlite.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='gpt_jobs'").get().n,0,'Hermes must not create or touch GPT jobs');
 }finally{globalThis.fetch=realFetch;}
});
