const a=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000';
 const api='https://dongbaek-api.imminchea1363.workers.dev';
 const secret='test-only-office-secret-123456789012345';
 const jobs=new Map(),posts=[];
 const context=await browser.newContext({viewport:{width:1280,height:1000},serviceWorkers:'block'});
 await context.route(api+'/**',async route=>{
  const request=route.request(),u=new URL(request.url());
  const cors={'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  const respond=(data,status=200)=>route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(data)});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(request.headers().authorization!=='Bearer '+secret)return respond({error:'unauthorized',message:'잘못된 암호'},401);
  if(u.pathname==='/api/hermes/tasks'&&request.method()==='POST'){
   const d=request.postDataJSON();posts.push(d);
   if(!jobs.has(d.id))jobs.set(d.id,{...d,status:'queued'});
   return respond({id:d.id,staffId:d.staffId,status:'queued',mode:'draft_only'},201);
  }
  if(u.pathname==='/api/hermes/tasks'&&request.method()==='GET'){
   const job=jobs.get(u.searchParams.get('id'));
   return job?respond(job):respond({error:'missing_task',message:'not found'},404);
  }
  return respond({error:'not_found'},404);
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base);
  a.equal(await page.locator('#db-hermes-pilot').count(),1);
  await page.fill('#db-hermes-access',secret);
  await page.selectOption('#db-hermes-staff','9');
  await page.fill('#db-hermes-title','스레드 운영 문구 초안');
  await page.fill('#db-hermes-brief','대표에게 보여줄 문구만 작성');
  await page.click('#db-hermes-submit');
  await page.waitForFunction(()=>document.querySelector('#db-hermes-message').textContent.includes('접수했습니다'));
  a.equal(posts.length,1);
  a.equal(posts[0].staffId,9);
  a.equal(posts[0].title,'스레드 운영 문구 초안');
  a.equal(await page.locator('#db-hermes-access').inputValue(),'');
  a.match(await page.locator('[data-staff-id="9"] .db-t10-status').textContent(),/접수 · 실행 전/);
  a.equal(await page.evaluate(()=>DongbaekTeam10Live.snapshot().find(j=>j.id===9).source),'hermes');
  a.doesNotMatch(await page.locator('#db-team10-live').textContent(),/Hermes 완료/);
  const id=posts[0].id;
  jobs.get(id).status='claimed';
  await page.locator('[data-hermes-check]').click();
  await page.waitForFunction(()=>document.querySelector('[data-staff-id="9"] .db-t10-status').textContent.includes('수신됨'));
  jobs.get(id).status='completed';
  jobs.get(id).result='GPT 실제 실행 모의 결과 <img src=x onerror=alert(1)>';
  await page.locator('[data-hermes-check]').click();
  await page.waitForFunction(()=>document.querySelector('[data-staff-id="9"] .db-t10-status').textContent.includes('초안 도착'));
  a.match(await page.locator('#db-hermes-entries').textContent(),/실제 실행 모의 결과/);
  a.equal(await page.locator('#db-hermes-entries img').count(),0);
  const storage=await page.evaluate(()=>JSON.stringify({...localStorage}));
  a.equal(storage.includes(secret),false,'The password must never enter localStorage');
  await page.reload();
  a.equal(await page.locator('[data-hermes-id="'+id+'"]').count(),1);
  a.match(await page.locator('[data-staff-id="9"] .db-t10-status').textContent(),/검수 필요/);
  a.equal(posts.length,1,'Reload must never resubmit a job.');
  a.deepEqual(errors,[]);
  console.log('PASS Hermes UI: authenticated opt-in intake, draft-only status, live staff board, safe rendering, reload, no credential persistence or duplicate execution');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
