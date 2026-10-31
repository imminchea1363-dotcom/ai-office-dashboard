/* Dedicated Cloudflare Worker: authenticated snapshot relay only.
 * Does not execute jobs, approve content, or publish anything. NOT DEPLOYED.
 * Secrets: HERMES_PUSH_TOKEN and HERMES_READ_TOKEN (different; >=32 characters).
 * D1: DB. Browser origin is limited to GitHub Pages.
 */
const ORIGIN='https://imminchea1363-dotcom.github.io';
const schema='CREATE TABLE IF NOT EXISTS hermes_snapshots (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, received_at INTEGER NOT NULL)';
const states=['approval_pending','needs_review','approved_history','no_active_queue'];
function json(body,code=200,origin=''){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin'};
 if(origin===ORIGIN)headers['Access-Control-Allow-Origin']=ORIGIN;
 return new Response(JSON.stringify(body),{status:code,headers});
}
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function authenticated(req,secret){
 const header=req.headers.get('Authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>512||typeof secret!=='string'||secret.length<32)return false;
 const a=await digest(header.slice(7)),b=await digest(secret);let diff=0;
 for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
function valid(data,now){
 if(!data||data.schema!==1||!Number.isSafeInteger(data.captured_at)||Math.abs(now-data.captured_at)>300||!Array.isArray(data.workers)||data.workers.length!==10)return false;
 if(Object.keys(data).sort().join(',')!=='captured_at,schema,workers')return false;
 const ids=new Set();
 for(const w of data.workers){
  if(!w||typeof w!=='object'||Object.keys(w).sort().join(',')!=='approved,blocked,id,pending,rejected,stale,state')return false;
  if(!/^staff(0[1-9]|10)$/.test(w.id)||ids.has(w.id)||!states.includes(w.state))return false;
  ids.add(w.id);
  for(const k of ['pending','approved','rejected','stale','blocked'])if(!Number.isSafeInteger(w[k])||w[k]<0||w[k]>5000)return false;
  const computed=w.pending?'approval_pending':w.stale||w.blocked?'needs_review':w.approved?'approved_history':'no_active_queue';
  if(computed!==w.state)return false;
 }
 return true;
}
export default {async fetch(req,env){
 const path=new URL(req.url).pathname,origin=req.headers.get('Origin')||'';
 if(req.method==='OPTIONS'){
  if(origin!==ORIGIN)return json({error:'origin'},403,origin);
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Max-Age':'600',Vary:'Origin'}});
 }
 if(origin&&origin!==ORIGIN)return json({error:'origin'},403,origin);
 const ready=!!(env.DB?.prepare&&env.HERMES_PUSH_TOKEN?.length>=32&&env.HERMES_READ_TOKEN?.length>=32&&env.HERMES_PUSH_TOKEN!==env.HERMES_READ_TOKEN);
 if(req.method==='GET'&&path==='/health')return json({service:'hermes-status-relay',ready},200,origin);
 if(!ready)return json({error:'not_configured'},503,origin);
 try{
  if(req.method==='POST'&&path==='/api/hermes/push'){
   if(!(await authenticated(req,env.HERMES_PUSH_TOKEN)))return json({error:'unauthorized'},401,origin);
   if(!(req.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({error:'json_required'},415,origin);
   const reader=req.body?.getReader();if(!reader)return json({error:'empty'},400,origin);
   let chunks=[],size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>12000){await reader.cancel();return json({error:'too_large'},413,origin);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return json({error:'json_invalid'},400,origin);}
   const now=Math.floor(Date.now()/1000);
   if(!valid(data,now))return json({error:'schema_invalid'},400,origin);
   await env.DB.prepare(schema).run();
   await env.DB.prepare('INSERT INTO hermes_snapshots(id,data,received_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,received_at=excluded.received_at').bind(JSON.stringify(data),now).run();
   return json({ok:true,received_at:now},200,origin);
  }
  if(req.method==='GET'&&path==='/api/hermes/status'){
   if(!(await authenticated(req,env.HERMES_READ_TOKEN)))return json({error:'unauthorized'},401,origin);
   await env.DB.prepare(schema).run();
   const row=await env.DB.prepare('SELECT data,received_at FROM hermes_snapshots WHERE id=1').first();
   if(!row)return json({connected:false,reason:'no_snapshot'},200,origin);
   const age=Math.max(0,Math.floor(Date.now()/1000)-row.received_at);
   return json({connected:age<=180,stale:age>180,age_seconds:age,received_at:row.received_at,snapshot:JSON.parse(row.data)},200,origin);
  }
  return json({error:'not_found'},404,origin);
 }catch{return json({error:'relay_failure'},503,origin);}
}};