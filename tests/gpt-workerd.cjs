/* Real workerd + D1, with all external generation replaced by a mock agent. */
const { Miniflare, createFetchMock, Log, LogLevel } = require('miniflare');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const origin = 'https://imminchea1363-dotcom.github.io';
const password = 'mock-only-office-access-password-24';
(async () => {
 const agent = createFetchMock(); agent.disableNetConnect();
 agent.get('https://openai.mock').intercept({path:'/probe',method:'GET'}).reply(200,'OK').persist();
 const probe = new Miniflare({ modules:true, compatibilityDate:'2026-08-01', fetchMock:agent, script:`export default {async fetch(request){try{const mode=new URL(request.url).searchParams.get('mode');const result=await fetch('https://openai.mock/probe',{redirect:mode});return Response.json({mode,status:result.status});}catch(error){return Response.json({name:error.name,message:error.message},{status:500});}}}` });
 try { for (const mode of ['error','manual','follow']) { const r=await probe.dispatchFetch('https://probe.test/?mode='+mode); console.log('RUNTIME_REDIRECT '+JSON.stringify({mode,status:r.status,body:await r.json()})); } }
 finally { await probe.dispose(); }
 let calls=0;
 const outbound=createFetchMock();outbound.disableNetConnect();
 outbound.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST'}).reply(200,()=>{calls++;return JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'모의 GPT 결과'}]}],usage:{input_tokens:10,output_tokens:10}});}).persist();
 let source=fs.readFileSync(path.join(__dirname,'../server/worker.mjs'),'utf8');
 // Logs only the mock execution error. No user key or production state is used.
 source=source.replace('} catch (error) {\n    await env.DB', '} catch (error) {\n    console.error("RUNTIME_FAILURE",error.name,error.message);\n    await env.DB');
 const runtime=new Miniflare({ modules:true, compatibilityDate:'2026-08-01',script:source,fetchMock:outbound,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'sk-mock-not-a-real-key',OFFICE_ACCESS_TOKEN:password},log:new Log(LogLevel.INFO) });
 const headers={Origin:origin,Authorization:'Bearer '+password,'Content-Type':'application/json'};
 try {
  let r=await runtime.dispatchFetch('https://worker.test/api/status',{headers});assert.equal(r.status,200);console.log('RUNTIME_STATUS '+await r.text());
  const task={id:crypto.randomUUID(),title:'연결 테스트',brief:'한 문장으로 인사해 주세요.',output:'보고서'};
  r=await runtime.dispatchFetch('https://worker.test/api/jobs',{method:'POST',headers,body:JSON.stringify(task)});
  const result=await r.json();console.log('RUNTIME_GENERATE '+JSON.stringify({status:r.status,result,calls}));
  assert.equal(r.status,200);assert.equal(result.result,'모의 GPT 결과');assert.equal(calls,1);
  r=await runtime.dispatchFetch('https://worker.test/api/result?id='+task.id,{headers});assert.equal(r.status,200);assert.equal(calls,1);
  console.log('PASS actual Cloudflare workerd: D1 schema, authentication, single mocked Responses request and result recovery');
 }finally{await runtime.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
