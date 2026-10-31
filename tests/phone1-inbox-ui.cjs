const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 const api='https://dongbaek-api.imminchea1363.workers.dev';
 const secret='test-only-office-password-01234567890123';
 const taskId='12345678-1234-4234-8234-123456789012';
 const task={id:taskId,staffId:9,title:'1호 동백대리 지시',brief:'확인된 문구로 SNS 초안 작성',output:'검수용 문구',status:'queued',source:'phone1'};
 const context=await browser.newContext({serviceWorkers:'block'});
 const requests=[];
 await context.route(api+'/**',async route=>{
  const request=route.request();const url=new URL(request.url());
  const headers={'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  requests.push({method:request.method(),path:url.pathname});
  assert.equal(request.headers().authorization,'Bearer '+secret);
  const respond=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(url.pathname==='/api/phone1/inbox'&&request.method()==='GET')return respond({tasks:[task]});
  if(url.pathname==='/api/phone1/inbox/result'&&request.method()==='POST'){
   const d=request.postDataJSON();assert.equal(d.id,taskId);assert.equal(d.status,'draft_ready');
   assert.match(d.result,/촬영된 영상 원본/);
   task.status='draft_ready';task.result=d.result;
   return respond({id:taskId,status:'draft_ready',reviewStatus:'pending'});
  }
  return respond({error:'not_found'},404);
 });
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.clock.install();
  await page.goto(base);
  assert.equal(requests.length,0,'No request before explicit user action');
  assert.equal(await page.locator('#db-phone1-inbox').count(),1);
  await page.locator('#db-p1-inbox-access').fill(secret);
  await page.locator('#db-p1-inbox-check').click();
  await page.waitForFunction(()=>document.querySelector('#db-p1-inbox-status').textContent.includes('1건'));
  assert.equal(await page.locator('[data-phone1-task]').count(),1);
  assert.match(await page.locator('[data-staff-id="9"] .db-t10-status').textContent(),/1호 업무 지시 접수/);
  assert.equal(await page.evaluate(()=>DongbaekTeam10Live.snapshot().find(w=>w.id===9).source),'phone1');
  assert.equal(await page.locator('#db-p1-inbox-access').inputValue(),'');
  const autoRead=page.waitForResponse(response=>response.url().includes('/api/phone1/inbox')&&response.request().method()==='GET');
  await page.clock.fastForward(30001);
  await autoRead;
  assert.equal(requests.filter(r=>r.method==='GET').length,2,'Authenticated phone1 inbox should poll read-only after 30 seconds');
  await page.locator('[data-phone1-reply] textarea').fill('촬영된 영상 원본을 기준으로 작성한 SNS 초안');
  await page.locator('[data-phone1-reply] button').click();
  await page.waitForFunction(()=>document.querySelector('#db-p1-inbox-status').textContent.includes('1호에 결과'));
  assert.match(await page.locator('[data-staff-id="9"] .db-t10-status').textContent(),/검수 필요/);
  assert.equal(requests.filter(x=>x.method==='POST').length,1,'No extra uploads/retries');
  assert.equal(await page.locator('#db-p1-inbox-list img').count(),0);
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.equal(stored.includes(secret),false,'No credential persistence');
  await page.reload();
  assert.equal(await page.locator('[data-phone1-task]').count(),0,'No false saved server receipt on new session');
  assert.equal(requests.length,3,'No silent retry or polling after reload');
  assert.deepEqual(errors,[]);
  console.log('PASS phone1 inbox browser: explicit receipt, 10-person task status, draft return, no auto-execution, no key storage or duplicate send');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});