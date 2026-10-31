/* Phone 1 Hermes -> Dongbaek Office, draft-only inbox. No automatic execution. */
const ORIGIN='https://imminchea1363-dotcom.github.io';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SCHEMA='CREATE TABLE IF NOT EXISTS phone1_inbox ('+
 'id TEXT PRIMARY KEY, staff_id INTEGER NOT NULL, title TEXT NOT NULL, brief TEXT NOT NULL,'+
 'output TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL,'+
 'result TEXT, result_source TEXT, finished INTEGER)';
class InputError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
function reply(data,status=200,origin=''){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin===ORIGIN)headers['Access-Control-Allow-Origin']=ORIGIN;
 return Response.json(data,{status,headers});
}
function configured(env){
 const office=env?.OFFICE_ACCESS_TOKEN,phone=env?.HERMES_AGENT_TOKEN;
 return !!(env?.DB?.prepare&&typeof office==='string'&&office.length>=20&&office.length<=256&&/^[!-~]+$/.test(office)&&typeof phone==='string'&&phone.length>=32&&phone.length<=256&&/^[!-~]+$/.test(phone)&&phone!==office);
}
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function authorized(req,secret){
 const raw=req.headers.get('Authorization')||'';
 if(!raw.startsWith('Bearer ')||raw.length>520)return false;
 const [a,b]=await Promise.all([digest(raw.slice(7)),digest(secret)]);
 let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
 return mismatch===0;
}
async function bodyJSON(req){
 if(!(req.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw new InputError(415,'json_required','JSON 본문이 필요합니다.');
 if(!req.body)throw new InputError(400,'missing_body','본문을 확인해 주세요.');
 const reader=req.body.getReader(),parts=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32768){await reader.cancel();throw new InputError(413,'too_large','최대 본문 크기를 초과했습니다.');}parts.push(value);}
 const bytes=new Uint8Array(size);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{
  const obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('bad');
  return obj;
 }catch{throw new InputError(400,'bad_json','JSON 본문이 올바르지 않습니다.');}
}
function uuid(s){if(typeof s!=='string'||!UUID.test(s))throw new InputError(400,'bad_id','업무 ID가 올바르지 않습니다.');return s;}
function string(obj,key,max){
 const v=obj[key];if(typeof v!=='string'||!v.trim()||v.length>max)throw new InputError(400,'bad_field',key+' 값을 확인해 주세요.');
 return v.trim();
}
function data(obj){
 const staffId=obj.staffId;
 if(!Number.isInteger(staffId)||staffId<1||staffId>10)throw new InputError(400,'bad_staff','직원 번호는 1~10만 가능합니다.');
 return {id:uuid(obj.id),staffId,title:string(obj,'title',100),brief:string(obj,'brief',6000),output:string(obj,'output',80)};
}
function safe(row,includeBrief=false){
 return {id:row.id,staffId:row.staff_id,title:row.title,output:row.output,status:row.status,created:row.created,
 ...(includeBrief?{brief:row.brief}:{}),
 result:row.result||null,resultSource:row.result_source||null,finished:row.finished||null,reviewStatus:row.status==='draft_ready'?'pending':null,mode:'draft_only',source:'phone1'};
}
async function agent(req,env,url){
 if(url.pathname==='/api/phone1/agent/dispatch'&&req.method==='POST'){
  const t=data(await bodyJSON(req)),created=Date.now();
  const current=await env.DB.prepare('SELECT * FROM phone1_inbox WHERE id=?').bind(t.id).first();
  if(current){
   if(current.staff_id!==t.staffId||current.title!==t.title||current.brief!==t.brief||current.output!==t.output)throw new InputError(409,'id_conflict','같은 ID로 다른 업무를 보낼 수 없습니다.');
   return reply({...safe(current),reused:true});
  }
  const write=await env.DB.prepare(
   'INSERT OR IGNORE INTO phone1_inbox(id,staff_id,title,brief,output,status,created)'+
   " SELECT ?,?,?,?,?,'queued',? WHERE "+
   " (SELECT COUNT(*) FROM phone1_inbox WHERE status='queued') < 25"+
   ' AND (SELECT COUNT(*) FROM phone1_inbox) < 200'
  ).bind(t.id,t.staffId,t.title,t.brief,t.output,created).run();
  if(!write.meta?.changes){
   const existing=await env.DB.prepare('SELECT * FROM phone1_inbox WHERE id=?').bind(t.id).first();
   if(existing){
    if(existing.staff_id!==t.staffId||existing.title!==t.title||existing.brief!==t.brief||existing.output!==t.output)throw new InputError(409,'id_conflict','같은 ID의 업무 내용이 다릅니다.');
    return reply({...safe(existing),reused:true});
   }
   throw new InputError(429,'queue_limit','1호 업무 대기함 한도에 도달했습니다.');
  }
  return reply({id:t.id,staffId:t.staffId,status:'queued',mode:'draft_only',source:'phone1',created},201);
 }
 if(url.pathname==='/api/phone1/agent/status'&&req.method==='GET'){
  const id=uuid(url.searchParams.get('id'));
  const row=await env.DB.prepare('SELECT * FROM phone1_inbox WHERE id=?').bind(id).first();
  if(!row)throw new InputError(404,'missing_job','업무가 없습니다.');
  return reply(safe(row));
 }
 throw new InputError(405,'invalid_method','1호 휴대폰 요청 경로를 확인해 주세요.');
}
async function office(req,env,url){
 if(url.pathname==='/api/phone1/inbox'&&req.method==='GET'){
  const id=url.searchParams.get('id');
  if(id){
   const row=await env.DB.prepare('SELECT * FROM phone1_inbox WHERE id=?').bind(uuid(id)).first();
   if(!row)throw new InputError(404,'missing_job','업무가 없습니다.');
   return reply({task:safe(row,true)},200,ORIGIN);
  }
  const rows=await env.DB.prepare('SELECT * FROM phone1_inbox ORDER BY created DESC,id DESC LIMIT 20').all();
  return reply({tasks:(rows.results||[]).map(row=>safe(row,true)),mode:'draft_only'},200,ORIGIN);
 }
 if(url.pathname==='/api/phone1/inbox/result'&&req.method==='POST'){
  const obj=await bodyJSON(req),id=uuid(obj.id),status=obj.status;
  if(status!=='draft_ready'&&status!=='failed')throw new InputError(400,'bad_status','초안 작성 또는 실패 상태만 반환할 수 있습니다.');
  const result=string(obj,'result',12000),finished=Date.now();
  const changed=await env.DB.prepare(
   "UPDATE phone1_inbox SET status=?,result=?,result_source='office_manual',finished=?"+
   " WHERE id=? AND status='queued'"
  ).bind(status,result,finished,id).run();
  if(!changed.meta?.changes){
   const old=await env.DB.prepare('SELECT * FROM phone1_inbox WHERE id=?').bind(id).first();
   if(!old)throw new InputError(404,'missing_job','업무가 없습니다.');
   if(old.status===status&&old.result===result&&old.result_source==='office_manual')
    return reply({...safe(old),reused:true},200,ORIGIN);
   throw new InputError(409,'already_handled','처리된 업무를 다시 완료할 수 없습니다.');
  }
  return reply({id,status,resultSource:'office_manual',reviewStatus:status==='draft_ready'?'pending':null,finished},200,ORIGIN);
 }
 throw new InputError(405,'invalid_method','사무실 작업 요청 경로를 확인해 주세요.');
}
export const isPhoneAgentPath=path=>path.startsWith('/api/phone1/agent/');
export const isPhoneOfficePath=path=>path==='/api/phone1/inbox'||path==='/api/phone1/inbox/result';
export async function handlePhone1Inbox(req,env){
 const url=new URL(req.url),origin=req.headers.get('Origin')||'',isAgent=isPhoneAgentPath(url.pathname);
 try{
  if(!configured(env))throw new InputError(503,'not_configured','1호 연결용 비밀키와 D1 설정이 필요합니다.');
  if(isAgent){
   if(origin)throw new InputError(403,'browser_denied','1호 에이전트 전용 경로입니다.');
   if(!await authorized(req,env.HERMES_AGENT_TOKEN))throw new InputError(401,'unauthorized','1호 에이전트 인증에 실패했습니다.');
  }else{
   if(origin!==ORIGIN)throw new InputError(403,'origin_denied','동백사무실에서만 요청할 수 있습니다.');
   if(!await authorized(req,env.OFFICE_ACCESS_TOKEN))throw new InputError(401,'unauthorized','사무실 인증에 실패했습니다.');
  }
  await env.DB.prepare(SCHEMA).run();
  return isAgent?agent(req,env,url):office(req,env,url);
 }catch(error){
  return reply({error:error instanceof InputError?error.code:'inbox_error',message:error instanceof InputError?error.message:'업무 기록을 처리하지 못했습니다.'},error instanceof InputError?error.status:503,isAgent?'':origin);
 }
}
