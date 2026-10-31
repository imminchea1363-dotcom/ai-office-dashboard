/* Real workerd + D1, with all external generation replaced by a mock agent. */
const { Miniflare, createFetchMock, Log, LogLevel } = require('miniflare');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = 'https://imminchea1363-dotcom.github.io';
const password = 'mock-only-office-access-password-24';
const hermesPassword = 'mock-only-hermes-agent-password-32-characters';
(async () => {
 const agent = createFetchMock(); agent.disableNetConnect();
 agent.get('https://openai.mock').intercept({path:'/probe',method:'GET'}).reply(200,'OK').persist();
 const probe = new Miniflare({ modules:true, compatibilityDate:'2026-08-01', fetchMock:agent, script:`export default {async fetch(request){try{const mode=new URL(request.url).searchParams.get('mode');const result=await fetch('https://openai.mock/probe',{redirect:mode});return Response.json({mode,status:result.status});}catch(error){return Response.json({name:error.name,message:error.message},{status:500});}}}` });
 try { for (const mode of ['error','manual','follow']) { const r=await probe.dispatchFetch('https://probe.test/?mode='+mode); console.log('RUNTIME_REDIRECT '+JSON.stringify({mode,status:r.status,body:await r.json()})); } }
 finally { await probe.dispose(); }
 let calls=0;
 const outbound=createFetchMock();outbound.disableNetConnect();
 outbound.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST'}).reply(200,()=>{calls++;return JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'모의 GPT 결과'}]}],usage:{input_tokens:10,output_tokens:10}});}).persist();
 const scriptPath=path.join(__dirname,'../server/worker.mjs');
 const runtime=new Miniflare({ modules:true, compatibilityDate:'2026-08-01',scriptPath,fetchMock:outbound,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'sk-mock-not-a-real-key',OFFICE_ACCESS_TOKEN:password,HERMES_AGENT_TOKEN:hermesPassword},log:new Log(LogLevel.INFO) });
 const headers={Origin:origin,Authorization:'Bearer '+password,'Content-Type':'application/json'};
 try {
  let r=await runtime.dispatchFetch('https://worker.test/api/status',{headers});assert.equal(r.status,200);console.log('RUNTIME_STATUS '+await r.text());
  const task={id:crypto.randomUUID(),title:'연결 테스트',brief:'한 문장으로 인사해 주세요.',output:'보고서'};
  r=await runtime.dispatchFetch('https://worker.test/api/jobs',{method:'POST',headers,body:JSON.stringify(task)});
  const result=await r.json();console.log('RUNTIME_GENERATE '+JSON.stringify({status:r.status,result,calls}));
  assert.equal(r.status,200);assert.equal(result.result,'모의 GPT 결과');assert.equal(calls,1);
  r=await runtime.dispatchFetch('https://worker.test/api/result?id='+task.id,{headers});assert.equal(r.status,200);assert.equal(calls,1);
  const mailboxTask={id:crypto.randomUUID(),staffId:3,title:'검수용 SNS 문구',brief:'확인된 내용으로만 초안 작성',output:'문구 초안'};
  r=await runtime.dispatchFetch('https://worker.test/api/hermes/tasks',{method:'POST',headers,body:JSON.stringify(mailboxTask)});
  assert.equal(r.status,201,'Hermes task must be stored in the live D1 runtime');
  const agentHeaders={Authorization:'Bearer '+hermesPassword,'Content-Type':'application/json'};
  r=await runtime.dispatchFetch('https://worker.test/api/hermes/agent/next',{headers:agentHeaders});
  assert.equal(r.status,200);
  const received=(await r.json()).task;
  assert.equal(received.id,mailboxTask.id);
  assert.equal(received.mode,'draft_only');
  r=await runtime.dispatchFetch('https://worker.test/api/hermes/agent/result',{
   method:'POST',headers:agentHeaders,
   body:JSON.stringify({id:received.id,claimToken:received.claimToken,status:'completed',result:'대표 검수 대기 초안'})
  });
  assert.equal(r.status,200);
  r=await runtime.dispatchFetch('https://worker.test/api/hermes/agent/status',{
   method:'POST',headers:agentHeaders,
   body:JSON.stringify({id:received.id,claimToken:received.claimToken})
  });
  assert.equal((await r.json()).received,true);
  r=await runtime.dispatchFetch('https://worker.test/api/hermes/tasks?id='+mailboxTask.id,{headers});
  assert.equal((await r.json()).result,'대표 검수 대기 초안');
  assert.equal(calls,1,'Hermes queue must not trigger OpenAI generation');
  console.log('PASS Hermes actual workerd D1 mailbox: one-shot claim, agent result, authenticated recovery, no GPT billing');
  const phoneTask={id:crypto.randomUUID(),staffId:9,title:'1호에서 업무 전달',brief:'SNS 초안 제작 의뢰',output:'검수용 초안'};
  r=await runtime.dispatchFetch('https://worker.test/api/phone1/agent/dispatch',{
   method:'POST',headers:agentHeaders,body:JSON.stringify(phoneTask)
  });
  assert.equal(r.status,201);
  r=await runtime.dispatchFetch('https://worker.test/api/phone1/inbox',{headers});
  const inbox=await r.json();
  assert.equal(inbox.tasks.length,1);
  assert.equal(inbox.tasks[0].staffId,9);
  r=await runtime.dispatchFetch('https://worker.test/api/phone1/inbox/result',{
   method:'POST',headers,
   body:JSON.stringify({id:phoneTask.id,status:'draft_ready',result:'1호 요청을 받은 사무실 초안'})
  });
  assert.equal(r.status,200);
  assert.equal((await r.json()).reviewStatus,'pending');
  r=await runtime.dispatchFetch('https://worker.test/api/phone1/agent/status?id='+phoneTask.id,{headers:agentHeaders});
  const phoneStatus=await r.json();
  assert.equal(phoneStatus.result,'1호 요청을 받은 사무실 초안');
  assert.equal(phoneStatus.reviewStatus,'pending');
  assert.equal(calls,1,'Phone1 dispatch must not trigger extra GPT calls');
  console.log('PASS phone1 -> office -> phone1 actual workerd D1 round trip without extra GPT calls');

  console.log('PASS actual Cloudflare workerd: D1 schema, authentication, single mocked Responses request and result recovery');
 }finally{await runtime.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
