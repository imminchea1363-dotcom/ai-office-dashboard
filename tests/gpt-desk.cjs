const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
 try {
  const base = process.env.APP_TEST_URL || 'http://localhost:3000';
  const context = await browser.newContext({viewport:{width:1500,height:1100},serviceWorkers:'block'});
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  const secret = 'mock-office-password-24chars', api = 'https://dongbaek-api.imminchea1363.workers.dev';
  let mode = 'success', pendingId;
  await context.route(api + '/**', async route => {
   const req = route.request(), url = new URL(req.url());
   const headers = {'Access-Control-Allow-Origin':new URL(base).origin, 'Access-Control-Allow-Headers':'Authorization, Content-Type', 'Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
   if (req.method() === 'OPTIONS') return route.fulfill({status:204,headers});
   requests.push({path:url.pathname,method:req.method(),auth:req.headers().authorization,body:req.postDataJSON()});
   const respond = (data,status=200) => route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
   if (req.headers().authorization !== 'Bearer ' + secret) return respond({error:'unauthorized',message:'사무실 접속 암호가 맞지 않습니다.'},401);
   if (url.pathname === '/api/status') return respond({connected:true,model:'gpt-4.1-mini',limits:{daily:20,pilot:200},used:{today:0,total:0}});
   if (url.pathname === '/api/jobs') {
    pendingId = req.postDataJSON().id;
    if (mode === 'network-failure') return route.abort('failed');
    if (mode === 'quota') return respond({error:'daily_limit',message:'오늘의 20회 한도에 도달했습니다.'},429);
    return respond({id:pendingId,result:'GPT 실제 결과 형식 <img src=x onerror=alert(1)>',usage:{input_tokens:50,output_tokens:70}});
   }
   if (url.pathname === '/api/result') return respond({id:pendingId,result:'복구한 GPT 결과',usage:{input_tokens:50,output_tokens:70},reused:true});
   return respond({error:'not_found'},404);
  });
  await page.goto(base);
  assert.equal(await page.locator('#db-gpt-run').isDisabled(),true); assert.equal(requests.length,0);
  await page.fill('#db-gpt-access','sk-this-is-not-an-office-password'); await page.click('#db-gpt-connect');
  assert.match(await page.locator('#db-gpt-status').textContent(),/API 키는 여기에/); assert.equal(requests.length,0);
  await page.fill('#db-gpt-access','wrong-password-at-least-20chars'); await page.click('#db-gpt-connect');
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('맞지 않습니다'));
  assert.equal(await page.locator('#db-gpt-run').isDisabled(),true);
  async function connect() { await page.locator('#db-gpt-settings').evaluate(node=>node.open=true); await page.fill('#db-gpt-access',secret); await page.click('#db-gpt-connect'); await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('서버 인증 확인')); }
  await connect(); assert.equal(await page.locator('#db-gpt-access').inputValue(),'');
  assert.equal(requests.filter(r=>r.path==='/api/jobs').length,0);
  await page.selectOption('#db-ai-worker','2'); assert.equal(await page.locator('#db-gpt-run').isVisible(),true); assert.equal(await page.locator('#db-manager-run').isVisible(),false);
  await page.selectOption('#db-ai-worker','1'); await page.selectOption('#db-ai-service','chatgpt');
  await page.fill('#db-ai-title','GPT 홍보글'); await page.fill('#db-ai-brief','제공된 사실만 사용해서 짧게 작성해주세요.');
  await page.click('#db-gpt-run'); await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('작업 완료'));
  assert.equal(requests.filter(r=>r.path==='/api/jobs').length,1);
  assert.match(await page.locator('#db-ai-jobs').textContent(),/GPT 실제 결과 형식/); assert.equal(await page.locator('#db-ai-jobs img').count(),0);
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'결과 기록됨');
  const storage = await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})); assert.ok(!storage.includes(secret));
  await page.reload(); assert.match(await page.locator('#db-ai-jobs').textContent(),/GPT 실제 결과 형식/); assert.equal(await page.locator('#db-gpt-run').isDisabled(),true);
  await connect(); mode='network-failure'; await page.fill('#db-ai-title','통신 끊김 확인'); await page.click('#db-gpt-run');
  await page.waitForFunction(()=>document.querySelector('[data-gpt-recover]'));
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'결과 확인 필요');
  const posts = requests.filter(r=>r.path==='/api/jobs').length;
  await page.reload(); assert.equal(await page.locator('[data-gpt-recover]').count(),1);
  await connect(); await page.locator('[data-gpt-recover]').click();
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('저장된 GPT 결과'));
  assert.equal(requests.filter(r=>r.path==='/api/jobs').length,posts); assert.match(await page.locator('#db-ai-jobs').textContent(),/복구한 GPT 결과/);
  mode='quota'; await page.fill('#db-ai-title','한도 확인'); await page.click('#db-gpt-run');
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('20회 한도'));
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'GPT 실행 종료');
  assert.equal(requests.filter(r=>r.path==='/api/jobs').length,posts+1);
  const previews=path.resolve(__dirname,'../previews');fs.mkdirSync(previews,{recursive:true});
  await page.locator('#db-gpt-panel').screenshot({path:path.join(previews,'gpt-panel-desktop.png')});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#db-gpt-panel').screenshot({path:path.join(previews,'gpt-panel-mobile.png')});
  await page.locator('#db-gpt-settings > summary').click();
  await page.click('#db-gpt-disconnect'); assert.equal(await page.locator('#db-gpt-run').isDisabled(),true);
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS GPT browser: disconnected by default, rejects API keys as login, real auth flow with mocked backend, employee eligibility, user-triggered execution, safe result storage, no stored password, reload recovery without repeated billing, quota error, manual handoff preserved, mobile layout');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
