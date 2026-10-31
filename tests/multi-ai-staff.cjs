const a=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000',api='https://dongbaek-api.imminchea1363.workers.dev';
 const pass='manual-office-secret-01234567890123456';
 const context=await browser.newContext({serviceWorkers:'block'});
 const calls=[];
 await context.route(api+'/**',route=>{
  const req=route.request(),u=new URL(req.url()),headers={'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  a.equal(req.headers().authorization,'Bearer '+pass);
  const fulfill=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname==='/api/status')return fulfill({connected:true,model:'gpt-4.1-mini',providers:{
   chatgpt:{configured:true,verified:false,model:'gpt-4.1-mini'},
   gemini:{configured:false,verified:false,model:'gemini-3.8-flash'},
   claude:{configured:true,verified:false,model:'claude-sonnet-5-5'},
   nemotron:{configured:false,verified:false,model:'nvidia/nemotron-3-ultra-550b-a55b'}
  },used:{today:0,total:0},limits:{daily:20,pilot:200}});
  if(u.pathname==='/api/jobs'){
   const request=req.postDataJSON();calls.push(request);
   return fulfill({id:request.id,provider:request.provider,model:'claude-sonnet-5-5',result:'Claude가 작성한 검수용 초안',usage:{input_tokens:30,output_tokens:20}});
  }
  return fulfill({error:'unknown'},404);
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);
  await page.locator('#db-gpt-access').fill(pass);await page.locator('#db-gpt-connect').click();
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('서버 인증 확인'));
  a.match(await page.locator('#db-ai-provider-status').textContent(),/claude 서버 키 등록/);
  a.match(await page.locator('#db-ai-provider-status').textContent(),/gemini 미설정/);
  await page.selectOption('#db-ai-worker','9');await page.selectOption('#db-ai-service','gemini');
  a.equal(await page.locator('#db-gpt-run').isDisabled(),true);
  await page.selectOption('#db-ai-service','claude');
  a.equal(await page.locator('#db-gpt-run').isDisabled(),false);
  await page.fill('#db-ai-title','블로그 내용 정리');
  await page.fill('#db-ai-brief','확인된 자료만 포함하고 검수 초안으로 작성');
  await page.locator('#db-gpt-run').click();
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('실제 응답 수신'));
  a.equal(calls.length,1);a.equal(calls[0].staffId,9);a.equal(calls[0].provider,'claude');
  a.match(await page.locator('#db-ai-provider-status').textContent(),/claude 실제 응답 수신/);
  a.equal(await page.evaluate(()=>DongbaekTeam10Live.snapshot().find(p=>p.id===9).source),'gpt');
  a.match(await page.locator('[data-staff-id="9"] .db-t10-status').textContent(),/결과 기록됨/);
  a.match(await page.locator('#db-ai-jobs').textContent(),/검수용 초안/);
  a.equal(JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes(pass),false);
  a.deepEqual(errors,[]);
  console.log('PASS multi-provider browser: 9th employee selected Claude, unconfigured Gemini disabled, explicit provider/role request, verified model response, no secret stored');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});