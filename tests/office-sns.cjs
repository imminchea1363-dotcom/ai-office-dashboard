const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000',ctx=await browser.newContext({serviceWorkers:'block',acceptDownloads:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
  await page.goto(base);
  assert.equal(await page.locator('#db-sns-planner').count(),1);
  await page.selectOption('#db-sns-platform','스레드');
  await page.fill('#db-sns-title','동백팬션 바다 전망');
  await page.fill('#db-sns-caption','실제 바다 사진과 함께 네이버에서 포항 동백팬션 검색');
  await page.click('#db-sns-save');
  assert.match(await page.locator('#db-sns-list').textContent(),/동백팬션 바다 전망/);
  assert.match(await page.locator('#db-sns-list').textContent(),/초안/);
  await page.locator('[data-sns-approve]').click();
  assert.match(await page.locator('#db-sns-list').textContent(),/대표 승인/);
  await page.reload();
  assert.match(await page.locator('#db-sns-list').textContent(),/대표 승인/);
  await page.locator('[data-sns-done]').click();
  assert.match(await page.locator('#db-sns-list').textContent(),/게시 완료/);
  const download=page.waitForEvent('download');await page.click('#db-archive-export');
  const d=await download,blob=fs.readFileSync(await d.path()),archive=JSON.parse(blob.toString('utf8'));
  assert.match(archive.data.sns,/동백팬션 바다 전망/);
  await page.evaluate(()=>localStorage.removeItem('dongbaek-sns-workflow-v1'));
  await page.reload();assert.match(await page.locator('#db-sns-list').textContent(),/등록된 SNS 게시 계획이 없습니다/);
  await page.locator('#db-archive-import').setInputFiles({name:'archive.json',mimeType:'application/json',buffer:blob});
  await page.click('#db-archive-restore');
  await page.waitForFunction(()=>document.querySelector('#db-sns-list')?.textContent.includes('동백팬션 바다 전망'));
  assert.match(await page.locator('#db-sns-list').textContent(),/게시 완료/);
  assert.deepEqual(errors,[]);
  console.log('PASS SNS approval, reload, full archive and restore, no external posting or GPT calls');
 }finally{await ctx.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});