/* Phone 1 Hermes presence receiver. Reports observed events only; never launches work. */
const ORIGIN='https://imminchea1363-dotcom.github.io';
const TTL_MS=120000;
const SCHEMA=`CREATE TABLE IF NOT EXISTS phone1_presence (
 id INTEGER PRIMARY KEY CHECK (id=1), state TEXT NOT NULL, task_title TEXT,
 source TEXT NOT NULL, seen_at INTEGER NOT NULL, session_id TEXT
)`;
const ALLOWED=['idle','working','paused','error'];
class Issue extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
function reply(data,status=200,origin=''){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(origin===ORIGIN)headers['Access-Control-Allow-Origin']=ORIGIN;
 return Response.json(data,{status,headers});
}
function goodSecret(s,min){return typeof s==='string'&&s.length>=min&&s.length<=256&&/^[!-~]+$/.test(s);}
async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function authorized(req,token){
 const supplied=req.headers.get('Authorization')||'';
 if(!supplied.startsWith('Bearer ')||supplied.length>520)return false;
 const [a,b]=await Promise.all([digest(supplied.slice(7)),digest(token)]);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
async function jsonInput(request){
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw new Issue(415,'json_required','JSON 본문이 필요합니다.');
 const body=request.body;if(!body)throw new Issue(400,'missing_body','본문이 없습니다.');
 const reader=body.getReader();let size=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Issue(413,'too_large','상태 정보 크기를 초과했습니다.');}parts.push(value);}
 const b=new Uint8Array(size);let offset=0;for(const part of parts){b.set(part,offset);offset+=part.length;}
 try{const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));if(!d||typeof d!=='object'||Array.isArray(d))throw Error('invalid');return d;}
 catch{throw new Issue(400,'bad_json','상태 정보 형식이 올바르지 않습니다.');}
}
function snapshot(row,now){
 if(!row)return {device:'phone1',connection:'never_connected',state:'unknown',taskTitle:null,source:null,lastSeen:null,ageSeconds:null,ttlSeconds:TTL_MS/1000};
 const age=Math.max(0,now-row.seen_at);const live=age<=TTL_MS;
 return {device:'phone1',connection:live?'online':'stale',state:live?row.state:'unknown',taskTitle:live?(row.task_title||null):null,source:row.source,lastSeen:row.seen_at,ageSeconds:Math.floor(age/1000),ttlSeconds:TTL_MS/1000};
}
export const isPhone1PresenceAgentPath=path=>path==='/api/phone1/agent/heartbeat';
export const isPhone1PresenceOfficePath=path=>path==='/api/phone1/presence';
export async function handlePhone1Presence(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'',agent=isPhone1PresenceAgentPath(url.pathname);
 try{
  if(!env?.DB?.prepare||!goodSecret(env.OFFICE_ACCESS_TOKEN,20)||!goodSecret(env.HERMES_AGENT_TOKEN,32)||env.OFFICE_ACCESS_TOKEN===env.HERMES_AGENT_TOKEN)throw new Issue(503,'not_configured','1호 연결 서버 설정이 필요합니다.');
  if(agent){
   if(origin)throw new Issue(403,'browser_denied','1호 실행 클라이언트 전용입니다.');
   if(!await authorized(request,env.HERMES_AGENT_TOKEN))throw new Issue(401,'unauthorized','1호 장치 인증 실패');
  }else{
   if(origin!==ORIGIN)throw new Issue(403,'origin_denied','사무실에서만 확인할 수 있습니다.');
   if(!await authorized(request,env.OFFICE_ACCESS_TOKEN))throw new Issue(401,'unauthorized','사무실 접속 암호가 맞지 않습니다.');
  }
  if(agent&&request.method!=='POST'||!agent&&request.method!=='GET')throw new Issue(405,'method_not_allowed','허용되지 않은 상태 확인 방법입니다.');
  await env.DB.prepare(SCHEMA).run();
  if(agent){
   const value=await jsonInput(request);
   if(!ALLOWED.includes(value.state))throw new Issue(400,'invalid_state','idle, working, paused, error 중 하나여야 합니다.');
   if(value.source!=='hermes_runtime'&&value.source!=='manual')throw new Issue(400,'invalid_source','상태 수집 방식을 확인해 주세요.');
   if(value.taskTitle!=null&&(typeof value.taskTitle!=='string'||value.taskTitle.length>120))throw new Issue(400,'invalid_title','업무 제목 길이를 확인해 주세요.');
   const title=value.state==='working'&&value.taskTitle?.trim()?value.taskTitle.trim():null;
   const now=Date.now();
   await env.DB.prepare(`INSERT INTO phone1_presence(id,state,task_title,source,seen_at) VALUES(1,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET state=excluded.state, task_title=excluded.task_title,source=excluded.source,seen_at=excluded.seen_at`).bind(value.state,title,value.source,now).run();
   return reply({accepted:true,device:'phone1',state:value.state,receivedAt:now});
  }
  const row=await env.DB.prepare('SELECT * FROM phone1_presence WHERE id=1').first();
  return reply(snapshot(row,Date.now()),200,ORIGIN);
 }catch(error){
  return reply({error:error instanceof Issue?error.code:'presence_error',message:error instanceof Issue?error.message:'상태 수신을 확인하지 못했습니다.'},error instanceof Issue?error.status:503,agent?'':origin);
 }
}