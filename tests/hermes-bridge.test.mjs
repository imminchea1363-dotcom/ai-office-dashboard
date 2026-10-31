import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../hermes-bridge/relay-worker.mjs';
const push='p'.repeat(40),read='r'.repeat(40);
const now=()=>Math.floor(Date.now()/1000);
function database(){let row=null;return {prepare(sql){return {bind(...x){this.args=x;return this},async run(){if(sql.startsWith('INSERT'))row={data:this.args[0],received_at:this.args[1]};return {meta:{changes:1}}},async first(){return row}}},get(){return row}}}
function req(path,token,{method='GET',data,origin}={}){return new Request('https://bridge.example'+path,{method,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{})},...(data?{body:JSON.stringify(data)}:{})});}
function snap(){return {schema:1,captured_at:now(),workers:Array.from({length:10},(_,i)=>({id:'staff'+String(i+1).padStart(2,'0'),state:i===2?'approval_pending':'no_active_queue',pending:i===2?1:0,approved:0,rejected:0,stale:0,blocked:0}))};}
test('Hermes snapshot relay only: tokens, origin, schema and expiry',async()=>{
const DB=database(),env={DB,HERMES_PUSH_TOKEN:push,HERMES_READ_TOKEN:read};
assert.equal((await worker.fetch(req('/api/hermes/push',read,{method:'POST',data:snap()}),env)).status,401);
assert.equal((await worker.fetch(req('/api/hermes/status','invalid'),env)).status,401);
assert.equal((await worker.fetch(req('/api/hermes/status',read,{origin:'https://evil.example'}),env)).status,403);
assert.equal(DB.get(),null);
const first=await worker.fetch(req('/api/hermes/status',read),env);assert.equal((await first.json()).connected,false);
assert.equal((await worker.fetch(req('/api/hermes/push',push,{method:'POST',data:snap()}),env)).status,200);
const res=await worker.fetch(req('/api/hermes/status',read,{origin:'https://imminchea1363-dotcom.github.io'}),env);
assert.equal(res.headers.get('Access-Control-Allow-Origin'),'https://imminchea1363-dotcom.github.io');
const body=await res.json();assert.equal(body.connected,true);assert.equal(body.snapshot.workers[2].pending,1);
let bad=snap();bad.workers[0].title='customer-secret';assert.equal((await worker.fetch(req('/api/hermes/push',push,{method:'POST',data:bad}),env)).status,400);
bad=snap();bad.workers[0].state='working';assert.equal((await worker.fetch(req('/api/hermes/push',push,{method:'POST',data:bad}),env)).status,400);
bad=snap();bad.captured_at-=1000;assert.equal((await worker.fetch(req('/api/hermes/push',push,{method:'POST',data:bad}),env)).status,400);
DB.get().received_at=now()-500;
assert.equal((await (await worker.fetch(req('/api/hermes/status',read),env)).json()).stale,true);
assert.equal((await worker.fetch(req('/api/hermes/approve',push,{method:'POST',data:snap()}),env)).status,404);
});
