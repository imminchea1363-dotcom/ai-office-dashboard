/* Opt-in Hermes queue UI. This records a task, not a completed AI job. */
(() => {
 'use strict';
 const roster=window.DongbaekTeam10State?.roster;
 const parent=document.getElementById('db-ai-desk');
 if(!roster||!parent)return;
 const SERVER='https://dongbaek-api.imminchea1363.workers.dev';
 const KEY='dongbaek-hermes-queue-ids-v1';
 let credential='',pending=false,records=[];
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'[]');
  if(Array.isArray(saved))records=saved.slice(0,20).filter(x=>x&&typeof x.id==='string'&&typeof x.title==='string'&&Number.isInteger(x.staffId));
 }catch{}
 const panel=document.createElement('section');panel.id='db-hermes-pilot';
 panel.innerHTML='<h3>Hermes 업무 연결 · 시험판</h3>'+
  '<p>여기서 접수한 업무는 서버 대기함에 기록됩니다. 휴대폰 Hermes에 실행 연결이 설치되기 전에는 AI 작업이 시작되지 않습니다. 외부 게시나 결제는 하지 않습니다.</p>'+
  '<form id="db-hermes-form"><label>사무실 접속 암호<input id="db-hermes-access" type="password" autocomplete="off" minlength="20" maxlength="256" placeholder="기존 사무실 암호" required></label>'+
  '<label>담당 직원<select id="db-hermes-staff"></select></label>'+
  '<label>업무 제목<input id="db-hermes-title" maxlength="100" required placeholder="예: 이번 주 스레드 게시글 초안"></label>'+
  '<label>지시 내용<textarea id="db-hermes-brief" rows="4" maxlength="6000" required placeholder="출처 확인이 필요한 경우 표시하도록 지시하세요."></textarea></label>'+
  '<label>결과 형태<select id="db-hermes-output"><option>검수용 초안</option><option>자료 요약</option><option>보고서</option><option>SNS 게시 문구 초안</option></select></label>'+
  '<button type="submit" id="db-hermes-submit">Hermes 업무 대기함에 접수</button></form>'+
  '<p id="db-hermes-message" role="status" aria-live="polite">사무실과 Hermes 연결 설정이 완료되어야 접수됩니다. 접수 자체에는 GPT API 호출을 사용하지 않습니다.</p>'+
  '<h4>내가 접수한 업무</h4><div id="db-hermes-entries"></div>';
 const css=document.createElement('style');
 css.textContent=[
 '#db-hermes-pilot{margin:20px 0;padding:18px;border:1px solid #c1cdbd;background:#f9fbf5;border-radius:12px}',
 '#db-hermes-pilot h3{font-size:18px;margin:0 0 9px}',
 '#db-hermes-pilot h4{font-size:14px;margin:18px 0 8px}',
 '#db-hermes-pilot p{font-size:12px;line-height:1.7;color:#536750}',
 '#db-hermes-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
 '#db-hermes-form label{display:grid;gap:5px;font-size:12px;min-width:0}',
 '#db-hermes-form input,#db-hermes-form textarea,#db-hermes-form select{width:100%;box-sizing:border-box;font-size:13px;padding:10px;border:1px solid #b6c6b0;border-radius:7px;background:white;color:#2e4135}',
 '#db-hermes-form label:has(textarea){grid-column:1/-1}',
 '#db-hermes-form button,#db-hermes-entries button{font:inherit;font-size:12px;border-radius:7px;padding:9px 12px;background:#345e48;color:white;border:0;cursor:pointer}',
 '#db-hermes-entries article{display:flex;gap:10px;align-items:center;justify-content:space-between;border-top:1px solid #d4ddcd;padding:10px 0;flex-wrap:wrap;font-size:12px}',
 '#db-hermes-entries small{color:#70836a}',
 '@media(max-width:620px){#db-hermes-form{grid-template-columns:1fr}}'
 ].join('\n');
 document.head.append(css);
 parent.querySelector('#db-ai-jobs').before(panel);
 const $=id=>document.getElementById(id);
 const staff=$('db-hermes-staff');
 for(const worker of roster){const opt=document.createElement('option');opt.value=String(worker.id);opt.textContent=worker.name+' · '+worker.job;staff.add(opt);}
 const message=text=>{$('db-hermes-message').textContent=text;};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(records.slice(0,20)));return true;}catch{return false;}};
 function render(){
  const entries=$('db-hermes-entries');entries.replaceChildren();
  if(!records.length){const p=document.createElement('p');p.textContent='아직 접수한 업무가 없습니다.';entries.append(p);return;}
  for(const job of records){
   const article=document.createElement('article');article.dataset.hermesId=job.id;
   const info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
   strong.textContent=job.title;
   small.textContent=(roster.find(p=>p.id===job.staffId)?.name||'담당자 확인')+' · '+job.status;
   info.append(strong,document.createElement('br'),small);
   const check=document.createElement('button');check.type='button';check.textContent='상태 확인';check.dataset.hermesCheck=job.id;
   check.addEventListener('click',async()=>{
    if(pending)return;
    const access=credential||$('db-hermes-access').value;
    if(!access){message('상태 확인을 위해 사무실 접속 암호를 입력해 주세요.');return;}
    pending=true;check.disabled=true;
    try{
     const d=await call('/api/hermes/tasks?id='+encodeURIComponent(job.id),null,access);
     job.status=d.status;
     job.result=typeof d.result==='string'?d.result.slice(0,12000):'';
     save();render();
     message(d.status==='completed'?'Hermes 결과가 서버에 기록됐습니다. 대표 검수 전이며 외부 게시되지 않았습니다.':'현재 상태: '+d.status);
    }catch(e){message(e.message||'서버 상태를 확인할 수 없습니다.');}
    finally{pending=false;check.disabled=false;}
   });
   article.append(info,check);
   if(job.result&&job.status==='completed'){const details=document.createElement('details');details.style.width='100%';const summary=document.createElement('summary');summary.textContent='받은 결과 보기';const pre=document.createElement('pre');pre.style.whiteSpace='pre-wrap';pre.textContent=job.result;details.append(summary,pre);article.append(details);}
   entries.append(article);
  }
 }
 async function call(path,body,access){
  const controller=new AbortController(),handle=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(SERVER+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+access,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
   let data={};try{data=await response.json();}catch{}
   if(!response.ok)throw Error(data.message||'서버 연결 설정을 확인해 주세요. ('+response.status+')');
   return data;
  }finally{clearTimeout(handle);}
 }
 $('db-hermes-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(pending||!event.currentTarget.reportValidity())return;
  if(!crypto.randomUUID){message('보안 연결에서만 안전한 업무 번호를 생성할 수 있습니다.');return;}
  const access=$('db-hermes-access').value||credential;
  if(access.startsWith('sk-')){message('API 키가 아닌 사무실 접속 암호를 입력해 주세요.');return;}
  const task={id:crypto.randomUUID(),staffId:Number(staff.value),title:$('db-hermes-title').value.trim(),brief:$('db-hermes-brief').value.trim(),output:$('db-hermes-output').value};
  pending=true;$('db-hermes-submit').disabled=true;
  records.unshift({id:task.id,staffId:task.staffId,title:task.title,status:'전송 확인 필요'});
  if(!save()){records.shift();pending=false;$('db-hermes-submit').disabled=false;message('업무 기록을 안전하게 저장하지 못해 전송하지 않았습니다.');return;}
  render();
  try{
   const result=await call('/api/hermes/tasks',task,access);
   credential=access;$('db-hermes-access').value='';
   records[0].status=result.status;save();render();
   message('서버에 접수했습니다. 아직 AI 실행 전이며 대표 검수가 필요합니다.');
  }catch(e){message((e.message||'통신 실패')+' · 접수 여부가 불확실하므로 자동 재전송하지 않습니다. 상태 확인을 눌러주세요.');}
  finally{pending=false;$('db-hermes-submit').disabled=false;}
 });
 window.addEventListener('pagehide',()=>{credential='';$('db-hermes-access').value='';});
 render();
})();
