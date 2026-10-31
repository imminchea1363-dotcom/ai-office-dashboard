/* Phone1 → office task inbox. Explicit manual draft submission; no generated results or publishing. */
(() => {
 'use strict';
 const roster=window.DongbaekTeam10State?.roster;
 const parent=document.getElementById('db-ai-desk');
 if(!roster||!parent)return;
 const SERVER='https://dongbaek-api.imminchea1363.workers.dev';
 const panel=document.createElement('section');
 panel.id='db-phone1-inbox';
 const h=document.createElement('h3');h.textContent='1호 동백대리 → 사무실 업무 지시함';
 const info=document.createElement('p');info.textContent='1호 휴대폰에서 보낸 지시를 확인하고 결과를 회신합니다. 지시 수신만으로 AI가 실행되거나 게시되지는 않습니다.';
 const bar=document.createElement('div');bar.className='db-p1-controls';
 const label=document.createElement('label');label.textContent='사무실 접속 암호';
 const password=document.createElement('input');password.type='password';password.autocomplete='off';password.minLength=20;password.maxLength=256;password.id='db-p1-inbox-access';label.append(password);
 const check=document.createElement('button');check.type='button';check.id='db-p1-inbox-check';check.textContent='1호 업무 확인';
 bar.append(label,check);
 const status=document.createElement('p');status.id='db-p1-inbox-status';status.setAttribute('role','status');status.textContent='연결 전 · 실제 지시 수신 여부 확인 필요';
 const list=document.createElement('div');list.id='db-p1-inbox-list';
 panel.append(h,info,bar,status,list);
 const style=document.createElement('style');
 style.textContent=[
 '#db-phone1-inbox{border:1px solid #c1d1c2;border-radius:12px;padding:18px;margin:18px 0;background:#f6faf6}',
 '#db-phone1-inbox h3{font-size:17px;margin:0 0 7px}',
 '#db-phone1-inbox p{font-size:12px;line-height:1.7;color:#4c6854}',
 '#db-phone1-inbox .db-p1-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}',
 '#db-phone1-inbox label{display:grid;gap:5px;flex:1;min-width:220px;font-size:12px}',
 '#db-phone1-inbox input,#db-phone1-inbox textarea{padding:9px;font-size:13px;border:1px solid #b6c9b7;border-radius:7px;max-width:100%;box-sizing:border-box}',
 '#db-phone1-inbox button{border:1px solid #b6c9b7;background:#365b49;color:white;border-radius:7px;padding:9px 12px;cursor:pointer;font-size:12px}',
 '#db-phone1-inbox button:disabled{opacity:.55}',
 '#db-p1-inbox-list article{border-top:1px solid #d6e2d2;padding:12px 0}',
 '#db-p1-inbox-list b{font-size:13px}',
 '#db-p1-inbox-list small{display:block;color:#627a68;margin:6px 0}',
 '#db-p1-inbox-list pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}',
 '#db-p1-inbox-list form{display:grid;gap:8px;max-width:680px}',
 '#db-p1-inbox-list textarea{width:100%;min-height:100px}',
 '#db-p1-inbox-list form button{justify-self:start}'
 ].join('\n');document.head.append(style);
 parent.querySelector('#db-ai-jobs').before(panel);
 let credential='',busy=false,records=[];
 const notify=text=>{status.textContent=text;};
 function announce(){
  document.dispatchEvent(new CustomEvent('dongbaek-phone1-inbox',{detail:{jobs:records.map(t=>({id:t.id,staffId:t.staffId,title:t.title,status:t.status}))}}));
 }
 async function call(path,payload){
  const control=new AbortController();
  const timeout=setTimeout(()=>control.abort(),15000);
  try{
   const resp=await fetch(SERVER+path,{method:payload?'POST':'GET',headers:{Authorization:'Bearer '+credential,...(payload?{'Content-Type':'application/json'}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{}),cache:'no-store',credentials:'omit',redirect:'error',signal:control.signal});
   let data={};try{data=await resp.json();}catch{}
   if(!resp.ok)throw Error(data.message||'서버 상태 '+resp.status);
   return data;
  }finally{clearTimeout(timeout);}
 }
 function render(){
  list.replaceChildren();
  if(!records.length){const p=document.createElement('p');p.textContent='현재 확인된 업무 지시가 없습니다.';list.append(p);announce();return;}
  for(const task of records){
   const card=document.createElement('article');card.dataset.phone1Task=task.id;
   const title=document.createElement('b');title.textContent=task.title;
   const summary=document.createElement('small');
   summary.textContent=(roster.find(p=>p.id===task.staffId)?.name||'담당 확인 필요')+' · '+(
    task.status==='queued'?'업무 접수 · 실행 전':task.status==='draft_ready'?'초안 전달 · 검수 전':task.status==='failed'?'실패 보고':'상태 확인 필요');
   const brief=document.createElement('pre');brief.textContent=task.brief||'';
   card.append(title,summary,brief);
   if(task.status==='queued'){
    const form=document.createElement('form');form.dataset.phone1Reply=task.id;
    const field=document.createElement('textarea');field.required=true;field.maxLength=12000;field.placeholder='실제로 작성·확인한 결과만 입력하세요. 자동 AI 실행이나 검수 완료를 의미하지 않습니다.';
    const send=document.createElement('button');send.type='submit';send.textContent='1호에 초안 회신';
    form.append(field,send);
    form.addEventListener('submit',async event=>{
     event.preventDefault();
     if(busy||!form.reportValidity())return;
     const result=field.value.trim();if(!result)return;
     busy=true;send.disabled=true;
     try{
      const received=await call('/api/phone1/inbox/result',{id:task.id,status:'draft_ready',result});
      if(received.status!=='draft_ready')throw Error('회신 결과가 확인되지 않았습니다.');
      task.status='draft_ready';task.result=result;render();
      notify('1호에 결과를 저장했습니다. 대표 검수 및 외부 게시 승인은 아직 이루어지지 않았습니다.');
     }catch(error){notify((error.message||'회신 상태 불확실')+' · 다시 전송하지 말고 지시함을 조회해 주세요.');}
     finally{busy=false;send.disabled=false;}
    });
    card.append(form);
   }
   if(task.result){
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('pre');
    summary.textContent='회신 내용';body.textContent=task.result;details.append(summary,body);card.append(details);
   }
   list.append(card);
  }
  announce();
 }
 check.addEventListener('click',async()=>{
  if(busy)return;
  const next=password.value.trim();
  if(next){
   if(next.startsWith('sk-')){notify('GPT API 키가 아닌 사무실 접속 암호가 필요합니다.');return;}
   if(next.length<20){notify('사무실 암호를 확인해 주세요.');return;}
   credential=next;password.value='';
  }
  if(!credential){notify('사무실 접속 암호를 입력해 주세요.');return;}
  busy=true;check.disabled=true;
  try{
   const data=await call('/api/phone1/inbox');
   if(!Array.isArray(data.tasks))throw Error('서버 응답을 확인할 수 없습니다.');
   records=data.tasks.filter(t=>t&&roster.some(p=>p.id===t.staffId)&&typeof t.id==='string');
   render();notify('1호 업무 '+records.length+'건을 확인했습니다. 지시 수신만으로 AI를 자동 실행하지 않습니다.');
  }catch(error){notify(error.message||'업무 지시를 가져오지 못했습니다.');}
  finally{busy=false;check.disabled=false;}
 });
 window.addEventListener('pagehide',()=>{credential='';password.value='';});
 render();
})();
