const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 try{
  await page.goto(process.env.APP_TEST_URL||'http://127.0.0.1:3000');
  await page.selectOption('#db-ai-worker','3');await page.selectOption('#db-ai-output','영상 · 자막');
  await page.fill('#db-ai-title','영상 검수 회귀 확인');await page.fill('#db-ai-brief','실제 소스로 제작하고 대표 검수 후 초안 연결');
  await page.click('#db-ai-form button[type=submit]');
  const job=await page.locator('[data-ai-video-job]').first().getAttribute('data-ai-video-job');
  await page.locator('[data-ai-video-job]').first().click();
  await page.locator('#db-video-files').setInputFiles(path.resolve('assets/office-background.png'));
  await page.selectOption('#db-video-format','webm');await page.click('#db-video-render');
  await page.waitForFunction(()=>!document.querySelector('#db-video-save').disabled,null,{timeout:65000});
  await page.click('#db-video-save');await page.waitForSelector('[data-video-review-job]');
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dongbaek-ai-desk-v1')).jobs[0]);
  assert.equal(saved.videoReview,'pending');const videoId=saved.videoId;
  await page.click('#db-video-to-sns');await page.waitForFunction(()=>document.querySelector('#db-video-status').textContent.includes('검수 승인'));assert.equal(await page.locator('#db-sns-title').inputValue(),'');
  await page.evaluate(id=>document.dispatchEvent(new CustomEvent('dongbaek-video-to-sns',{detail:{videoId:id}})),videoId);
  await page.waitForFunction(()=>document.querySelector('#db-sns-info')?.textContent.includes('승인')||document.body.textContent.includes('대표실 영상 검수 승인 후'));
  assert.equal(await page.locator('#db-sns-title').inputValue(),'');
  await page.click('[data-video-review-preview]');await page.locator('[data-video-review-job] video').evaluate(v=>v.play());
  await page.waitForFunction(()=>document.querySelector('[data-video-review-job] video').currentTime>0);
  await page.click('[data-video-review-approve]');assert.equal(await page.locator('[data-ai-to-sns]').isDisabled(),true);
  await page.fill('[data-video-review-note]','마지막 문구 수정');await page.click('[data-video-review-revise]');await page.reload();
  assert.match(await page.locator('#db-video-review-queue').textContent(),/마지막 문구 수정/);
  await page.evaluate(({job,videoId})=>document.dispatchEvent(new CustomEvent('dongbaek-video-job-completed',{detail:{jobId:job,videoId}})),{job,videoId});
  await page.waitForFunction(()=>document.querySelector('#db-video-review-queue').textContent.includes('검수 대기'));
  await page.check('[data-video-review-check]');await page.click('[data-video-review-approve]');
  await page.waitForFunction(()=>document.querySelector('#db-video-review-queue').textContent.includes('승인 완료'));
  await page.click('[data-ai-to-sns]');await page.waitForFunction(()=>document.querySelector('#db-sns-source').textContent.includes('완성 영상 보관함 연결'));await page.click('#db-sns-save');await page.waitForSelector('[data-sns-video]');
  assert.equal(await page.locator('[data-sns-video]').count(),1);
  await page.reload();assert.equal(await page.locator('[data-sns-video]').count(),1);
  assert.equal(posts.length,0);assert.deepEqual(errors,[]);
  console.log('PASS video review: real render/playback, pending gate, revision/reload/resubmit, approval, SNS video attachment/reload, zero POST');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
