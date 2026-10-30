/* Existing manual handoff and job storage, with an optional GPT bridge. */
(()=>{
  'use strict';
  const office=window.DongbaekOffice;
  if(!office)return;
  const services=[
    {id:'chatgpt',name:'ChatGPT',use:'기획 · 글쓰기 · 검수',url:'https://chatgpt.com/'},
    {id:'runway',name:'Runway',use:'AI 영상 · 이미지',url:'https://app.runwayml.com/'},
    {id:'microsoft',name:'Microsoft 365',use:'문서 · 엑셀 · 발표자료',url:'https://www.microsoft365.com/'},
    {id:'higgsfield',name:'Higgsfield AI',use:'AI 영상 · 광고',url:'https://higgsfield.ai/'},
    {id:'metricool',name:'Metricool',use:'SNS 일정 · 게시 관리',url:'https://app.metricool.com/'},
    {id:'canva',name:'Canva',use:'이미지 · 광고 디자인',url:'https://www.canva.com/'},
    {id:'capcut',name:'CapCut',use:'영상 편집 · 자막',url:'https://www.capcut.com/'},
    {id:'claude',name:'Claude',use:'자료 정리 · 글쓰기',url:'https://claude.ai/'}
  ];
  const defaults={1:'chatgpt',2:'claude',3:'canva',4:'chatgpt'};
  const key='dongbaek-ai-desk-v1';
  const states={generating:'GPT 작업 중',pending:'결과 확인 필요',failed:'GPT 실행 종료',prepared:'지시문 준비',copied:'지시문 복사됨',ready:'결과 기록됨',reporting:'대표에게 이동 중',reported:'보고 완료'};
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;};
  const byId=id=>document.getElementById(id);
  const service=id=>services.find(item=>item.id===id)||services[0];
  const safeURL=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
  const clean=(value,max)=>typeof value==='string'?value.slice(0,max):'';
  let jobs=[],assignments={},draft={},storageOK=true;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'{}');
    if(saved&&typeof saved==='object'){
      if(Array.isArray(saved.jobs))jobs=saved.jobs.slice(0,100).filter(job=>job&&typeof job.id==='string'&&Number.isInteger(job.workerId)&&services.some(s=>s.id===job.service)).map(job=>({
        id:clean(job.id,100),workerId:job.workerId,workerName:clean(job.workerName,200),job:clean(job.job,100),service:job.service,title:clean(job.title,100),brief:clean(job.brief,6000),output:clean(job.output,80),result:clean(job.result,20000),url:safeURL(job.url),status:job.status==='generating'?'pending':job.status==='reporting'?'ready':states[job.status]?job.status:'prepared',gpt:job.gpt===true,usage:job.usage||null,created:clean(job.created,80),videoId:clean(job.videoId,110),videoReview:['pending','approved','revision'].includes(job.videoReview)?job.videoReview:'',videoReviewNote:clean(job.videoReviewNote,600),updated:clean(job.updated,80)
      }));
      if(saved.assignments&&typeof saved.assignments==='object')for(const [id,value] of Object.entries(saved.assignments))if(/^\d+$/.test(id)&&services.some(s=>s.id===value))assignments[id]=value;
      if(saved.draft&&typeof saved.draft==='object')draft=saved.draft;
    }
  }catch{storageOK=false;}

  const style=el('style');style.textContent=`
  .db-ai-desk{margin:24px 0;padding:24px;background:#fffaf0;border:1px solid #cfba91;border-radius:14px;color:#354d40;scroll-margin-top:20px}.db-ai-desk h2{font-size:22px;margin:0 0 8px}.db-ai-desk p{font-size:13px;line-height:1.8;margin:5px 0 15px}.db-ai-tools{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:18px 0 24px}.db-ai-tool{border:1px solid #dfd1b5;background:#fffdf7;padding:14px;border-radius:10px;min-width:0}.db-ai-tool b{display:block;font-size:14px}.db-ai-tool small{display:block;font-size:11px;color:#7b806c;line-height:1.6;margin:5px 0 10px}.db-ai-desk button,.db-ai-desk a,.db-ai-result button{font:inherit;font-size:12px;border:1px solid #b1bea5;border-radius:7px;padding:9px 13px;background:#f3f3e7;color:#315447;text-decoration:none;display:inline-block;cursor:pointer}.db-ai-desk button:disabled{opacity:.5;cursor:default}.db-ai-desk .db-ai-primary{background:#315e47;color:#fff;border-color:#315e47}.db-ai-composer{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px}.db-ai-fields{display:grid;gap:11px;min-width:0}.db-ai-desk label,.db-ai-result label{display:grid;gap:6px;font-size:12px;font-weight:600;min-width:0}.db-ai-desk input,.db-ai-desk textarea,.db-ai-desk select,.db-ai-result input,.db-ai-result textarea{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-size:13px;padding:10px;border:1px solid #c8ceb9;border-radius:7px;background:#fff;color:#344d40}.db-ai-desk textarea,.db-ai-result textarea{resize:vertical;line-height:1.8}.db-ai-prompt{height:260px;background:#f7f8ef!important;font-size:12px!important}.db-ai-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.db-ai-status{padding:10px 13px;background:#eef3e7;border-radius:8px;font-size:12px;line-height:1.8;margin:16px 0}.db-ai-desk h3{font-size:17px;margin:22px 0 12px}.db-ai-task{padding:15px 0;border-top:1px solid #ded7c6;overflow-wrap:anywhere}.db-ai-task header{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.db-ai-task strong{font-size:14px}.db-ai-task small{font-size:11px;color:#73836f;display:block;margin:7px 0}.db-ai-badge{font-size:11px;background:#e5eddd;padding:5px 8px;border-radius:6px}.db-ai-task pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:12px;line-height:1.8;max-height:230px;overflow:auto;background:#fffdf7;padding:12px;border-radius:8px}.db-ai-result{border:1px solid #c8ceb9;border-radius:14px;padding:24px;max-width:650px;width:calc(100% - 30px);max-height:88vh;overflow:auto;color:#354d40;background:#fffaf0}.db-ai-result::backdrop{background:#203b2866}.db-ai-result form{display:grid;gap:15px}.db-ai-result h2{font-size:20px;margin:0}.db-ai-result p{font-size:12px;line-height:1.8}.db-ai-result textarea{min-height:230px}.db-ai-empty{padding:18px;border:1px dashed #ccceb9;border-radius:9px;font-size:12px;line-height:1.8}.db-ai-storage{font-size:11px!important;color:#7a806e;margin-top:14px!important}
  @media(max-width:900px){.db-ai-tools{grid-template-columns:repeat(2,minmax(0,1fr))}.db-ai-composer{grid-template-columns:minmax(0,1fr)}}@media(max-width:540px){.db-ai-desk{padding:16px;margin:18px 0}.db-ai-tool{padding:11px}.db-ai-desk h2{font-size:20px}.db-ai-actions>*{flex:1;text-align:center}.db-ai-prompt{height:230px}}
  `;document.head.append(style);
  const section=el('section',null,'db-ai-desk');section.id='db-ai-desk';section.setAttribute('aria-labelledby','db-ai-heading');
  section.innerHTML=`<h2 id="db-ai-heading">동백 사무실 · AI 업무 도구</h2><p>사용 중인 서비스를 새 창으로 열어 이용하세요. 지시문을 복사해 해당 서비스에 붙여넣고 실행한 뒤, 결과를 사무실에 기록해 대표에게 보고할 수 있습니다.</p><div id="db-ai-tools" class="db-ai-tools"></div><form id="db-ai-form"><div class="db-ai-composer"><div class="db-ai-fields"><label>담당 직원<select id="db-ai-worker"></select></label><label>사용할 서비스<select id="db-ai-service"></select></label><label>업무 제목<input id="db-ai-title" maxlength="100" required placeholder="예: 주말 행사 안내문 작성"></label><label>업무 지시<textarea id="db-ai-brief" rows="5" maxlength="6000" required placeholder="목표, 대상, 참고 내용과 원하는 표현을 적어주세요."></textarea></label><label>원하는 결과 형태<select id="db-ai-output"><option>보고서</option><option>홍보 문구</option><option>이미지 · 디자인</option><option>영상 · 자막</option><option>SNS 게시 계획</option><option>문서 · 표 · 발표자료</option></select></label></div><div><label>전달할 지시문<textarea id="db-ai-prompt" class="db-ai-prompt" readonly aria-describedby="db-ai-paste-note"></textarea></label><p id="db-ai-paste-note">복사한 지시문은 열린 서비스의 입력창에 붙여넣어 주세요. 로그인은 각 서비스에서 진행합니다.</p><div class="db-ai-actions"><button id="db-ai-copy" class="db-ai-primary" type="button">1. 지시문 복사</button><a id="db-ai-open" target="_blank" rel="noopener noreferrer">2. AI 열기 ↗</a><button type="submit">업무 저장</button></div></div></div></form><div id="db-ai-status" class="db-ai-status" role="status" aria-live="polite"></div><h3>대표실 · 영상 검수 대기</h3><div id="db-video-review-queue" aria-live="polite"></div><h3>업무와 결과 보고함</h3><div id="db-ai-jobs"></div><div class="db-ai-actions"><button id="db-ai-backup" type="button">업무 기록 백업</button></div><p class="db-ai-storage">지시문과 결과는 이 브라우저에 저장됩니다. 새 버전에서도 같은 브라우저의 기록을 이어 씁니다. 브라우저 데이터 삭제 시 기록이 지워질 수 있으니 필요한 자료는 백업하세요.</p>`;
  const footer=document.querySelector('.db-footer');if(footer)footer.before(section);else document.querySelector('.db-main').append(section);
  const nav=el('button','AI 업무 도구');nav.id='db-ai-nav';nav.className='db-install';nav.onclick=()=>section.scrollIntoView({behavior:'smooth',block:'start'});document.querySelector('.db-secondary').prepend(nav);
  const worker=byId('db-ai-worker'),provider=byId('db-ai-service'),title=byId('db-ai-title'),brief=byId('db-ai-brief'),output=byId('db-ai-output'),prompt=byId('db-ai-prompt'),status=byId('db-ai-status'),form=byId('db-ai-form');
  const notice=text=>{status.textContent=text+(storageOK?'':' · 브라우저 저장이 제한되어 이번 실행에서만 유지됩니다.');};
  function persist(){try{localStorage.setItem(key,JSON.stringify({jobs,assignments,draft}));storageOK=true;}catch{storageOK=false;}}
  for(const item of services){
    const option=el('option',item.name+' · '+item.use);option.value=item.id;provider.append(option);
    const card=el('article',null,'db-ai-tool');card.dataset.aiService=item.id;card.append(el('b',item.name),el('small',item.use));
    const link=el('a','서비스 열기 ↗');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.dataset.aiServiceLink=item.id;card.append(link);byId('db-ai-tools').append(card);
  }
  function refreshWorkers(){
    const people=office.employees().filter(p=>p.state!=='off'),signature=JSON.stringify(people.map(p=>[p.id,p.name,p.job]));
    if(worker.dataset.signature===signature)return;
    const selected=worker.value||String(draft.workerId||1);worker.replaceChildren();
    for(const p of people){const option=el('option',p.job+' · '+p.name);option.value=String(p.id);worker.append(option);}
    if(people.some(p=>String(p.id)===selected))worker.value=selected;
    worker.dataset.signature=signature;return true;
  }
  refreshWorkers();provider.value=service(draft.service||assignments[worker.value]||defaults[worker.value]).id;
  title.value=clean(draft.title,100);brief.value=clean(draft.brief,6000);if([...output.options].some(o=>o.value===draft.output))output.value=draft.output;
  function instruction(job){return ['[동백 사무실 업무 지시]','담당: '+job.job+' · '+job.workerName,'업무: '+job.title,'사용 도구: '+service(job.service).name,'','[요청 내용]',job.brief,'','[원하는 결과]',job.output,'확인되지 않은 정보는 추측하지 말고 확인이 필요한 부분을 표시해 주세요.'].join('\n');}
  function current(){const person=office.employees().find(p=>String(p.id)===worker.value);return {workerId:person?.id||0,workerName:person?.name||'담당 직원',job:person?.job||'업무',service:provider.value,title:title.value.trim(),brief:brief.value.trim(),output:output.value};}
  function updateDraft(){draft={...current(),jobId:draft.jobId};prompt.value=instruction(draft);byId('db-ai-open').href=service(provider.value).url;byId('db-ai-open').textContent='2. '+service(provider.value).name+' 열기 ↗';}
  function prepareJob(){
    if(!form.reportValidity())return null;
    const next=current();if(!next.workerId){notice('출근한 담당 직원을 먼저 선택해 주세요.');return null;}
    let job=jobs.find(j=>j.id===draft.jobId&&['workerId','service','title','brief','output'].every(k=>j[k]===next[k]));
    if(!job){
      if(jobs.length>=100){notice('업무가 100개입니다. 기록을 백업하고 필요 없는 업무를 삭제한 뒤 추가해 주세요.');return null;}
      const now=new Date().toISOString();job={...next,id:crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2),status:'prepared',result:'',url:'',created:now,updated:now};jobs.unshift(job);
    }
    draft.jobId=job.id;persist();renderJobs();return job;
  }
  worker.onchange=()=>{provider.value=service(assignments[worker.value]||defaults[worker.value]).id;updateDraft();persist();};
  provider.onchange=()=>{assignments[worker.value]=provider.value;updateDraft();persist();};
  for(const node of [title,brief,output])node.addEventListener('input',()=>{updateDraft();persist();});
  form.onsubmit=event=>{event.preventDefault();if(prepareJob())notice('업무를 저장했습니다. 지시문을 복사해 선택한 서비스에서 실행하세요.');};
  async function copyText(text){
    try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return;}}catch{}
    prompt.focus();prompt.select();if(!document.execCommand('copy'))throw Error('clipboard unavailable');
  }
  byId('db-ai-copy').onclick=async()=>{
    const job=prepareJob();if(!job)return;prompt.value=instruction(job);
    try{await copyText(prompt.value);if(['prepared','copied'].includes(job.status))job.status='copied';job.updated=new Date().toISOString();persist();renderJobs();notice('지시문을 복사했습니다. '+service(job.service).name+'를 열고 입력창에 붙여넣어 실행하세요.');}
    catch{prompt.focus();prompt.select();notice('자동 복사가 제한되어 지시문을 선택했습니다. 직접 복사한 뒤 AI 입력창에 붙여넣어 주세요.');}
  };
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const link=el('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  byId('db-ai-backup').onclick=()=>download('동백사무실-업무기록.json',JSON.stringify({version:1,exported:new Date().toISOString(),jobs,assignments},null,2),'application/json;charset=utf-8');
  const dialog=el('dialog',null,'db-ai-result');dialog.id='db-ai-result-dialog';
  dialog.innerHTML='<form id="db-ai-result-form"><h2>AI 작업 결과 기록</h2><p id="db-ai-result-title"></p><label>AI에서 받은 결과<textarea id="db-ai-result-text" maxlength="20000" placeholder="서비스에서 받은 글이나 결과 설명을 붙여넣으세요."></textarea></label><label>결과 링크 (선택)<input id="db-ai-result-url" type="url" maxlength="2048" placeholder="https://…"></label><div class="db-ai-actions"><button type="submit">결과 저장</button><button id="db-ai-result-close" type="button">닫기</button></div><p id="db-ai-result-error" role="status"></p></form>';
  document.body.append(dialog);let editing=null;
  byId('db-ai-result-close').onclick=()=>dialog.close();
  byId('db-ai-result-form').onsubmit=event=>{
    event.preventDefault();const job=jobs.find(j=>j.id===editing);if(!job)return;
    const result=byId('db-ai-result-text').value.trim(),raw=byId('db-ai-result-url').value.trim(),url=safeURL(raw);
    if(!result&&!raw){byId('db-ai-result-error').textContent='결과 내용이나 결과 링크를 입력해 주세요.';return;}
    if(raw&&!url){byId('db-ai-result-error').textContent='결과 링크는 http 또는 https 주소를 입력해 주세요.';return;}
    job.result=result;job.url=url;job.status='ready';job.updated=new Date().toISOString();persist();renderJobs();dialog.close();notice('작업 결과를 기록했습니다. 대표에게 보고를 누르면 담당 직원이 대표실로 이동합니다.');
  };
  
  const queue=byId('db-video-review-queue');let previewUrls=[];
  function renderVideoQueue(){
    previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls=[];queue.replaceChildren();
    const list=jobs.filter(j=>j.workerId===3&&j.videoId&&j.videoReview);
    if(!list.length){queue.append(el('p','검수 대기 영상이 없습니다.'));return;}
    for(const job of list){
      const card=el('article',null,'db-ai-task');card.dataset.videoReviewJob=job.id;
      const labels={pending:'검수 대기',approved:'승인 완료',revision:'수정 요청'};
      card.append(el('strong',job.title+' · '+labels[job.videoReview]));
      if(job.videoReviewNote)card.append(el('p','수정 요청: '+job.videoReviewNote));
      card.append(el('p','완성 영상은 이 브라우저의 보관함에 있습니다. SNS 게시되지 않습니다.'));
      const play=el('button','완성 영상 확인');play.dataset.videoReviewPreview=job.id;
      play.onclick=async()=>{
        const item=await window.DongbaegVideoLibrary?.get(job.videoId);
        if(!item){notice('영상 보관함을 확인해 주세요.');return;}
        const old=card.querySelector('video');if(old)old.remove();
        const url=URL.createObjectURL(item.blob);previewUrls.push(url);
        const player=el('video');player.controls=true;player.playsInline=true;player.src=url;player.style.cssText='display:block;width:min(240px,100%);max-height:425px;margin:12px 0';card.append(player);
      };card.append(play);
      if(job.videoReview!=='approved'){
        const label=el('label'),check=el('input');check.type='checkbox';check.style.width='auto';check.dataset.videoReviewCheck=job.id;
        label.append(check,el('span','영상·자막·사실관계와 게시글 확인'));card.append(label);
        const yes=el('button','검수 승인');yes.dataset.videoReviewApprove=job.id;yes.onclick=async()=>{
          if(!check.checked){notice('검수 항목을 확인해야 승인할 수 있습니다.');return;}
          if(!await window.DongbaegVideoLibrary?.get(job.videoId)){notice('저장된 영상이 없어 승인할 수 없습니다.');return;}
          if(!confirm('완성 영상만 승인할까요? SNS 게시는 실행되지 않습니다.'))return;
          job.videoReview='approved';job.videoReviewNote='';job.updated=new Date().toISOString();persist();renderJobs();notice('영상 검수 승인 완료. 실제 SNS 게시 없음.');
        };card.append(yes);
        const note=el('textarea');note.maxLength=600;note.placeholder='수정할 내용';note.dataset.videoReviewNote=job.id;card.append(note);
        const revise=el('button','수정 요청');revise.dataset.videoReviewRevise=job.id;revise.onclick=()=>{
          if(!note.value.trim()){notice('수정 내용을 먼저 입력해 주세요.');return;}
          job.videoReview='revision';job.videoReviewNote=clean(note.value.trim(),600);job.updated=new Date().toISOString();persist();renderJobs();notice('수정 요청 저장 완료. 영상 제작실에서 수정하세요.');
        };card.append(revise);
      }
      queue.append(card);
    }
  }
  function renderJobs(){
    const list=byId('db-ai-jobs');list.replaceChildren();renderVideoQueue();
    if(!jobs.length){list.append(el('div','아직 등록한 업무가 없습니다. 담당 직원과 도구를 선택하고 첫 지시문을 작성해 보세요.','db-ai-empty'));return;}
    for(const job of jobs){
      const card=el('article',null,'db-ai-task');card.dataset.aiJob=job.id;const header=el('header');header.append(el('strong',job.title),el('span',states[job.status],'db-ai-badge'));card.append(header,el('small',job.job+' · '+job.workerName+' / '+service(job.service).name));
      const details=el('details');details.append(el('summary','지시문과 결과 보기'),el('pre',instruction(job)));
      if(job.result)details.append(el('pre',job.result));if(job.url){const link=el('a','저장한 결과 열기 ↗');link.href=job.url;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}card.append(details);
      const actions=el('div',null,'db-ai-actions');
      if(job.workerId===3&&job.output==='영상 · 자막'){
        const studio=el('button','영상 제작실에서 작업');studio.dataset.aiVideoJob=job.id;studio.onclick=()=>{
          document.dispatchEvent(new CustomEvent('dongbaek-video-job-select',{detail:{jobId:job.id,title:job.title,brief:job.brief}}));
          byId('db-video-studio')?.scrollIntoView({behavior:'smooth',block:'start'});
          notice('영상 업무를 선택했습니다. 완성 영상을 저장하면 대표실 검수 대기로 전달됩니다.');
        };actions.append(studio);
      }
      const record=el('button','결과 기록');record.dataset.aiRecord=job.id;record.disabled=['reporting','generating','pending'].includes(job.status);record.onclick=()=>{editing=job.id;byId('db-ai-result-title').textContent=job.title+' · '+service(job.service).name;byId('db-ai-result-text').value=job.result;byId('db-ai-result-url').value=job.url;byId('db-ai-result-error').textContent='';dialog.showModal();};actions.append(record);
      const report=el('button',job.status==='reported'?'보고 완료':'대표에게 보고');report.dataset.aiReport=job.id;report.disabled=!['ready'].includes(job.status);report.onclick=()=>{
        const employee=office.employees().find(p=>p.id===job.workerId);
        if(!employee||employee.state==='off'){notice('담당 직원이 출근한 상태에서 보고할 수 있습니다. 기록한 결과는 보관됩니다.');return;}
        const previous=employee.reports||0;
        if(!office.report?.(job.workerId)){notice('다른 직원이 이동 중입니다. 이동이 끝난 뒤 다시 보고해 주세요.');return;}
        job.beforeReports=previous;job.status='reporting';persist();renderJobs();notice(job.workerName+'이 대표실로 이동합니다. 보고가 접수되면 완료로 표시됩니다.');
      };actions.append(report);
      const sns=el('button','SNS 초안 만들기');sns.type='button';sns.dataset.aiToSns=job.id;
      sns.disabled=!job.result||['generating','pending'].includes(job.status)||(job.videoId&&job.videoReview!=='approved');
      sns.title=job.result?'이 업무의 제목·결과를 SNS 게시 초안 작성 화면으로 전달합니다. 자동 게시하지 않습니다.':'결과가 저장된 업무에서만 이용할 수 있습니다.';
      sns.onclick=()=>{
        document.dispatchEvent(new CustomEvent('dongbaek-office-to-sns',{detail:{jobId:job.id}}));
      };actions.append(sns);
      const exportButton=el('button','보고서 내려받기');exportButton.onclick=()=>download('동백사무실-'+job.title.replace(/[\\/:*?"<>|]/g,'-')+'.md','# '+job.title+'\n\n'+instruction(job)+'\n\n## 결과\n\n'+(job.result||'결과 미기록')+(job.url?'\n\n결과 링크: '+job.url:'')+'\n\n상태: '+states[job.status],'text/markdown;charset=utf-8');actions.append(exportButton);
       if(window.DongbaekDocxExport?.create){
         const word=el('button','Word 문서 내려받기');word.dataset.aiDocx=job.id;
         word.onclick=()=>{
           const filename='동백사무실-'+job.title.replace(/[\\/:*?"<>|]/g,'-')+'.docx';
           const text='# '+job.title+'\n\n'+(job.result||'결과 미기록');
           const blob=window.DongbaekDocxExport.create(text);
           const url=URL.createObjectURL(blob),link=el('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
           setTimeout(()=>URL.revokeObjectURL(url),30000);
         };
         actions.append(word);
       }
      const remove=el('button','기록 삭제');remove.disabled=['reporting','generating','pending'].includes(job.status);remove.onclick=()=>{if(!confirm('이 업무 기록을 삭제할까요? 필요한 결과는 먼저 내려받으세요.'))return;jobs=jobs.filter(j=>j.id!==job.id);persist();renderJobs();notice('선택한 업무 기록을 삭제했습니다.');};actions.append(remove);card.append(actions);list.append(card);
    }
    document.dispatchEvent(new Event('dongbaek-ai-jobs'));
  }
  document.addEventListener('dongbaek-video-job-completed',async event=>{
    const id=event.detail?.jobId,videoId=event.detail?.videoId;
    const job=jobs.find(j=>j.id===id&&j.workerId===3&&j.output==='영상 · 자막');
    if(!job||typeof videoId!=='string'||videoId.length>110){notice('연결할 영상 업무를 찾지 못했습니다.');return;}
    const item=await window.DongbaegVideoLibrary?.get(videoId);
    if(!item||!(item.blob instanceof Blob)){notice('보관함에 영상이 없습니다.');return;}
    job.videoId=videoId;job.videoReview='pending';job.videoReviewNote='';
    job.result=clean([job.result,'[완성 영상] '+item.title+' · '+item.format.toUpperCase()+' · '+item.width+'×'+item.height].filter(Boolean).join('\n\n'),20000);
    job.status='ready';job.updated=new Date().toISOString();persist();renderJobs();
    queue.scrollIntoView({behavior:'smooth',block:'start'});
    notice('완성 영상이 대표실 검수 대기에 등록됐습니다. SNS 게시 없음.');
  });
  document.addEventListener('dongbaek-scene',()=>{
    if(refreshWorkers()){updateDraft();persist();}let changed=false;
    for(const job of jobs.filter(j=>j.status==='reporting')){
      const p=office.employees().find(p=>p.id===job.workerId);
      if(p&&(p.reports||0)>job.beforeReports){job.status='reported';job.updated=new Date().toISOString();changed=true;notice(job.workerName+'의 결과 보고가 접수됐습니다.');}
      else if(!office.busy()){job.status='ready';changed=true;notice('직원 이동이 초기화됐습니다. 기록한 결과는 보관되며 다시 보고할 수 있습니다.');}
    }
    if(changed){persist();renderJobs();}
  });
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('[data-worker]');if(!target||Number(target.dataset.worker)<=0)return;
    const actions=document.querySelector('#db-detail-content .db-detail-actions');if(!actions||actions.querySelector('[data-ai-assign]'))return;
    const button=el('button','이 직원에게 AI 업무 맡기기');button.className='db-action';button.dataset.aiAssign=target.dataset.worker;
    button.onclick=()=>{worker.value=target.dataset.worker;worker.onchange();byId('db-detail').close();section.scrollIntoView({behavior:'smooth',block:'start'});title.focus({preventScroll:true});};actions.append(button);
  });
  window.DongbaekAIDesk=Object.freeze({
    startGPT:()=>{
      if(current().workerId!==1||provider.value!=='chatgpt'){notice('GPT 시험 연결은 총괄 직원과 ChatGPT를 선택해 주세요.');return null;}
      if(jobs.some(j=>j.gpt&&['generating','pending'].includes(j.status))){notice('먼저 진행 중인 GPT 업무의 결과를 확인해 주세요.');return null;}
      draft.jobId=null;const job=prepareJob();if(!job)return null;
      job.gpt=true;job.status='generating';persist();renderJobs();return {...job};
    },
    finishGPT:(id,data)=>{
       const job=jobs.find(j=>j.id===id);if(!job)return;
       job.result=clean(data.result,20000);job.usage=data.usage||null;
       job.status='ready';job.updated=new Date().toISOString();persist();renderJobs();
       if(data.autoReport){
         const button=[...document.querySelectorAll('[data-ai-report]')].find(b=>b.dataset.aiReport===id);
         if(button&&!button.disabled){button.click();return;}
         notice('종합 보고서 저장 완료. 자동 대표 보고를 시작하지 못했습니다. 결과는 보관됐으며 대표에게 보고 버튼으로 재시도할 수 있습니다.');
         return;
       }
       notice('GPT 결과를 기록했습니다. 검토한 뒤 대표에게 보고할 수 있습니다.');
     },
    failGPT:(id,pending)=>{const job=jobs.find(j=>j.id===id);if(!job)return;job.status=pending?'pending':'failed';job.updated=new Date().toISOString();persist();renderJobs();},
    pendingGPT:()=>jobs.filter(j=>j.gpt&&j.status==='pending').map(j=>({...j})),
    abandonGPT:id=>{const job=jobs.find(j=>j.id===id);if(!job||job.status!=='pending')return;job.status='failed';persist();renderJobs();},
    notify:notice
  });
  updateDraft();renderJobs();notice('지시문 복사 → AI 열기 → 결과 기록 → 대표에게 보고 순서로 이용하세요.');
})();
