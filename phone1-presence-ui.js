/* Phone1 presence view: real device-reported state, never a simulated employee animation. */
(() => {
 'use strict';
 const parent=document.querySelector('.db-main');
 if(!parent)return;
 const SERVER='https://dongbaek-api.imminchea1363.workers.dev';
 const panel=document.createElement('section');panel.id='db-phone1-presence';
 const heading=document.createElement('h3');heading.textContent='1호 휴대폰 · Hermes 실제 상태';
 const intro=document.createElement('p');intro.textContent='휴대폰에서 인증된 상태 신호가 들어오면 표시됩니다. 신호가 없으면 작업 중으로 표시하지 않습니다.';
 const bar=document.createElement('div');bar.className='db-presence-bar';
 const label=document.createElement('label');label.textContent='사무실 접속 암호';
 const input=document.createElement('input');input.id='db-phone1-presence-access';input.type='password';input.autocomplete='off';input.minLength=20;input.maxLength=256;input.placeholder='사무실 암호 (API 키 아님)';
 label.append(input);
 const connect=document.createElement('button');connect.id='db-phone1-presence-connect';connect.type='button';connect.textContent='연결 상태 확인';
 const disconnect=document.createElement('button');disconnect.id='db-phone1-presence-disconnect';disconnect.type='button';disconnect.textContent='연결 해제';disconnect.hidden=true;
 bar.append(label,connect,disconnect);
 const state=document.createElement('p');state.id='db-phone1-presence-state';state.setAttribute('role','status');state.textContent='연결 전 · 상태 확인 불가';
 const detail=document.createElement('p');detail.id='db-phone1-presence-detail';detail.textContent='휴대폰에서 실제 Hermes 상태가 전송돼야 표시됩니다.';
 panel.append(heading,intro,bar,state,detail);
 const style=document.createElement('style');style.textContent=[
 '#db-phone1-presence{padding:16px;margin:18px 0;background:#f5faf6;border:1px solid #bcd0bf;border-radius:12px}',
 '#db-phone1-presence h3{margin:0 0 8px;font-size:17px}',
 '#db-phone1-presence p{font-size:12px;line-height:1.7;color:#48624e;margin:8px 0}',
 '#db-phone1-presence .db-presence-bar{display:flex;gap:10px;align-items:end;flex-wrap:wrap}',
 '#db-phone1-presence label{display:grid;gap:4px;font-size:12px;min-width:210px;flex:1}',
 '#db-phone1-presence input{font-size:13px;padding:9px;border:1px solid #b9c9ba;border-radius:6px;width:100%;box-sizing:border-box}',
 '#db-phone1-presence button{padding:9px 12px;border:1px solid #b9c9ba;background:white;color:#315d45;border-radius:7px;cursor:pointer;font-size:12px}',
 '#db-phone1-presence button[hidden]{display:none}',
 '#db-phone1-presence-state{font-size:14px!important;font-weight:700!important}',
 ].join('\n');document.head.append(style);
 parent.querySelector('.db-metrics').after(panel);
 let access='',busy=false,tick=null;
 function broadcast(data){document.dispatchEvent(new CustomEvent('dongbaek-phone1-presence',{detail:data}));}
 const labelFor={idle:'대기 중',working:'실제 업무 중',paused:'일시정지',error:'오류 보고'};
 function render(data){
  if(!data){state.textContent='1호 Hermes · 연결 전 · 상태 확인 불가';detail.textContent='접속 암호를 입력하면 실제 기기 신호를 조회합니다.';broadcast({connection:'unknown',state:'unknown'});return;}
  if(data.connection==='never_connected'){state.textContent='1호 Hermes · 연결 이력 없음';detail.textContent='기기에서 상태를 전송한 기록이 없습니다.';broadcast({connection:'never_connected',state:'unknown'});return;}
  if(data.connection==='stale'){state.textContent='1호 Hermes · 연결 상태 확인 필요';detail.textContent='마지막 신호 후 '+data.ageSeconds+'초 경과. 이전 상태를 작업 중으로 유지하지 않습니다.';broadcast({connection:'stale',state:'unknown'});return;}
  if(data.connection!=='online'||!Object.hasOwn(labelFor,data.state)){state.textContent='1호 Hermes · 상태 확인 불가';detail.textContent='수신된 상태를 확인해야 합니다.';broadcast({connection:'unknown',state:'unknown'});return;}
  const manual=data.source==='manual';
  state.textContent='1호 Hermes · '+(manual?'수동 보고: '+(data.state==='working'?'작업 중':labelFor[data.state]):labelFor[data.state]);
  const task=data.state==='working'&&data.taskTitle?' · 업무: '+data.taskTitle:'';
  detail.textContent=(manual?'수동 상태 보고 (실행 확인 전)':'Hermes 실행기에서 보고한 상태')+' · '+data.ageSeconds+'초 전 수신'+task;
  broadcast({connection:'online',state:data.state,source:data.source,taskTitle:data.taskTitle||null,lastSeen:data.lastSeen});
 }
 async function refresh(){
  if(!access||busy||document.hidden)return;
  busy=true;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(SERVER+'/api/phone1/presence',{headers:{Authorization:'Bearer '+access},cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
   let data={};try{data=await r.json();}catch{}
   if(!r.ok)throw Error(data.message||'서버 응답 오류 ('+r.status+')');
   render(data);
  }catch(e){
   state.textContent='1호 Hermes · 연결 상태 확인 실패';detail.textContent='서버 조회 오류. 현재 실행 상태는 확인할 수 없습니다.';
   broadcast({connection:'unknown',state:'unknown'});
   if(String(e.message).includes('암호')){access='';stop();connect.hidden=false;disconnect.hidden=true;}
  }finally{clearTimeout(timer);busy=false;}
 }
 function stop(){if(tick!==null){clearInterval(tick);tick=null;}}
 connect.addEventListener('click',()=>{
  const s=input.value.trim();
  if(s.startsWith('sk-')){state.textContent='API 키를 입력하지 마세요. 사무실 접속 암호가 필요합니다.';return;}
  if(s.length<20){state.textContent='사무실 접속 암호를 확인해 주세요.';return;}
  access=s;input.value='';connect.hidden=true;disconnect.hidden=false;
  state.textContent='1호 Hermes · 상태 조회 중';
  refresh();stop();tick=setInterval(refresh,30000);
 });
 disconnect.addEventListener('click',()=>{access='';stop();connect.hidden=false;disconnect.hidden=true;render(null);});
 window.addEventListener('pagehide',()=>{access='';input.value='';stop();broadcast({connection:'unknown',state:'unknown'});});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 render(null);
})();