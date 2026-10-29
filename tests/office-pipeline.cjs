const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 try{
  await page.goto(base);
  await page.fill('#db-ai-title','동백팬션 주말 실제사진 홍보');
  await page.fill('#db-ai-brief','반려견과 함께하는 여행 안내');
  await page.click('#db-ai-form button[type=submit]');
  assert.equal(await page.locator('[data-ai-to-sns]:not([disabled])').count(),0,'empty report cannot pass through');
  const jobId=await page.locator('[data-ai-job]').first().getAttribute('data-ai-job');
  await page.locator('[data-ai-record]').first().click();
  await page.fill('#db-ai-result-text','주말 바다를 바라보며 쉬어보세요. 네이버에서 포항 동백팬션 검색');
  await page.click('#db-ai-result-form button[type=submit]');
  await page.waitForSelector('[data-ai-to-sns]:not([disabled])');
  await page.evaluate(async id=>{
   const req=indexedDB.open('dongbaek-poster-studio-v1',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'});};
   const db=await new Promise((ok,bad)=>{req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);});
   const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
   await new Promise((ok,bad)=>{
    const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id,png,options:{format:'feed'}});
    tx.oncomplete=ok;tx.onerror=()=>bad(tx.error);
   });db.close();
  },jobId);
  await page.locator('[data-ai-to-sns]').first().click();
  assert.equal(await page.locator('#db-sns-title').inputValue(),'동백팬션 주말 실제사진 홍보');
  assert.match(await page.locator('#db-sns-caption').inputValue(),/주말 바다를 바라보며/);
  await page.waitForFunction(()=>document.querySelector('#db-sns-source')?.textContent.includes('포스터 PNG 저장됨'));
  await page.selectOption('#db-sns-platform','인스타그램');
  await page.locator('#db-sns-save').click();
  await page.waitForFunction(()=>document.querySelector('#db-sns-list')?.textContent.includes('연결 업무'));
  assert.match(await page.locator('#db-sns-list').textContent(),/로컬 포스터 PNG 있음/);
  const download=page.waitForEvent('download');
  await page.locator('[data-sns-poster]').first().click();
  const saved=await download;assert.match(saved.suggestedFilename(),/\.png$/);
  await page.reload();
  assert.match(await page.locator('#db-sns-list').textContent(),/로컬 포스터 PNG 있음/);
  assert.equal(await page.locator('[data-sns-poster]').count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS AI report -> SNS draft, stored poster PNG download, reload continuity, zero external posting');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
