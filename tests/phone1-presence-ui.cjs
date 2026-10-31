const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 const api='https://dongbaek-api.imminchea1363.workers.dev';
 const secret='fake-office-password-012345678901234567890';
 const context=await browser.newContext({serviceWorkers:'block'});
 let received=0;
 let response={connection:'never_connected',state:'unknown',ageSeconds:null,lastSeen:null,source:null,taskTitle:null};
 await context.route(api+'/api/phone1/presence',async route=>{
  received++;
  const request=route.request();
  assert.equal(request.headers().authorization,'Bearer '+secret);
  await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':new URL(base).origin},contentType:'application/json',body:JSON.stringify(response)});
 });
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);
  assert.equal(received,0,'Page load must not probe status or use secrets.');
  assert.match(await page.locator('#db-phone1-presence-state').textContent(),/연결 전/);
  await page.fill('#db-phone1-presence-access',secret);
  await page.click('#db-phone1-presence-connect');
  await page.waitForFunction(()=>document.querySelector('#db-phone1-presence-state').textContent.includes('연결 이력 없음'));
  assert.equal(await page.locator('#db-phone1-presence-access').inputValue(),'');
  assert.equal(received,1);
  response={connection:'online',state:'working',taskTitle:'실제 원본 영상 분석',source:'hermes_runtime',ageSeconds:2,lastSeen:Date.now()};
  await page.reload();
  assert.match(await page.locator('#db-phone1-presence-state').textContent(),/연결 전/);
  assert.equal(await page.locator('#db-phone1-presence-access').inputValue(),'');
  assert.equal(JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes(secret),false);
  await page.fill('#db-phone1-presence-access',secret);await page.click('#db-phone1-presence-connect');
  await page.waitForFunction(()=>document.querySelector('#db-phone1-presence-state').textContent.includes('실제 업무 중'));
  assert.match(await page.locator('#db-phone1-presence-detail').textContent(),/실제 원본 영상 분석/);
  response={connection:'stale',state:'unknown',taskTitle:null,source:'hermes_runtime',ageSeconds:130,lastSeen:Date.now()-130000};
  await page.locator('#db-phone1-presence-disconnect').click();
  await page.fill('#db-phone1-presence-access',secret);await page.click('#db-phone1-presence-connect');
  await page.waitForFunction(()=>document.querySelector('#db-phone1-presence-state').textContent.includes('연결 상태 확인 필요'));
  assert.doesNotMatch(await page.locator('#db-phone1-presence-state').textContent(),/업무 중/);
  await page.locator('#db-phone1-presence-disconnect').click();
  assert.match(await page.locator('#db-phone1-presence-state').textContent(),/연결 이력 없음/);
  assert.deepEqual(errors,[]);
  console.log('PASS phone1 presence browser: no fictional work, real working signals, stale fallback, opt-in auth and no persisted credentials');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});