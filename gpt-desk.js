/* Optional GPT pilot. The OpenAI key is never sent to, entered in, or stored by this page. */
(() => {
 'use strict';
 const desk = window.DongbaekAIDesk, section = document.getElementById('db-ai-desk');
 if (!desk || !section) return;
 const $ = id => document.getElementById(id);
 const SERVER = 'https://dongbaek-api.imminchea1363.workers.dev';
 let connected = false, access = '', busy = false;
 const panel = document.createElement('div'); panel.className = 'db-ai-gpt'; panel.id = 'db-gpt-panel';
 panel.innerHTML = `<h3>동백대리 · GPT 시험 연결</h3><p>총괄 직원에게 지시하면 GPT가 작성한 결과를 아래 보고함에 기록합니다. 다른 도구는 기존처럼 직접 열어 이용합니다. 업무 지시가 OpenAI로 전송되며 결과는 연결 서버와 이 브라우저에 저장됩니다.</p><details id="db-gpt-settings" open><summary>GPT 연결 설정</summary><form id="db-gpt-connect-form"><label>사무실 접속 암호<input id="db-gpt-access" type="password" autocomplete="off" minlength="20" maxlength="256" required placeholder="Cloudflare에 등록한 사무실 접속 암호"></label><p>OpenAI API 키를 입력하는 칸이 아닙니다. 접속 암호는 이 페이지를 닫거나 연결을 해제하면 사라집니다.</p><div class="db-ai-actions"><button id="db-gpt-connect" type="submit">연결 확인</button><button id="db-gpt-disconnect" type="button">연결 해제</button></div></form></details><p id="db-gpt-status" role="status" aria-live="polite">서버 설정 후 연결할 수 있습니다. 연결 확인만으로는 GPT를 호출하지 않습니다.</p><p>시험 한도: 한국시간 기준 하루 20회 · 전체 200회 · 한 번에 최대 1,200 출력 토큰. 실패한 실행도 한도에 포함될 수 있습니다. 자동 반복 실행과 외부 게시는 하지 않습니다.</p>`;
 section.querySelector('.db-ai-tools').before(panel);
 const css = document.createElement('style'); css.textContent = '.db-ai-gpt{padding:18px;border:1px solid #abc3ab;border-radius:10px;background:#eef4e9;margin:16px 0;overflow-wrap:anywhere}.db-ai-gpt h3{margin-top:0}.db-ai-gpt form{margin-top:13px;max-width:620px}.db-ai-gpt p{font-size:12px}.db-ai-gpt input{margin-top:5px}#db-gpt-status{font-weight:600;margin:13px 0 0}.db-gpt-recovery{padding:10px;background:#eef4e9;border-radius:7px;margin:9px 0}.db-ai-gpt summary{cursor:pointer}#db-gpt-run[hidden],#db-manager-run[hidden]{display:none}'; document.head.append(css);
 const run = document.createElement('button'); run.type = 'button'; run.id = 'db-gpt-run'; run.className = 'db-ai-primary'; run.textContent = 'GPT로 실행 · 사용료 발생';
 $('db-ai-form').querySelector('.db-ai-actions').prepend(run);
 const managerButton = document.createElement('button');
 managerButton.type = 'button';
 managerButton.id = 'db-manager-run';
 managerButton.className = 'db-ai-primary';
 managerButton.textContent = '총괄매니저 자동 배정·종합 보고 (GPT 4회 호출)';
 run.after(managerButton);
 const quick = document.createElement('section'); quick.id='db-manager-quick'; quick.className='db-manager-quick';
 quick.innerHTML = '<h3>총괄매니저에게 바로 지시하기</h3><p>대표님은 제목과 지시만 입력하세요. 직원별 조사 → 검수 → 최종 보고는 자동으로 진행됩니다. 지시문 복사나 직원 선택은 필요 없습니다.</p><form id="db-manager-quick-form"><label>업무 제목<input id="db-manager-quick-title" maxlength="100" required placeholder="예: 동백팬션 11월 홍보 전략"></label><label>총괄매니저에게 할 지시<textarea id="db-manager-quick-brief" rows="5" maxlength="3000" required placeholder="원하는 목표, 배경, 기준과 제한사항을 말씀해 주세요."></textarea></label><label>원하는 결과<select id="db-manager-quick-output"><option>보고서</option><option>홍보 문구</option><option>SNS 게시 계획</option><option>문서 · 표 · 발표자료</option></select></label><button type="submit" id="db-manager-quick-run" class="db-ai-primary">총괄에게 업무 맡기기 · GPT 최대 4회 유료 호출</button></form><p id="db-manager-quick-progress" role="status" aria-live="polite">GPT 연결 후 실행할 수 있습니다. 디자인 업무는 GPT 문구 기획과 브라우저 포스터 PNG 생성까지 진행합니다. 자동 게시하지 않습니다.</p><ol id="db-manager-quick-stages"><li>1. 총괄 업무 배정</li><li>2. 임채리사원 조사</li><li>3. 김검수사원 검수</li><li>4. 총괄 종합 보고</li></ol><button id="db-manager-quick-results" type="button">완료된 결과 확인 ↓</button>';
 panel.after(quick);
 css.textContent += '.db-manager-quick{padding:20px;border:2px solid #b6c8b0;border-radius:12px;background:#f8fbf4;margin:16px 0 22px;scroll-margin-top:12px}.db-manager-quick h3{margin:0 0 10px;font-size:19px}.db-manager-quick p{line-height:1.65}.db-manager-quick form{display:grid;gap:12px;max-width:730px}.db-manager-quick label{display:grid;gap:6px;font-size:13px;font-weight:600}.db-manager-quick input,.db-manager-quick textarea,.db-manager-quick select{width:100%;font:inherit;font-size:14px;border:1px solid #b6c8b0;background:white;padding:10px;border-radius:7px;box-sizing:border-box}.db-manager-quick textarea{resize:vertical}.db-manager-quick button{max-width:100%;white-space:normal}.db-manager-quick-stages li{margin:5px 0}.db-manager-quick li[data-state="active"]{font-weight:700;color:#205f3c}.db-manager-quick li[data-state="done"]{color:#3c7950}.db-manager-quick ol{padding-left:25px}.db-manager-quick #db-manager-quick-progress{font-weight:600}';
 const quickForm=$('db-manager-quick-form'), quickButton=$('db-manager-quick-run');
 const officeManual=window.DongbaekOfficeManual;
 if(officeManual)officeManual.install(document.getElementById('db-manager-quick'));

 const posterStudio=window.DongbaekPosterStudio;
 if(posterStudio)posterStudio.install(quickForm);
 const quickProgress=$('db-manager-quick-progress'), quickStages=[...$('db-manager-quick-stages').children];
 let quickParentId = null;
 const quickStatus=(step,note)=>{quickProgress.textContent=note;quickStages.forEach((li,index)=>{li.dataset.state=index<step?'done':index===step?'active':'waiting';});};
 $('db-manager-quick-results').onclick=()=>{document.getElementById('db-ai-jobs').scrollIntoView({behavior:'smooth',block:'start'});};
 const managerKey = 'dongbaek-manager-runs-v1';
 function wantsVideo(job){return /영상|릴스|숏폼|쇼츠|shorts|reels|틱톡|편집|15초|동영상/i.test([job.title,job.brief,job.output].join(' '));}
 function wantsDesign(job){
  const text=[job.title,job.brief,job.output].join(' ');
  return /디자인|포스터|썸네일|배너|카드뉴스|로고|이미지|시각|광고소재/.test(text)||wantsVideo(job);
 }
 function planSteps(job){
  return wantsDesign(job)
   ? ['동백총괄매니저 업무 배정','임채리사원 자료조사','임민채대리 디자인·영상 기획','김검수사원 검수','동백총괄매니저 최종 보고']
   : ['동백총괄매니저 업무 배정','임채리사원 자료조사','김검수사원 검수','동백총괄매니저 최종 보고'];
 }
 function renderSteps(job){
  const steps=planSteps(job);
  $('db-manager-quick-stages').replaceChildren(...steps.map((name,i)=>{
   const li=document.createElement('li');li.textContent=(i+1)+'. '+name;return li;
  }));
  quickStages.splice(0,quickStages.length,...$('db-manager-quick-stages').children);
  const count=steps.length;
  managerButton.textContent='총괄매니저 자동 배정·종합 보고 (GPT '+count+'회 호출)';
  quickButton.textContent='총괄에게 업무 맡기기 · GPT 최대 '+count+'회 유료 호출';
 }
 let managerRuns = {};
 try {
  const saved = JSON.parse(localStorage.getItem(managerKey) || '{}');
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) managerRuns = saved;
 } catch { /* Browser storage unavailable. Do not assume a job can be resumed. */ }
 function saveManager() {
  try { localStorage.setItem(managerKey, JSON.stringify(managerRuns)); return true; }
  catch { message('브라우저 저장이 불가능해 자동 배정을 시작할 수 없습니다.'); return false; }
 }
 const message = text => { $('db-gpt-status').textContent = text; };
 function update() {
  const eligible = $('db-ai-worker').value === '1' && $('db-ai-service').value === 'chatgpt';
  run.hidden = !eligible; run.disabled = !connected || busy || desk.pendingGPT().length > 0;
  managerButton.hidden = !eligible;
  managerButton.disabled = !connected || busy || desk.pendingGPT().length > 0;
  quickButton.disabled = !connected || busy || desk.pendingGPT().length > 0;
  $('db-gpt-connect').disabled = busy; $('db-gpt-disconnect').disabled = busy;
  $('db-gpt-access').disabled = busy;
 }
 function disconnect() { connected = false; access = ''; $('db-gpt-access').value = ''; update(); }
 async function call(path, body) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
  try {
   const response = await fetch(SERVER + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + access, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' });
   const data = await response.json();
   if (!response.ok) { const error = new Error(data.message || '연결 서버를 확인해 주세요.'); error.code = data.error; error.status = response.status; throw error; }
   return data;
  } finally { clearTimeout(timer); }
 }
 window.DongbaegVisionAnalyze=async ({frames})=>{
  if(!connected||!access)throw Error('GPT 서버 연결이 필요합니다. 영상은 전송하지 않았습니다.');
  if(!Array.isArray(frames)||frames.length<1||frames.length>3)throw Error('프레임은 최대 3개까지 분석할 수 있습니다.');
  const result=await call('/api/vision',{id:crypto.randomUUID(),frames});
  if(!Array.isArray(result.visible)||!result.visible.length)throw Error('실제 장면 근거가 부족하여 자막을 적용하지 않았습니다.');
  return result;
 };
 $('db-gpt-connect-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  const value = $('db-gpt-access').value.trim();
  if (value.startsWith('sk-')) { $('db-gpt-access').value = ''; message('API 키는 여기에 입력하지 않습니다. Cloudflare의 OFFICE_ACCESS_TOKEN에 정한 별도 접속 암호를 입력해 주세요.'); return; }
  if (!/^[!-~]{20,256}$/.test(value)) { message('접속 암호는 공백 없이 영문·숫자·기호 20~256자로 입력해 주세요.'); return; }
  access = value; busy = true; update(); message('연결 서버를 확인하고 있습니다…');
  try {
   const data = await call('/api/status'); connected = true; $('db-gpt-access').value = ''; $('db-gpt-settings').open = false;
   message(`GPT 연결 준비 완료 · ${data.model} · 오늘 ${data.used.today}/${data.limits.daily}회, 전체 ${data.used.total}/${data.limits.pilot}회. 업무 입력 후 실행 버튼을 눌러주세요.`);
  } catch (error) { disconnect(); message(error.message === 'Failed to fetch' ? '서버 코드·DB·접속 암호 설정과 인터넷 연결을 확인해 주세요.' : error.message); }
  finally { busy = false; update(); renderRecovery(); }
 };
 $('db-gpt-disconnect').onclick = () => { disconnect(); $('db-gpt-settings').open = true; message('GPT 연결을 해제했습니다. 저장된 업무 기록은 유지됩니다.'); renderRecovery(); };

 const usageButton=document.createElement('button');usageButton.type='button';usageButton.id='db-gpt-usage';usageButton.textContent='GPT 사용량 확인 (생성 호출 없음)';
 const usageLine=document.createElement('p');usageLine.id='db-gpt-usage-details';usageLine.setAttribute('role','status');usageLine.textContent='연결 후 사용량을 조회할 수 있습니다.';
 $('db-gpt-status').after(usageButton,usageLine);
 usageButton.onclick=async()=>{
  if(!connected||busy){usageLine.textContent='먼저 GPT 서버에 연결해 주세요.';return;}
  usageButton.disabled=true;
  try{const data=await call('/api/status');const used=data.used||{},limits=data.limits||{};
   usageLine.textContent='서버 기준 사용 횟수 · 오늘 '+(used.today??'?')+'/'+(limits.daily??'?')+'회 · 전체 '+(used.total??'?')+'/'+(limits.pilot??'?')+'회. 실제 결제 금액은 제공되지 않습니다.';
  }catch(error){usageLine.textContent='사용량 조회 오류: '+(error.message||'연결 상태를 확인하세요.');}
  finally{usageButton.disabled=false;}
 };
 run.onclick = async () => {
  if (!connected || busy) return;
  const job = desk.startGPT(); if (!job) return;
  busy = true; update(); message('GPT가 업무를 작성하고 있습니다. 중복 요청은 보내지 않습니다.');
  try { const result = await call('/api/jobs', { id: job.id, title: job.title, brief: job.brief, output: job.output }); desk.finishGPT(job.id, result); message('GPT 작업 완료. 아래 보고함에서 결과를 검토하고 대표에게 보고해 주세요.'); }
  catch (error) {
   const pending = !error.code || ['pending', 'uncertain', 'server_error'].includes(error.code);
   desk.failGPT(job.id, pending);
   if (error.status === 401) disconnect();
   message((error.code ? error.message : '응답을 확인하지 못했습니다. 아래 결과 확인 버튼으로 조회해 주세요.') + ' 자동으로 재실행하지 않았습니다.');
  } finally { busy = false; update(); renderRecovery(); }
 };

 function stageTask(record, stage) {
  const design=record.design===true;
  const brief = record.brief.slice(0, 3000);
  const plan = (record.parts[0].result || '').slice(0, 1000);
  const research = (record.parts[1].result || '').slice(0, 1400);
  const review = (record.parts[design?3:2].result || '').slice(0, 1000);
  const visual = design ? (record.parts[2].result || '').slice(0, 1200) : '';
  const common = '원래 대표 지시: ' + brief + '\n[대표 승인 업무 매뉴얼]\n' + (officeManual?officeManual.forStage(stage,design):'정보를 지어내지 말고 미확인 사항을 구분하세요.') + '\n검증되지 않은 상품 가격·시장 정보는 사실로 쓰지 마세요. 인터넷 검색 기능이 연결되지 않았으므로 실시간 조회를 했다고 주장하지 마세요.';
  if (stage === 0) return {
   title: '동백총괄매니저 · 직원별 업무 배정',
   brief: common + (design?'\n임채리사원(자료조사), 임민채대리(디자인·영상 기획), 김검수사원(검수)에게 업무를 배정하세요. 디자인·영상 단계에서는 15초 영상 컷 구성 또는 포스터 문구를 기획합니다. 실제 파일을 만들기 전에는 제작 완료를 주장하지 마세요.':'\n임채리사원(자료조사)와 김검수사원(검수)에게 업무를 배정하세요.') + '\n마지막에 대표에게 보고할 평가 기준을 제시하세요.',
   output: '직원별 업무 지시'
  };
  if (stage === 1) return {
   title: '임채리사원 · 자료조사 업무',
   brief: common + '\n동백총괄매니저의 업무 배정:\n' + plan + '\n자료조사 담당자로서 지시 범위 내에서 가능한 분석을 수행하고 출처 미확인·추가 확인 필요 항목을 구분하세요.',
   output: '자료조사 결과'
  };
  if (stage === 2 && design) return {
   title: '임민채대리 · 디자인·영상 기획',
   brief: common + '\n동백총괄매니저의 배정:\n' + plan + '\n임채리사원 조사:\n' + research + (record.video ? '\n실제 촬영 소스를 기준으로 15초 세로 숏폼 0~2초 후킹, 2~5초, 5~9초, 9~12초, 12~15초 컷 구성·자막·CTA와 검수 사항을 작성하세요. 동영상을 완성했다고 주장하지 마세요.' : '\n세로형 홍보 포스터의 문구를 생성하세요. 반드시 JSON 객체 하나만 반환: {"headline":"간결한 큰 제목","subtitle":"확인된 장점만 설명","cta":"실제로 확인된 예약 안내"}. 가격, 할인, 예약 가능일, 시설을 지어내지 마세요. 실제 사진이나 포스터 이미지는 생성했다고 주장하지 마세요.'),
   output: record.video?'15초 영상 콘티·자막·제작 지침':'디자인 제작 지침 JSON'

  };
  if (stage === 2 || (stage === 3 && design)) return {
   title: '김검수사원 · 자료 검수',
   brief: common + '\n총괄의 배정 내용:\n' + plan + '\n자료조사 결과:\n' + research + (design?'\n임민채대리 디자인 기획:\n'+visual:'') + '\n과장, 허위 사실, 수익 계산 오류, 디자인 실현 가능성과 추가 검증할 사항을 평가하세요.',
   output: '검수 보고서'
  };
  return {
   title: '동백총괄매니저 · 최종 종합 보고',
   brief: common + '\n자료조사 결과:\n' + research + (design?'\n디자인 제작 지침:\n'+visual:'') + '\n검수 의견:\n' + review + '\n직원 보고를 종합해 대표가 결정할 사항, 근거 부족한 사항, 다음 실행 제안을 구분해 작성하세요. 실제 외부 조사를 완료했다고 말하지 마세요.',
   output: record.output.slice(0, 80)
  };
 }
 function composeManagerReport(record) {
  return [
   '# 동백총괄매니저 종합 보고',
   '업무: ' + record.title,
   '',
   '## 총괄매니저 최종 보고',
   record.parts[record.parts.length-1].result,
   '',
   '## 임채리사원 자료조사',
   record.parts[1].result,
   ...(record.design===true?['','## 임민채대리 디자인·영상 기획',record.parts[2].result]:[]),
   '',
   '## 김검수사원 검수',
   record.parts[record.design===true?3:2].result,
   '',
   ...(record.design===true?(record.video?['','## 영상 제작','실제 영상 파일은 임민채 대리 영상 제작실에서 별도 제작해야 합니다.']:['','## 포스터 이미지','임민채 대리가 실제 PNG 포스터를 만들어 업무와 결과 보고함에 별도 저장했습니다. 아래 이미지에서 확인하고 내려받으세요.']):[]),
   '## 실행 전 확인',
   '위 권고사항을 실행하기 전 미확인 비용·시장 데이터와 자동화 연동 가능 여부를 따로 검증하세요.'
  ].join('\n').slice(0, 20000);
 }
 async function runManager(record) {
  if (!connected || busy) return;
  busy = true; update();
  try {
   if(record.design && !record.video && !record.photoPrepared){
    if(!posterStudio)throw new Error('포스터 제작 도구가 설치되어 있지 않습니다.');
    await posterStudio.prepare(record.parentId,quickParentId===record.parentId?posterStudio.selectedPhoto():[],quickParentId===record.parentId?posterStudio.selectedPhotoIndex():0,quickParentId===record.parentId?posterStudio.selectedOptions():undefined);
    record.photoPrepared=true;
    if(!saveManager())throw new Error('사진 준비 상태를 저장하지 못해 GPT 실행을 중단했습니다.');
   }
   for (; record.stage < record.parts.length; ) {
    const index = record.stage, part = record.parts[index], task = stageTask(record, index);
    // Generate a real PNG after the designer step, before charging for QA.
    // If local image storage fails, preserve completed paid stages and allow safe recovery.
    if(record.design && !record.video && index===3 && !record.posterReady){
     if(!posterStudio)throw new Error('브라우저 포스터 제작 도구를 찾지 못했습니다.');
     message('임민채 대리 · 포스터 PNG를 생성하고 브라우저에 저장하고 있습니다.');
     await posterStudio.generate(record.parentId,{title:record.title,brief:record.brief,designText:record.parts[2].result});
     record.posterReady=true;
     if(!saveManager())throw new Error('포스터 생성 기록을 저장하지 못했습니다. 유료 GPT 호출 없이 복구할 수 있습니다.');
    }
    message('총괄 자동 배정: ' + (index + 1) + '/'+record.parts.length+'단계 진행 중 · ' + task.title);
    if(quickParentId===record.parentId) quickStatus(index, (index + 1) + '/'+record.parts.length+'단계 진행 중: ' + task.title);
    let response;
    if (part.attempted) {
     // Never re-POST an uncertain paid operation. Only recover a previously saved result.
     response = await call('/api/result?id=' + encodeURIComponent(part.id));
    } else {
     part.attempted = true;
     if (!saveManager()) throw new Error('진행 기록을 저장하지 못했습니다. GPT 호출은 보내지 않았습니다.');
     response = await call('/api/jobs', { id: part.id, ...task });
    }
    part.result = typeof response.result === 'string' ? response.result.slice(0, 5000) : '';
    if (!part.result) throw new Error('GPT 결과가 비어 있어 다음 직원에게 전달하지 않았습니다.');
    record.stage = index + 1;
    if (!saveManager()) throw new Error('진행 결과 저장 실패. 추가 GPT 호출을 중단했습니다.');
   }
   desk.finishGPT(record.parentId, {result: composeManagerReport(record), usage: {calls: record.parts.length}, autoReport: true});
   delete managerRuns[record.parentId]; saveManager();
   message('직원별 GPT 처리와 총괄 보고서 작성 완료. 대표실 보고를 요청했습니다. 보고함에서 상태를 확인하세요.');
   if(quickParentId===record.parentId) quickStatus(record.parts.length,'GPT '+record.parts.length+'단계 완료 · 대표실 보고 상태는 아래 보고함에서 확인하세요.');
  } catch (error) {
   desk.failGPT(record.parentId, true);
   if (error.status === 401) disconnect();
   message('자동 배정 중단: ' + (error.message || '결과를 확인할 수 없습니다.') + ' · 자동 재실행하지 않습니다. 아래 업무에서 결과 확인 후 재개하세요.');
   if(quickParentId===record.parentId) quickStatus(record.stage,'자동 배정이 중단됐습니다. 보고함의 저장된 단계 확인 버튼으로 재개할 수 있습니다.');
  } finally { busy = false; update(); renderRecovery(); }
 }
 managerButton.onclick = () => {
  if (!connected || busy || desk.pendingGPT().length) return;
  if (!crypto.randomUUID) { message('이 브라우저에서는 안전한 업무 식별자를 만들 수 없습니다.'); return; }
  if (!confirm('총괄매니저가 직원에게 업무를 나눠 맡기고 종합 보고서를 만듭니다. GPT API를 최대 '+planSteps({title:$('db-ai-title').value,brief:$('db-ai-brief').value,output:$('db-ai-output').value}).length+'회 호출하며 사용료가 발생할 수 있습니다. 실행할까요?')) return;
  const job = desk.startGPT();
  if (!job) return;
  if(quick.dataset.launching==='yes') quickParentId=job.id;
  const record = {
   parentId: job.id, title: job.title, brief: job.brief, output: job.output, design: wantsDesign(job), video: wantsVideo(job), stage: 0,
   parts: Array.from({length: planSteps(job).length}, () => ({ id: crypto.randomUUID(), attempted: false, result: '' }))
  };
  managerRuns[job.id] = record;
  if (!saveManager()) { desk.failGPT(job.id, false); return; }
  runManager(record);
 };
 quickForm.onsubmit=event=>{
  event.preventDefault();
  if(!quickForm.reportValidity()||!connected||busy||desk.pendingGPT().length)return;
  const worker=$('db-ai-worker'),service=$('db-ai-service');
  if(![...worker.options].some(option=>option.value==='1')){quickStatus(0,'총괄매니저가 출근한 상태에서만 자동 업무를 맡길 수 있습니다.');return;}
  worker.value='1';worker.dispatchEvent(new Event('change',{bubbles:true}));
  service.value='chatgpt';service.dispatchEvent(new Event('change',{bubbles:true}));
  $('db-ai-title').value=$('db-manager-quick-title').value.trim();
  $('db-ai-brief').value=$('db-manager-quick-brief').value.trim();
  $('db-ai-output').value=$('db-manager-quick-output').value;
  for(const id of ['db-ai-title','db-ai-brief','db-ai-output'])$(id).dispatchEvent(new Event('input',{bubbles:true}));
  renderSteps({title:$('db-ai-title').value,brief:$('db-ai-brief').value,output:$('db-ai-output').value});
  update();quick.dataset.launching='yes';
  try{managerButton.click();}finally{delete quick.dataset.launching;}
 };
 function renderManagerRecovery(job, card) {
  if (card.querySelector('.db-manager-recovery')) return;
  const record = managerRuns[job.id];
  const block = document.createElement('div'); block.className = 'db-gpt-recovery db-manager-recovery';
  const note = document.createElement('p');
  note.textContent = '총괄 자동 배정이 중단됐습니다. 완료한 단계는 저장됐으며, 이미 요청한 GPT 작업은 재호출하지 않습니다. (' + record.stage + '/'+record.parts.length+'단계)';
  const resume = document.createElement('button'); resume.type = 'button'; resume.textContent = '저장된 단계 확인·이어서 실행';
  resume.onclick = () => {
   if (!connected) { message('먼저 GPT 서버에 연결해 주세요.'); panel.scrollIntoView({behavior:'smooth'}); return; }
   runManager(record);
  };
  block.append(note, resume); card.append(block);
 }

 function renderRecovery() {
  for (const job of desk.pendingGPT()) {
   const card = [...document.querySelectorAll('[data-ai-job]')].find(node => node.dataset.aiJob === job.id);
   if (!card || card.querySelector('.db-gpt-recovery')) continue;
   if (managerRuns[job.id]) { renderManagerRecovery(job, card); continue; }
   const block = document.createElement('div'); block.className = 'db-gpt-recovery';
   const note = document.createElement('p'); note.textContent = '응답이 확인되지 않은 GPT 업무입니다. 결과 조회는 새 GPT 호출을 발생시키지 않습니다.';
   const check = document.createElement('button'); check.type = 'button'; check.textContent = 'GPT 결과 확인'; check.dataset.gptRecover = job.id;
   check.onclick = async () => {
    if (!connected) { message('먼저 사무실 접속 암호로 연결해 주세요.'); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (busy) return; busy = true; check.disabled = true; update();
    try { const result = await call('/api/result?id=' + encodeURIComponent(job.id)); desk.finishGPT(job.id, result); message('저장된 GPT 결과를 가져왔습니다. 추가 GPT 호출은 없었습니다.'); }
    catch (error) {
     if (['missing_job', 'previous_attempt'].includes(error.code)) desk.failGPT(job.id, false);
     if (error.status === 401) disconnect();
     message(error.code ? error.message : '결과 조회에 실패했습니다. 인터넷 연결을 확인해 주세요.');
    } finally { busy = false; check.disabled = false; update(); renderRecovery(); }
   };
   const abandon = document.createElement('button'); abandon.type = 'button'; abandon.textContent = '확인 종료';
   abandon.onclick = () => { if (busy || !confirm('이 업무의 결과 확인을 종료할까요? 서버에서 진행 중인 작업이 취소되거나 요금이 환불되지는 않습니다.')) return; desk.abandonGPT(job.id); update(); };
   block.append(note, check, abandon); card.append(block);
  }
 }
 for(const id of ['db-manager-quick-title','db-manager-quick-brief','db-manager-quick-output'])$(id).addEventListener('input',()=>renderSteps({title:$('db-manager-quick-title').value,brief:$('db-manager-quick-brief').value,output:$('db-manager-quick-output').value}));
 for(const id of ['db-ai-title','db-ai-brief','db-ai-output'])$(id).addEventListener('input',()=>{if(quickParentId && busy)return; const job={title:$('db-ai-title').value,brief:$('db-ai-brief').value,output:$('db-ai-output').value}; managerButton.textContent='총괄매니저 자동 배정·종합 보고 (GPT '+planSteps(job).length+'회 호출)';});
 document.addEventListener('dongbaek-ai-jobs', () => {
  renderRecovery(); update();
  if(quickParentId){
   const card=[...document.querySelectorAll('[data-ai-job]')].find(el=>el.dataset.aiJob===quickParentId);
   const status=card?.querySelector('.db-ai-badge')?.textContent||'';
   if(status==='보고 완료')quickStatus(quickStages.length,'대표실 보고 완료 · 아래 보고함에서 Word 문서를 받으실 수 있습니다.');
   else if(status==='대표에게 이동 중')quickStatus(quickStages.length,'GPT 업무 완료 · 대표실로 보고 이동 중');
  }
 });
 for (const id of ['db-ai-worker', 'db-ai-service']) $(id).addEventListener('change', update);
 document.addEventListener('click', () => queueMicrotask(update));
 window.addEventListener('pagehide', () => { connected = false; access = ''; $('db-gpt-access').value = ''; });
 window.addEventListener('pageshow', update);
 renderRecovery(); update();
})();
