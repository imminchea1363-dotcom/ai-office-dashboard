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
 const css = document.createElement('style'); css.textContent = '.db-ai-gpt{padding:18px;border:1px solid #abc3ab;border-radius:10px;background:#eef4e9;margin:16px 0;overflow-wrap:anywhere}.db-ai-gpt h3{margin-top:0}.db-ai-gpt form{margin-top:13px;max-width:620px}.db-ai-gpt p{font-size:12px}.db-ai-gpt input{margin-top:5px}#db-gpt-status{font-weight:600;margin:13px 0 0}.db-gpt-recovery{padding:10px;background:#eef4e9;border-radius:7px;margin:9px 0}.db-ai-gpt summary{cursor:pointer}#db-gpt-run[hidden]{display:none}'; document.head.append(css);
 const run = document.createElement('button'); run.type = 'button'; run.id = 'db-gpt-run'; run.className = 'db-ai-primary'; run.textContent = 'GPT로 실행 · 사용료 발생';
 $('db-ai-form').querySelector('.db-ai-actions').prepend(run);
 const message = text => { $('db-gpt-status').textContent = text; };
 function update() {
  const eligible = $('db-ai-worker').value === '1' && $('db-ai-service').value === 'chatgpt';
  run.hidden = !eligible; run.disabled = !connected || busy || desk.pendingGPT().length > 0;
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
 function renderRecovery() {
  for (const job of desk.pendingGPT()) {
   const card = [...document.querySelectorAll('[data-ai-job]')].find(node => node.dataset.aiJob === job.id);
   if (!card || card.querySelector('.db-gpt-recovery')) continue;
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
