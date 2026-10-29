const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1100},serviceWorkers:'block',acceptDownloads:true});
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(base).origin});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();await page.goto(base);
  const expected={chatgpt:'https://chatgpt.com/',runway:'https://app.runwayml.com/',microsoft:'https://www.microsoft365.com/',higgsfield:'https://higgsfield.ai/',metricool:'https://app.metricool.com/',canva:'https://www.canva.com/',capcut:'https://www.capcut.com/',claude:'https://claude.ai/'};
  assert.equal(await page.locator('[data-ai-service-link]').count(),8);
  for(const [id,url]of Object.entries(expected)){
   const link=page.locator('[data-ai-service-link='+id+']');
   assert.equal(await link.getAttribute('href'),url);assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);
  }
  await page.selectOption('#db-ai-worker','2');assert.equal(await page.locator('#db-ai-service').inputValue(),'claude');
  await page.selectOption('#db-ai-service','runway');
  await page.fill('#db-ai-title','주말 행사 안내');
  await page.fill('#db-ai-brief','가족 방문객을 위한 안내문. <img src=x onerror=alert(1)>는 텍스트로 유지.');
  await page.selectOption('#db-ai-output','홍보 문구');
  await page.click('#db-ai-copy');
  await page.waitForFunction(()=>document.querySelector('#db-ai-status').textContent.includes('복사했습니다'));
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(copied,/임채리사원/);assert.match(copied,/주말 행사 안내/);assert.match(copied,/홍보 문구/);
  assert.equal(await page.locator('#db-ai-jobs img').count(),0);
  assert.match(await page.locator('.db-ai-badge').textContent(),/지시문 복사됨/);
  assert.equal(await page.evaluate(()=>DongbaekOffice.busy()),false);
  // Intercept the external destination: opening a web app never sends the brief.
  await context.route('https://app.runwayml.com/**',route=>route.fulfill({contentType:'text/html',body:'<title>Web handoff check</title>'}));
  const popupPromise=page.waitForEvent('popup');await page.click('#db-ai-open');const popup=await popupPromise;
  await popup.waitForLoadState();assert.equal(popup.url(),expected.runway);await popup.close();
  await page.locator('[data-ai-record]').click();
  await page.fill('#db-ai-result-text','실제 서비스에서 받은 결과입니다. <svg onload=alert(1)>');
  await page.fill('#db-ai-result-url','javascript:alert(1)');await page.locator('#db-ai-result-form button[type=submit]').click();
  assert.equal(await page.locator('#db-ai-result-dialog').evaluate(node=>node.open),true);
  assert.match(await page.locator('#db-ai-result-error').textContent(),/http/);
  await page.fill('#db-ai-result-url','https://www.canva.com/');await page.locator('#db-ai-result-form button[type=submit]').click();
  assert.match(await page.locator('.db-ai-badge').textContent(),/결과 기록됨/);
  await page.reload();
  assert.equal(await page.locator('#db-ai-service').inputValue(),'runway');
  assert.match(await page.locator('#db-ai-jobs').textContent(),/실제 서비스에서 받은 결과/);
  assert.equal(await page.locator('#db-ai-jobs svg').count(),0);
  await page.locator('[data-ai-report]').click();
  assert.match(await page.locator('.db-ai-badge').textContent(),/대표에게 이동 중/);
  assert.equal(await page.locator('#db-completed').textContent(),'0');
  await page.clock.runFor(22000);
  assert.match(await page.locator('.db-ai-badge').textContent(),/보고 완료/);
  assert.equal(await page.locator('#db-completed').textContent(),'1');
  const downloadPromise=page.waitForEvent('download');await page.click('#db-ai-backup');const download=await downloadPromise;
  const data=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(data.jobs.length,1);assert.equal(data.jobs[0].status,'reported');assert.match(data.jobs[0].result,/실제 서비스/);
  await page.locator('#db-roster [data-worker="3"]').click();await page.locator('[data-ai-assign="3"]').click();
  assert.equal(await page.locator('#db-ai-worker').inputValue(),'3');assert.equal(await page.locator('#db-ai-service').inputValue(),'canva');
  await page.fill('#db-ai-title','행사 포스터');await page.locator('#db-ai-form button[type=submit]').click();
  await page.locator('[data-ai-record]').first().click();await page.fill('#db-ai-result-text','포스터 결과');await page.locator('#db-ai-result-form button[type=submit]').click();
  await page.locator('[data-ai-report]').first().click();await page.clock.runFor(1000);await page.click('#db-reset');
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'결과 기록됨');
  assert.match(await page.locator('#db-ai-jobs').textContent(),/포스터 결과/);
  const previews=path.resolve(__dirname,'../previews');fs.mkdirSync(previews,{recursive:true});
  const desktop=await page.locator('#db-ai-form').screenshot({type:'jpeg',quality:60});
  fs.writeFileSync(path.join(previews,'ai-desk-desktop.jpg'),desktop);
  console.log('AI_DESK_IMAGE:'+JSON.stringify({scene:'ai-desk',base64:desktop.toString('base64')}));
  await page.setViewportSize({width:390,height:844});await page.locator('#db-ai-desk').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#db-ai-desk').screenshot({path:path.join(previews,'ai-desk-mobile.png')});
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('blocked');}},configurable:true});document.execCommand=()=>false;});
  await page.click('#db-ai-copy');await page.waitForFunction(()=>document.querySelector('#db-ai-status').textContent.includes('직접 복사'));
  assert.deepEqual(errors,[]);await context.close();
  // Storage denial must keep a usable session without claiming durable saving.
  const denied=await browser.newContext({serviceWorkers:'block'});await denied.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Storage unavailable','QuotaExceededError');};});
  const local=await denied.newPage();const localErrors=[];local.on('pageerror',error=>localErrors.push(error.message));await local.goto(base);
  await local.fill('#db-ai-title','저장 제한 확인');await local.fill('#db-ai-brief','이번 실행에서 유지되는 업무');await local.locator('#db-ai-form button[type=submit]').click();
  assert.equal(await local.locator('[data-ai-job]').count(),1);assert.match(await local.locator('#db-ai-status').textContent(),/브라우저 저장이 제한/);assert.deepEqual(localErrors,[]);await denied.close();
  console.log('PASS AI desk: eight official links, employee tool choice, clipboard, user-directed popup without prompt in URL, safe result text/links, persistent tasks, report completion after movement, reset recovery, real backup download, clipboard/storage denial, mobile width');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
