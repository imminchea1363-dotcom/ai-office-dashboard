/* Hermes status viewer: read-only, isolated from simulated office states.
   No credentials in localStorage, no approvals, no remote commands. */
(()=>{
'use strict';
const LABEL={approval_pending:'대표 승인 대기',needs_review:'수정·재검토 필요',approved_history:'승인 기록 있음',no_active_queue:'진행 중인 승인 업무 없음'};
const NAMES=['임채리 대리','조사·기획팀 직원','임민채 대리','영상·디자인팀 직원 1','영상·디자인팀 직원 2','SNS 운영팀장','SNS 운영팀 직원','김검수','검수·성과팀 직원','동백매니저'];
let url='',token='',timer=null,last=null;
function el(tag,text=''){const n=document.createElement(tag);n.textContent=text;return n;}
const box=el('section');box.id='dongbaeg-hermes-status';box.style.cssText='position:fixed;right:14px;bottom:14px;z-index:9999;max-width:min(96vw,400px);font:13px/1.6 system-ui,Arial;color:#243a2a';
const show=el('button','Hermes 실제 업무 상태');show.type='button';show.style.cssText='padding:10px 14px;background:#336b4c;color:white;border:0;border-radius:9px;cursor:pointer';
const panel=el('div');panel.hidden=true;panel.style.cssText='background:#fff;border:1px solid #d9e4d2;border-radius:10px;padding:14px;max-height:75vh;overflow:auto;box-shadow:0 3px 18px #0003;margin-bottom:8px';
const title=el('h3','Hermes 실제 승인 업무 현황');title.style.cssText='margin:0;font-size:16px';
const note=el('p','화면 속 직원 애니메이션과는 별도의 실제 승인 기록입니다.');note.style.cssText='font-size:11px;color:#66786c;margin:3px 0 9px';
const status=el('p','미연결 · 확인된 업무 상태 없음');status.setAttribute('role','status');status.style.cssText='font-size:12px;background:#f2f5ed;padding:7px;border-radius:6px';
const roster=el('div');
const fileLabel=el('label','휴대폰에서 내보낸 상태 JSON 선택');fileLabel.style.cssText='display:block;margin:10px 0 2px;font-weight:600';
const file=el('input');file.type='file';file.accept='.json,application/json';file.style.width='100%';
const addressLabel=el('label','자동 조회 서버 HTTPS 주소');const address=el('input');address.placeholder='https://.../api/hermes/status';address.type='url';
const tokenLabel=el('label','조회 전용 토큰 (저장 안 함)');const secret=el('input');secret.placeholder='조회 토큰';secret.type='password';secret.autocomplete='off';
for(const i of [addressLabel,tokenLabel])i.style.cssText='display:block;margin:9px 0 2px;font-size:12px';
for(const i of [address,secret])i.style.cssText='padding:7px;border-radius:6px;border:1px solid #bccdbb;box-sizing:border-box;width:100%';
const connect=el('button','자동 상태 조회');connect.type='button';const disconnect=el('button','연결 끊기');disconnect.type='button';
for(const i of [connect,disconnect])i.style.cssText='margin:8px 6px 0 0;padding:7px;border-radius:6px;border:1px solid #c1cfc1;background:#f3f8f0;cursor:pointer';
function verify(data){
if(!data||data.schema!==1||!Number.isSafeInteger(data.captured_at)||!Array.isArray(data.workers)||data.workers.length!==10)throw Error('상태 JSON 형식이 올바르지 않습니다.');
const ids=new Set();
for(const w of data.workers){
if(!w||!/^staff(0[1-9]|10)$/.test(w.id)||ids.has(w.id)||!Object.hasOwn(LABEL,w.state))throw Error('직원 정보 확인 실패');
ids.add(w.id);
for(const k of ['pending','approved','rejected','stale','blocked'])if(!Number.isSafeInteger(w[k])||w[k]<0||w[k]>5000)throw Error('업무 집계 확인 실패');
}}
function render(data,origin,age){verify(data);last=data;roster.replaceChildren();
for(const w of data.workers){const item=el('div');item.style.cssText='padding:5px 0;border-bottom:1px solid #e8eee5';
const head=el('strong',NAMES[Number(w.id.substring(5))-1]+' · '+LABEL[w.state]);
const sub=el('div',`승인 대기 ${w.pending} / 승인 기록 ${w.approved} / 수정·차단 ${w.stale+w.blocked}`);sub.style.cssText='font-size:11px;color:#657866';
item.append(head,sub);roster.append(item);}
status.textContent=origin+' · '+new Date(data.captured_at*1000).toLocaleString('ko-KR')+(age===undefined?'':` · ${age}초 전`);
}
function stop(){if(timer)clearInterval(timer);timer=null;url='';token='';secret.value='';}
async function poll(){if(!url||!token||document.hidden)return;
try{const r=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();
if(!data.connected){status.textContent=data.stale?'전송이 3분 이상 끊겼습니다. 최신 상태 아님':'휴대폰의 첫 전송을 기다립니다.';return;}
render(data.snapshot,'Hermes 전달 기록',data.age_seconds);
}catch(err){status.textContent='자동 조회 오류: '+String(err.message).slice(0,100);}}
file.addEventListener('change',async()=>{
stop();try{const f=file.files?.[0];if(!f)return;if(f.size>12000)throw Error('파일이 너무 큽니다.');
render(JSON.parse(await f.text()),'수동 가져오기');}catch(err){status.textContent='파일 오류: '+String(err.message).slice(0,100);}file.value='';});
connect.addEventListener('click',()=>{try{const entered=secret.value;stop();const parsed=new URL(address.value.trim());
if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/api/hermes/status')throw Error('HTTPS 조회 주소를 입력해 주세요.');
if(entered.length<32)throw Error('조회 토큰이 필요합니다.');
url=parsed.href;token=entered;status.textContent='조회 연결 시도';poll();timer=setInterval(poll,15000);
}catch(err){status.textContent='연결 실패: '+String(err.message).slice(0,100);}});
disconnect.addEventListener('click',()=>{stop();status.textContent='연결 해제 · 표시된 기록은 과거 상태';});
show.addEventListener('click',()=>{panel.hidden=!panel.hidden;show.setAttribute('aria-expanded',String(!panel.hidden));});
show.setAttribute('aria-expanded','false');
panel.append(title,note,status,roster,fileLabel,file,addressLabel,address,tokenLabel,secret,connect,disconnect);box.append(panel,show);
const mount=()=>document.body.append(box);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.DongbaegHermesBridge=Object.freeze({connected:()=>!!timer,snapshot:()=>last?structuredClone(last):null,disconnect:stop});
})();