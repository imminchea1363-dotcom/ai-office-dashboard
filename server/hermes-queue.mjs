/* Opt-in Hermes task mailbox. No task executor, external API call, posting or payment is launched here. */
const OFFICE_ORIGIN='https://imminchea1363-dotcom.github.io';
const MAX_BODY=32768;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLICY='초안 작성과 자료 정리만 허용됩니다. 파일 변경, 명령 실행, 외부 게시, 이메일 발송, 결제, 삭제, 예약, 자동 로그인, 외부 API 호출을 하지 마세요. 수행하지 않은 조사를 수행했다고 주장하지 마세요. 결과를 보고함에 반환하고 승인을 기다리세요.';
const SCHEMA='CREATE TABLE IF NOT EXISTS hermes_tasks('+
 'id TEXT PRIMARY KEY, staff_id INTEGER NOT NULL, title TEXT NOT NULL,'+
 'brief TEXT NOT NULL, output TEXT NOT NULL, status TEXT NOT NULL,'+
 'created INTEGER NOT NULL, claimed INTEGER, finished INTEGER,'+
 'claim_token TEXT, result TEXT)';
class QueueError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const answer=(data,status=200,origin='')=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin===OFFICE_ORIGIN)headers['Access-Control-Allow-Origin']=OFFICE_ORIGIN;
 return new Response(JSON.stringify(data),{status,headers});
};
const secretValid=token=>typeof token==='string'&&token.length>=32&&token.length<=256&&/^[!-~]+$/.test(token);
const configured=env=>Boolean(env?.DB?.prepare&&typeof env.OFFICE_ACCESS_TOKEN==='string'&&env.OFFICE_ACCESS_TOKEN.length>=20&&env.OFFICE_ACCESS_TOKEN.length<=256&&/^[!-~]+$/.test(env.OFFICE_ACCESS_TOKEN)&&secretValid(env.HERMES_AGENT_TOKEN)&&env.OFFICE_ACCESS_TOKEN!==env.HERMES_AGENT_TOKEN);
async function sha(value){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));}
async function authentication(request,secret){
 const bearer=request.headers.get('Authorization')||'';
 if(!bearer.startsWith('Bearer ')||bearer.length>520)return false;
 const [a,b]=await Promise.all([sha(bearer.slice(7)),sha(secret)]);
 let mismatch=0;
 for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
 return mismatch===0;
}
async function bodyJSON(request){
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw new QueueError(415,'json_required','JSON 입력이 필요합니다.');
 if(!request.body)throw new QueueError(400,'empty_body','본문이 없습니다.');
 const reader=request.body.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new QueueError(413,'too_large','요청 크기 제한을 초과했습니다.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data))throw Error('bad');return data;}
 catch{throw new QueueError(400,'invalid_json','요청 본문 형식이 올바르지 않습니다.');}
}
function requiredText(data,key,max){
 const s=data[key];
 if(typeof s!=='string'||!s.trim()||s.length>max)throw new QueueError(400,'invalid_task',key+' 항목을 확인해 주세요.');
 return s.trim();
}
function requestId(id){if(typeof id!=='string'||!UUID.test(id))throw new QueueError(400,'invalid_id','업무 식별자 형식이 올바르지 않습니다.');return id;}
function taskData(data){
 const staffId=data.staffId;
 if(!Number.isInteger(staffId)||staffId<1||staffId>10)throw new QueueError(400,'invalid_staff','직원 번호는 1부터 10까지입니다.');
 return {id:requestId(data.id),staffId,title:requiredText(data,'title',100),brief:requiredText(data,'brief',6000),output:requiredText(data,'output',80)};
}
function safeTask(row,showText=true){
 return {id:row.id,staffId:row.staff_id,title:row.title,status:row.status,created:row.created,claimed:row.claimed,finished:row.finished,...(showText?{brief:row.brief,output:row.output,result:row.result}:{}),mode:'draft_only'};
}
async function queue(request,env,origin,url){
 if(request.method==='POST'&&url.pathname==='/api/hermes/tasks'){
  const task=taskData(await bodyJSON(request)),now=Date.now();
  const old=await env.DB.prepare('SELECT * FROM hermes_tasks WHERE id = ?').bind(task.id).first();
  if(old){
   if(old.staff_id!==task.staffId||old.title!==task.title||old.brief!==task.brief||old.output!==task.output)throw new QueueError(409,'id_conflict','같은 업무 번호로 다른 내용을 등록할 수 없습니다.');
   return answer({...safeTask(old),reused:true},200,origin);
  }
  const saved=await env.DB.prepare(
    'INSERT OR IGNORE INTO hermes_tasks(id,staff_id,title,brief,output,status,created)'+
    " SELECT ?,?,?,?,?,'queued',? WHERE"+
    " (SELECT COUNT(*) FROM hermes_tasks WHERE status IN ('queued','claimed')) < 25"+
    ' AND (SELECT COUNT(*) FROM hermes_tasks) < 200'
  ).bind(task.id,task.staffId,task.title,task.brief,task.output,now).run();
  if(!saved.meta?.changes){
   const existing=await env.DB.prepare('SELECT * FROM hermes_tasks WHERE id = ?').bind(task.id).first();
   if(existing){
    if(existing.staff_id!==task.staffId||existing.title!==task.title||existing.brief!==task.brief||existing.output!==task.output)throw new QueueError(409,'id_conflict','같은 업무 번호로 다른 내용을 등록할 수 없습니다.');
    return answer({...safeTask(existing),reused:true},200,origin);
   }
   throw new QueueError(429,'queue_limit','Hermes 시험 업무 한도에 도달했습니다. 기존 업무를 확인해 주세요.');
  }
  return answer({id:task.id,staffId:task.staffId,status:'queued',mode:'draft_only',created:now},201,origin);
 }
 if(request.method==='GET'&&url.pathname==='/api/hermes/tasks'){
  const id=requestId(url.searchParams.get('id'));
  const row=await env.DB.prepare('SELECT * FROM hermes_tasks WHERE id = ?').bind(id).first();
  if(!row)throw new QueueError(404,'missing_task','업무 기록이 없습니다.');
  return answer(safeTask(row),200,origin);
 }
 throw new QueueError(405,'method_not_allowed','요청 경로 또는 메서드를 확인해 주세요.');
}
async function agent(request,env,url){
 if(request.method==='GET'&&url.pathname==='/api/hermes/agent/next'){
  const token=crypto.randomUUID(),now=Date.now();
  // No automatic reclaim: an uncertain execution cannot be repeated without review.
  const row=await env.DB.prepare(
    "UPDATE hermes_tasks SET status='claimed',claimed=?,claim_token=?"+
    " WHERE id=(SELECT id FROM hermes_tasks WHERE status='queued' ORDER BY created,id LIMIT 1)"+
    " AND status='queued' RETURNING *"
  ).bind(now,token).first();
  if(!row)return answer({task:null},200);
  return answer({task:{...safeTask(row),claimToken:token,policy:POLICY}},200);
 }
 if(request.method==='POST'&&url.pathname==='/api/hermes/agent/result'){
  const data=await bodyJSON(request),id=requestId(data.id),token=requestId(data.claimToken);
  if(!['completed','failed'].includes(data.status))throw new QueueError(400,'invalid_status','완료 또는 실패 상태만 허용합니다.');
  const result=requiredText(data,'result',12000),now=Date.now();
  const saved=await env.DB.prepare(
    'UPDATE hermes_tasks SET status=?,result=?,finished=?,claim_token=NULL'+
    " WHERE id=? AND status='claimed' AND claim_token=?"
  ).bind(data.status,result,now,id,token).run();
  if(!saved.meta?.changes)throw new QueueError(409,'claim_conflict','업무를 찾지 못했거나 이미 처리된 결과입니다. 재실행하지 마세요.');
  return answer({id,status:data.status,finished:now},200);
 }
 throw new QueueError(405,'method_not_allowed','Hermes 연결 경로 또는 메서드를 확인해 주세요.');
}
export const hermesQueueConfigured=configured;
export const isHermesAgentPath=path=>path.startsWith('/api/hermes/agent/');
export const isHermesOfficePath=path=>path==='/api/hermes/tasks';
export async function handleHermesQueue(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'',isAgent=isHermesAgentPath(url.pathname);
 try{
  if(!configured(env))throw new QueueError(503,'not_configured','Hermes 연결용 별도 암호와 D1 설정이 필요합니다.');
  if(isAgent){
   if(origin)throw new QueueError(403,'browser_denied','Hermes 연결은 별도 실행 클라이언트에서만 가능합니다.');
   if(!await authentication(request,env.HERMES_AGENT_TOKEN))throw new QueueError(401,'unauthorized','Hermes 인증을 확인해 주세요.');
  }else{
   if(origin!==OFFICE_ORIGIN)throw new QueueError(403,'origin_denied','동백사무실에서 요청해 주세요.');
   if(!await authentication(request,env.OFFICE_ACCESS_TOKEN))throw new QueueError(401,'unauthorized','사무실 접속 암호가 맞지 않습니다.');
  }
  await env.DB.prepare(SCHEMA).run();
  return isAgent?await agent(request,env,url):await queue(request,env,origin,url);
 }catch(error){
  return answer({error:error instanceof QueueError?error.code:'queue_error',message:error instanceof QueueError?error.message:'연결 기록 저장에 실패했습니다.'},error instanceof QueueError?error.status:503,isAgent?'':origin);
 }
}
