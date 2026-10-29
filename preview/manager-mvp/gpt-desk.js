/* Optional GPT pilot. The OpenAI key is never sent to, entered in, or stored by this page. */
(() => {
 'use strict';
 const desk = window.DongbaekAIDesk, section = document.getElementById('db-ai-desk');
 if (!desk || !section) return;
 const $ = id => document.getElementById(id);
 const SERVER = 'mock-local-only';
 let connected = true, access = '', busy = false;
 const panel = document.createElement('div'); panel.className = 'db-ai-gpt'; panel.id = 'db-gpt-panel';
 panel.innerHTML = '<h3>동백총괄매니저 · 자동 배정 시험</h3><p>시험용 모의 데이터입니다. 외부 AI API 호출·실시간 쿠팡 검색·요금 지출 없이 자동 배정, 취합, 보고서 저장만 확인합니다.</p><details id="db-gpt-settings" hidden><form id="db-gpt-connect-form"><input id="db-gpt-access" type="password"><button id="db-gpt-connect" type="submit">모의 연결</button><button id="db-gpt-disconnect" type="button">연결 해제</button></form></details><p id="db-gpt-status" role="status" aria-live="polite">모의 GPT 연결 준비 완료 · 실제 API 호출 0회</p>';

 section.querySelector('.db-ai-tools').before(panel);
 const demoNote = document.createElement('style');demoNote.textContent='#db-gpt-settings{display:none!important}';document.head.append(demoNote);
 const css = document.createElement('style'); css.textContent = '.db-ai-gpt{padding:18px;border:1px solid #abc3ab;border-radius:10px;background:#eef4e9;margin:16px 0;overflow-wrap:anywhere}.db-ai-gpt h3{margin-top:0}.db-ai-gpt form{margin-top:13px;max-width:620px}.db-ai-gpt p{font-size:12px}.db-ai-gpt input{margin-top:5px}#db-gpt-status{font-weight:600;margin:13px 0 0}.db-gpt-recovery{padding:10px;background:#eef4e9;border-radius:7px;margin:9px 0}.db-ai-gpt summary{cursor:pointer}#db-gpt-run[hidden],#db-manager-run[hidden]{display:none}'; document.head.append(css);
 const run = document.createElement('button'); run.type = 'button'; run.id = 'db-gpt-run'; run.className = 'db-ai-primary'; run.textContent = 'GPT로 실행 · 사용료 발생';
 $('db-ai-form').querySelector('.db-ai-actions').prepend(run);
 const managerButton = document.createElement('button');
 managerButton.type = 'button';
 managerButton.id = 'db-manager-run';
 managerButton.className = 'db-ai-primary';
 managerButton.textContent = '총괄매니저 자동 배정·종합 보고 (GPT 4회 호출)';
 run.after(managerButton);
 const managerKey = 'dongbaek-preview-manager-runs-v1';
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
  $('db-gpt-connect').disabled = busy; $('db-gpt-disconnect').disabled = busy;
  $('db-gpt-access').disabled = busy;
 }
 function disconnect() { connected = false; access = ''; $('db-gpt-access').value = ''; update(); }
 async function call(path, body) {
  const storageKey = 'dongbaek-preview-manager-mock-results-v1';
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (path === '/api/status') return {connected:true,model:'모의 GPT',used:{today:0,total:0},limits:{daily:0,pilot:0}};
  if (path.startsWith('/api/result?id=')) {
   const id = decodeURIComponent(path.split('?id=')[1] || '');
   if (!saved[id]) throw new Error('모의 결과 기록을 찾을 수 없습니다.');
   return {id,result:saved[id],reused:true,usage:{input_tokens:0,output_tokens:0}};
  }
  if (path !== '/api/jobs' || !body?.id) throw new Error('알 수 없는 모의 요청입니다.');
  const stage = String(body.title || '');
  const results = {
   assignment:'[모의 직원 배정] 임채리 대리: 대표 지시를 기준으로 조사 항목과 필요한 근거를 정리하세요. 김검수 사원: 임채리 대리의 결과 중 근거 부족과 계산 오류를 확인하세요. 총괄매니저: 결과를 취합하고 다음 확인사항을 보고하세요.',
   research:'[임채리 대리 · 모의 결과] 요청한 사업의 조사 항목을 분류했습니다. 실제 온라인 검색은 수행하지 않았으며 상품 가격, 수수료, 판매량은 확인되지 않았습니다. 사업별 예상 원가와 수익성은 실제 공급처 자료가 확보된 뒤 분석해야 합니다.',
   review:'[김검수 사원 · 모의 검수] 확인된 실시간 시장 데이터가 없습니다. 가격과 예상 수익을 임의로 확정해서는 안 됩니다. 실제 등록 전에 공급가·판매 수수료·배송비·반품 정책 검증이 필요합니다.',
   final:'[동백총괄매니저 · 모의 최종 보고] 임채리 대리와 김검수 사원의 검토 결과를 취합했습니다. 현재 단계는 자동 배정·수집 기능 시험입니다. 실제 상품 조사나 구매·등록은 진행하지 않았습니다. 다음에는 실제 데이터 연결 권한과 비용 승인을 검토해야 합니다.'
  };
  const result = stage.includes('직원별 업무 배정') ? results.assignment
   : stage.includes('임채리대리') ? results.research
   : stage.includes('김검수사원') ? results.review : results.final;
  saved[body.id] = result;
  localStorage.setItem(storageKey, JSON.stringify(saved));
  return {id:body.id,result,usage:{input_tokens:0,output_tokens:0},model:'모의 GPT'};
 }
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
  const brief = record.brief.slice(0, 3000);
  const plan = (record.parts[0].result || '').slice(0, 1000);
  const research = (record.parts[1].result || '').slice(0, 1400);
  const review = (record.parts[2].result || '').slice(0, 1000);
  const common = '원래 대표 지시: ' + brief + '\n검증되지 않은 상품 가격·시장 정보는 사실로 쓰지 마세요. 인터넷 검색 기능이 연결되지 않았으므로 실시간 조회를 했다고 주장하지 마세요.';
  if (stage === 0) return {
   title: '동백총괄매니저 · 직원별 업무 배정',
   brief: common + '\n임채리대리(자료조사)와 김검수사원(검수)에게 맡길 일을 구체적으로 나눠 지시하세요. 마지막에 대표에게 보고할 평가 기준을 제시하세요.',
   output: '직원별 업무 지시'
  };
  if (stage === 1) return {
   title: '임채리대리 · 자료조사 업무',
   brief: common + '\n동백총괄매니저의 업무 배정:\n' + plan + '\n자료조사 담당자로서 지시 범위 내에서 가능한 분석을 수행하고 출처 미확인·추가 확인 필요 항목을 구분하세요.',
   output: '자료조사 결과'
  };
  if (stage === 2) return {
   title: '김검수사원 · 자료 검수',
   brief: common + '\n총괄의 배정 내용:\n' + plan + '\n자료조사 결과:\n' + research + '\n과장, 허위 사실, 수익 계산 오류, 추가 검증할 사항을 평가하세요.',
   output: '검수 보고서'
  };
  return {
   title: '동백총괄매니저 · 최종 종합 보고',
   brief: common + '\n자료조사 결과:\n' + research + '\n검수 의견:\n' + review + '\n직원 보고를 종합해 대표가 결정할 사항, 근거 부족한 사항, 다음 실행 제안을 구분해 작성하세요. 실제 외부 조사를 완료했다고 말하지 마세요.',
   output: record.output.slice(0, 80)
  };
 }
 function composeManagerReport(record) {
  return [
   '# 동백총괄매니저 종합 보고',
   '업무: ' + record.title,
   '',
   '## 총괄매니저 최종 보고',
   record.parts[3].result,
   '',
   '## 임채리대리 자료조사',
   record.parts[1].result,
   '',
   '## 김검수사원 검수',
   record.parts[2].result,
   '',
   '## 총괄매니저 업무 배정 기록',
   record.parts[0].result
  ].join('\n').slice(0, 20000);
 }
 async function runManager(record) {
  if (!connected || busy) return;
  busy = true; update();
  try {
   for (; record.stage < record.parts.length; ) {
    const index = record.stage, part = record.parts[index], task = stageTask(record, index);
    message('총괄 자동 배정: ' + (index + 1) + '/4단계 진행 중 · ' + task.title);
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
   desk.finishGPT(record.parentId, {result: composeManagerReport(record), usage: {calls: 4}});
   delete managerRuns[record.parentId]; saveManager();
   message('직원별 GPT 처리와 총괄 보고서 작성 완료. 아래 보고함에서 결과를 확인하세요.');
  } catch (error) {
   desk.failGPT(record.parentId, true);
   if (error.status === 401) disconnect();
   message('자동 배정 중단: ' + (error.message || '결과를 확인할 수 없습니다.') + ' · 자동 재실행하지 않습니다. 아래 업무에서 결과 확인 후 재개하세요.');
  } finally { busy = false; update(); renderRecovery(); }
 }
 managerButton.onclick = () => {
  if (!connected || busy || desk.pendingGPT().length) return;
  if (!crypto.randomUUID) { message('이 브라우저에서는 안전한 업무 식별자를 만들 수 없습니다.'); return; }
  if (!confirm('총괄매니저가 직원에게 업무를 나눠 맡기고 종합 보고서를 만듭니다. GPT API를 최대 4회 호출하며 사용료가 발생할 수 있습니다. 실행할까요?')) return;
  const job = desk.startGPT();
  if (!job) return;
  const record = {
   parentId: job.id, title: job.title, brief: job.brief, output: job.output, stage: 0,
   parts: Array.from({length: 4}, () => ({ id: crypto.randomUUID(), attempted: false, result: '' }))
  };
  managerRuns[job.id] = record;
  if (!saveManager()) { desk.failGPT(job.id, false); return; }
  runManager(record);
 };
 function renderManagerRecovery(job, card) {
  if (card.querySelector('.db-manager-recovery')) return;
  const record = managerRuns[job.id];
  const block = document.createElement('div'); block.className = 'db-gpt-recovery db-manager-recovery';
  const note = document.createElement('p');
  note.textContent = '총괄 자동 배정이 중단됐습니다. 완료한 단계는 저장됐으며, 이미 요청한 GPT 작업은 재호출하지 않습니다. (' + record.stage + '/4단계)';
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
 document.addEventListener('dongbaek-ai-jobs', () => { renderRecovery(); update(); });
 for (const id of ['db-ai-worker', 'db-ai-service']) $(id).addEventListener('change', update);
 document.addEventListener('click', () => queueMicrotask(update));
 window.addEventListener('pagehide', () => { connected = false; access = ''; $('db-gpt-access').value = ''; });
 window.addEventListener('pageshow', update);
 renderRecovery(); update();
})();
