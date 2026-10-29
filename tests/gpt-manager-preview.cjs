const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();const errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('workers.dev')||r.url().includes('api.openai.com'))remote.push(r.url())});
 page.on('dialog',d=>d.accept());
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 try{
  await page.goto(base+'preview/manager-mvp/');
  await page.waitForSelector('#db-manager-run');
  await page.selectOption('#db-ai-worker','1');
  await page.selectOption('#db-ai-service','chatgpt');
  await page.fill('#db-ai-title','모의 상품 조사');
  await page.fill('#db-ai-brief','상품 10개 조사 테스트');
  assert.equal(await page.locator('#db-manager-run').isDisabled(),false);
  await page.click('#db-manager-run');
  await page.waitForFunction(()=>document.querySelector('#db-gpt-status').textContent.includes('총괄 보고서 작성 완료'),null,{timeout:15000});
  assert.match(await page.locator('#db-ai-jobs').textContent(),/김검수 사원/);
  assert.match(await page.locator('#db-ai-jobs').textContent(),/모의 최종 보고/);
  assert.equal(remote.length,0);
  assert.deepEqual(errors,[]);
  const keys=await page.evaluate(()=>Object.keys(localStorage));
  assert.ok(keys.includes('dongbaek-preview-manager-ai-desk-v1'));
  assert.equal(keys.includes('dongbaek-ai-desk-v1'),false);
  console.log('PASS isolated preview: manager delegates and saves mock report without external API calls or production storage keys');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});