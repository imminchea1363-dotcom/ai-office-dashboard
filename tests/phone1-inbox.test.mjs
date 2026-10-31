import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../server/worker.mjs';

const ORIGIN='https://imminchea1363-dotcom.github.io';
const OFFICE='office-test-secret-12345678901234567890';
const PHONE='phone1-agent-secret-123456789012345678901';
const HOST='https://dongbaek-api.example';
function environment(){
 const sqlite=new DatabaseSync(':memory:');
 const DB={prepare(sql,args=[]){return {
  bind(...value){return DB.prepare(sql,value);},
  async first(){return sqlite.prepare(sql).get(...args)||null;},
  async all(){return {results:sqlite.prepare(sql).all(...args)};},
  async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}
 };}};
 return {sqlite,DB,OFFICE_ACCESS_TOKEN:OFFICE,HERMES_AGENT_TOKEN:PHONE};
}
function agent(path,body,token=PHONE,origin=''){
 return new Request(HOST+path,{method:body?'POST':'GET',headers:{
  Authorization:'Bearer '+token,...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
}
function office(path,body,token=OFFICE,origin=ORIGIN){
 return new Request(HOST+path,{method:body?'POST':'GET',headers:{
  Authorization:'Bearer '+token,Origin:origin,...(body?{'Content-Type':'application/json'}:{})
 },...(body?{body:JSON.stringify(body)}:{})});
}
const task=(extra={})=>({id:crypto.randomUUID(),staffId:3,title:'1호 휴대폰 업무 지시',brief:'포항 동백펜션 11월 게시글 초안, 확인되지 않은 사실 금지',output:'검수용 SNS 문구',...extra});
test('phone1 Hermes dispatches to office and receives independently reviewed draft status with no external calls',async()=>{
 const env=environment(),oldFetch=globalThis.fetch;
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No external requests allowed');};
 try{
  let r=await worker.fetch(agent('/api/phone1/agent/dispatch',task()),{...env,HERMES_AGENT_TOKEN:''});
  assert.equal(r.status,503);
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',task(),OFFICE),env);assert.equal(r.status,401);
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',task(),PHONE,ORIGIN),env);assert.equal(r.status,403);
  r=await worker.fetch(office('/api/phone1/inbox'),env);assert.equal(r.status,200);assert.equal((await r.json()).tasks.length,0);
  r=await worker.fetch(office('/api/phone1/inbox',null,PHONE),env);assert.equal(r.status,401);
  r=await worker.fetch(office('/api/phone1/inbox',null,OFFICE,'https://example.net'),env);assert.equal(r.status,403);
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',task({staffId:11})),env);assert.equal(r.status,400);
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',task({brief:'x'.repeat(6001)})),env);assert.equal(r.status,400);
  const t=task();
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',t),env);assert.equal(r.status,201);
  assert.deepEqual(((await r.json()).status),'queued');
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',t),env);assert.equal(r.status,200);assert.equal((await r.json()).reused,true);
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',{...t,title:'changed'}),env);assert.equal(r.status,409);
  r=await worker.fetch(office('/api/phone1/inbox'),env);let list=(await r.json()).tasks;
  assert.equal(list.length,1);assert.equal(list[0].source,'phone1');assert.equal(list[0].brief,t.brief);
  r=await worker.fetch(office('/api/phone1/inbox?id='+t.id),env);assert.equal((await r.json()).task.title,t.title);
  r=await worker.fetch(agent('/api/phone1/agent/status?id='+t.id),env);
  let state=await r.json();assert.equal(state.status,'queued');assert.equal(state.brief,undefined);assert.equal(state.result,null);
  r=await worker.fetch(agent('/api/phone1/inbox/result',{id:t.id,status:'draft_ready',result:'forbidden'}),env);assert.equal(r.status,403);
  const deliver={id:t.id,status:'draft_ready',result:'검수 전 홍보 문구 초안. 게시 미승인.'};
  r=await worker.fetch(office('/api/phone1/inbox/result',deliver),env);assert.equal(r.status,200);
  assert.equal((await r.json()).reviewStatus,'pending');
  r=await worker.fetch(office('/api/phone1/inbox/result',deliver),env);assert.equal(r.status,200);assert.equal((await r.json()).reused,true);
  r=await worker.fetch(office('/api/phone1/inbox/result',{...deliver,result:'변조'}),env);assert.equal(r.status,409);
  r=await worker.fetch(agent('/api/phone1/agent/status?id='+t.id),env);
  state=await r.json();assert.equal(state.status,'draft_ready');assert.equal(state.reviewStatus,'pending');
  assert.equal(state.resultSource,'office_manual');assert.equal(state.result,deliver.result);
  assert.equal(calls,0,'Receiving a phone command must not trigger GPT requests');
  const stuck=task({staffId:2});
  await worker.fetch(agent('/api/phone1/agent/dispatch',stuck),env);
  for(let i=0;i<24;i++){const received=await worker.fetch(agent('/api/phone1/agent/dispatch',task()),env);assert.equal(received.status,201);}
  r=await worker.fetch(agent('/api/phone1/agent/dispatch',task()),env);assert.equal(r.status,429);
  assert.equal((await r.json()).error,'queue_limit');
  assert.equal(env.sqlite.prepare("SELECT count(*) n FROM phone1_inbox WHERE status='queued'").get().n,25);
  assert.equal(env.sqlite.prepare("SELECT count(*) n FROM sqlite_master WHERE name = 'hermes_tasks'").get().n,0);
 }catch(error){throw error;}
 finally{globalThis.fetch=oldFetch;}
});
