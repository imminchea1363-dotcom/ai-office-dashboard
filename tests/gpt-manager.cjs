const {chromium} = require('playwright');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');

(async () => {
 const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
 const base = process.env.APP_TEST_URL || 'http://localhost:3000';
 const api = 'https://dongbaek-api.imminchea1363.workers.dev';
 const secret = 'mock-office-password-24chars';
 const context = await browser.newContext({viewport:{width:1280,height:860},serviceWorkers:'block',acceptDownloads:true});
 const page = await context.newPage();
 const errors = [], writes = [], reads = [], generated = new Map();
 let interruptSecondRun = false, secondRunCount = 0;
 page.on('pageerror', e => errors.push(e.message));
 page.on('dialog', async dialog => dialog.accept());
 await context.route(api + '/**', async route => {
  const req = route.request(), url = new URL(req.url());
  const headers = {'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  const reply = (data,status=200) => route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if (req.method() === 'OPTIONS') return route.fulfill({status:204,headers});
  if (req.headers().authorization !== 'Bearer ' + secret) return reply({error:'unauthorized',message:'잘못된 암호'},401);
  if (url.pathname === '/api/status') return reply({connected:true,model:'mock',limits:{daily:20,pilot:200},used:{today:0,total:0}});
  if (url.pathname === '/api/jobs') {
   const task = req.postDataJSON();
   writes.push(task);
   const names = ['총괄 업무 배정 결과', '임채리 조사 결과', '김검수 검수 결과', '최종 매니저 보고'];
   const result = names[(writes.length-1) % 4] + ' <img src=x onerror=alert(1)>';
   generated.set(task.id,result);
   if (interruptSecondRun) {
    secondRunCount++;
    if (secondRunCount === 2) return route.abort('failed'); // Simulate lost response after server accepted the job.
   }
   return reply({id:task.id,result,usage:{input_tokens:20,output_tokens:40}});
  }
  if (url.pathname === '/api/result') {
   const id=url.searchParams.get('id');
   reads.push(id);
   return generated.has(id) ? reply({id,result:generated.get(id),reused:true}) : reply({error:'missing_job',message:'없는 요청'},404);
  }
  return reply({error:'not_found'},404);
 });
 async function connect() {
  await page.locator('#db-gpt-settings').evaluate(el => el.open=true);
  await page.fill('#db-gpt-access', secret);
  await page.click('#db-gpt-connect');
  await page.waitForFunction(() => document.querySelector('#db-gpt-status').textContent.includes('연결 준비 완료'));
 }
 try {
  await page.goto(base);
  assert.equal(await page.locator('#db-manager-photo').count(),1,'Poster photo selector must be mounted on load');
  assert.equal(await page.locator('#db-manager-photo').isVisible(),true,'Poster photo selector must be visible to user');
  assert.match(await page.locator('#db-manager-quick-form').textContent(),/실제 사진/);
  assert.equal(await page.locator('#db-manager-run').isDisabled(),true);
  await page.selectOption('#db-ai-worker','2');
  assert.equal(await page.locator('#db-manager-run').isVisible(),false);
  assert.equal(await page.locator('#db-manager-quick-run').isDisabled(),true);
  await page.selectOption('#db-ai-worker','1');
  await page.selectOption('#db-ai-service','chatgpt');
  await connect();
  assert.equal(await page.locator('#db-manager-run').isVisible(),true);
  await page.selectOption('#db-ai-worker','2');
  await page.selectOption('#db-ai-service','claude');
  assert.equal(await page.locator('#db-manager-run').isVisible(),false);
  await page.fill('#db-manager-quick-title','총괄 자동 조사 1');
  await page.fill('#db-manager-quick-brief','가상의 쿠팡 판매상품 후보를 분석해 주세요. 실제 조회는 하지 않습니다.');
  await page.click('#db-manager-quick-run');
  await page.waitForFunction(()=>document.querySelector('#db-manager-quick-progress').textContent.includes('4단계 완료'));
  assert.equal(await page.locator('#db-ai-worker').inputValue(),'1');
  assert.equal(await page.locator('#db-ai-service').inputValue(),'chatgpt');
  assert.equal(await page.locator('#db-ai-title').inputValue(),'총괄 자동 조사 1');
  assert.equal(await page.locator('#db-ai-brief').inputValue(),'가상의 쿠팡 판매상품 후보를 분석해 주세요. 실제 조회는 하지 않습니다.');
  assert.equal(await page.locator('#db-manager-quick-stages li[data-state="done"]').count(),4);
  try { await page.waitForFunction(() => document.querySelector('#db-gpt-status').textContent.includes('총괄 보고서 작성 완료'),null,{timeout:10000}); }
  catch(e) {throw new Error('Manager status: '+await page.locator('#db-gpt-status').textContent()+'; writes='+JSON.stringify(writes.map(x=>x.title))+'; errors='+JSON.stringify(errors)+'; original='+e.message);}
  assert.equal(writes.length,4);
  assert.deepEqual(writes.map(w=>w.title),[
   '동백총괄매니저 · 직원별 업무 배정',
   '임채리사원 · 자료조사 업무',
   '김검수사원 · 자료 검수',
   '동백총괄매니저 · 최종 종합 보고'
  ]);
  assert.match(writes[1].brief,/총괄 업무 배정 결과/);
  assert.match(writes[2].brief,/임채리 조사 결과/);
  assert.match(writes[3].brief,/김검수 검수 결과/);
  assert.match(await page.locator('#db-ai-jobs').textContent(),/임채리 조사 결과/);
  assert.equal(await page.locator('#db-ai-jobs img').count(),0);
  assert.match(await page.locator('.db-ai-badge').first().textContent(),/대표에게 이동 중|보고 완료/,'Manager task must automatically enter representative reporting flow');
  const wordDownload=page.waitForEvent('download');
  await page.locator('[data-ai-docx]').first().click();
  const downloaded=await wordDownload;
  assert.match(downloaded.suggestedFilename(),/\.docx$/);
  const bytes=fs.readFileSync(await downloaded.path());
  assert.equal(bytes[0],80);assert.equal(bytes[1],75);
  execFileSync('python3',['-c',"import zipfile,sys,xml.etree.ElementTree as ET; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert '[Content_Types].xml' in z.namelist(); assert 'word/document.xml' in z.namelist(); ET.fromstring(z.read('word/document.xml')); ET.fromstring(z.read('word/styles.xml'))",await downloaded.path()]);
  const binary=bytes.toString('utf8');
  assert.match(binary,/word\/document\.xml/);
  assert.match(binary,/임채리사원 자료조사/);
  assert.match(binary,/최종 매니저 보고/);
  assert.doesNotMatch(binary,/총괄매니저 업무 배정 기록/);
  const saved=await page.evaluate(()=>JSON.stringify({...localStorage}));
  assert.ok(!saved.includes(secret));
  await page.waitForFunction(() => document.querySelector('.db-ai-badge')?.textContent === '보고 완료', null, {timeout:45000});
  assert.equal(await page.locator('#db-completed').textContent(),'1','Office must count the finished representative report');
  await page.reload();
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'보고 완료','Completed representative report must survive reload');
  assert.match(await page.locator('#db-ai-jobs').textContent(),/최종 매니저 보고/);
  await connect();
  interruptSecondRun=true;
  await page.fill('#db-ai-title','총괄 자동 조사 2');
  await page.click('#db-manager-run');
  await page.waitForFunction(() => document.querySelector('.db-manager-recovery'));
  assert.equal(await page.locator('.db-ai-badge').first().textContent(),'결과 확인 필요');
  assert.equal(writes.length,6);
  await page.reload();
  assert.equal(await page.locator('.db-manager-recovery').count(),1);
  await connect();
  interruptSecondRun=false;
  await page.locator('.db-manager-recovery button').click();
  await page.waitForFunction(() => document.querySelector('#db-gpt-status').textContent.includes('총괄 보고서 작성 완료'));
  assert.equal(reads.length,1);
  assert.equal(writes.length,8,'An uncertain GPT stage must be recovered without repeating its paid POST');
  assert.match(await page.locator('.db-ai-task').first().textContent(),/최종 매니저 보고/);
  await page.fill('#db-manager-quick-title','동백팬션 디자인 썸네일');
  await page.fill('#db-manager-quick-brief','반려견과 바다 전망을 강조한 SNS 썸네일 디자인 기획안을 만들어 주세요.');
  assert.match(await page.locator('#db-manager-quick-run').textContent(),/5회/);
  await page.click('#db-manager-quick-run');
  await page.waitForFunction(()=>document.querySelector('#db-manager-quick-progress').textContent.includes('5단계 완료'),null,{timeout:12000});
  assert.equal(writes.length,13,'Design task requires 5 calls: status='+await page.locator('#db-gpt-status').textContent()+'; quick='+await page.locator('#db-manager-quick-progress').textContent()+'; errors='+JSON.stringify(errors));
  assert.deepEqual(writes.slice(8).map(w=>w.title),[
    '동백총괄매니저 · 직원별 업무 배정',
    '임채리사원 · 자료조사 업무',
    '임민채대리 · 디자인 기획',
    '김검수사원 · 자료 검수',
    '동백총괄매니저 · 최종 종합 보고'
  ]);
  assert.match(await page.locator('.db-ai-task').first().textContent(),/임민채대리 디자인 기획/);
  const finalReport=await page.locator('.db-ai-task').first().textContent();
  assert.match(finalReport,/## 총괄매니저 최종 보고[\s\S]*최종 매니저 보고/,'Design report must include the final manager synthesis, not the QA step in its place');
  assert.equal(await page.locator('#db-manager-quick-stages li').count(),5);
  await page.waitForSelector('[data-poster-download]');
  const pngDownload=page.waitForEvent('download');
  await page.locator('[data-poster-download]').first().click();
  const poster=await pngDownload;
  assert.ok(poster.suggestedFilename().endsWith('.png'));
  const png=fs.readFileSync(await poster.path());
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10],'must be a real PNG file');
  assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
  await page.reload();
  await page.waitForSelector('[data-poster-download]');
  assert.equal(await page.locator('[data-poster-download]').count(),1,'PNG survives refresh in IndexedDB');
  await page.locator('.db-poster-result details').first().evaluate(el=>el.open=true);
  await page.locator('.db-poster-result input[type=text]').first().fill('강아지와 함께하는 바다 여행');
  await page.locator('.db-poster-result button').last().click();
  await page.waitForSelector('[data-poster-download]');
  assert.deepEqual(errors,[]);
  console.log('PASS manager browser: role routing, four mocked GPT jobs, report aggregation, HTML safety, local persistence, no credential storage, interrupted-response recovery without double charge');
 } finally {await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
