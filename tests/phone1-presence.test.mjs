import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../server/worker.mjs';
const HOST='https://dongbaek-api.test',ORIGIN='https://imminchea1363-dotcom.github.io';
const OFFICE='test-office-password-123456789012345678',PHONE='phone1-secret-agent-987654321098765432';
function environment(){
 const sqlite=new DatabaseSync(':memory:');
 const DB={prepare(sql,args=[]){return{
  bind(...values){return DB.prepare(sql,values)},
  async first(){return sqlite.prepare(sql).get(...args)||null},
  async run(){const result=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}};},
 };}};
 return{sqlite,DB,OFFICE_ACCESS_TOKEN:OFFICE,HERMES_AGENT_TOKEN:PHONE};
}
function req(path,method='GET',payload=null,agent=false,token=agent?PHONE:OFFICE,origin=agent?'':ORIGIN){
 return new Request(HOST+path,{method,headers:{Authorization:'Bearer '+token,...(origin?{Origin:origin}:{}),...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
}
test('phone1 presence: authenticated observed state, freshness, offline fallback and no external calls',async()=>{
 const env=environment(),realFetch=globalThis.fetch;let external=0;
 globalThis.fetch=async()=>{external++;throw Error('unexpected network request');};
 try{
  let r=await worker.fetch(req('/api/phone1/presence'),env);
  assert.equal(r.status,200);let data=await r.json();
  assert.equal(data.connection,'never_connected');assert.equal(data.state,'unknown');
  r=await worker.fetch(req('/api/phone1/presence','GET',null,false,'wrong'),env);assert.equal(r.status,401);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'working',source:'hermes_runtime'},true,OFFICE),env);assert.equal(r.status,401);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'working',source:'hermes_runtime'},true,PHONE,ORIGIN),env);assert.equal(r.status,403);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'completed',source:'hermes_runtime'},true),env);assert.equal(r.status,400);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'working',source:'other'},true),env);assert.equal(r.status,400);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'working',source:'hermes_runtime',taskTitle:'릴스 원본 컷 확인'},true),env);
  assert.equal(r.status,200);assert.equal((await r.json()).state,'working');
  r=await worker.fetch(req('/api/phone1/presence'),env);data=await r.json();
  assert.equal(data.connection,'online');assert.equal(data.state,'working');assert.equal(data.taskTitle,'릴스 원본 컷 확인');
  assert.equal(data.source,'hermes_runtime');assert.ok(data.ageSeconds<=1);
  env.sqlite.prepare('UPDATE phone1_presence SET seen_at = ? WHERE id=1').run(Date.now()-121000);
  r=await worker.fetch(req('/api/phone1/presence'),env);data=await r.json();
  assert.equal(data.connection,'stale');assert.equal(data.state,'unknown');assert.equal(data.taskTitle,null);
  r=await worker.fetch(req('/api/phone1/agent/heartbeat','POST',{state:'idle',source:'manual',taskTitle:'do not show'},true),env);assert.equal(r.status,200);
  data=await (await worker.fetch(req('/api/phone1/presence'),env)).json();
  assert.equal(data.state,'idle');assert.equal(data.taskTitle,null);assert.equal(data.source,'manual');
  assert.equal(data.lastSeen>0,true);assert.equal(external,0);
  const leak=JSON.stringify(data);assert.ok(!leak.includes(PHONE));assert.ok(!leak.includes(OFFICE));
  console.log('PASS phone1 heartbeat: real device-reported state, stale offline protection, separate authentication, no false completion, no extra model calls');
 }finally{globalThis.fetch=realFetch;env.sqlite.close();}
});