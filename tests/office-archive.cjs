const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const base=process.env.APP_TEST_URL||'http://localhost:3000',context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.accept());
 try{
  await page.goto(base);
  assert.equal(await page.locator('#db-archive').count(),1);
  await page.fill('#db-ai-title','포항 동백팬션 특별 홍보');
  await page.fill('#db-ai-brief','바다 전망을 활용한 실제 사진 포스터');
  await page.click('#db-ai-form button[type=submit]');
  const id=await page.locator('[data-ai-job]').first().getAttribute('data-ai-job');
  const entry=await page.evaluate(async id=>{
   const db=await new Promise((yes,no)=>{const req=indexedDB.open('dongbaek-poster-studio-v1',1);req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error);req.onupgradeneeded=()=>{req.result.createObjectStore('files',{keyPath:'id'});};});
   const pic=new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],'sample.png',{type:'image/png'});
   const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
   await new Promise((yes,no)=>{const tx=db.transaction('files','readwrite');tx.oncomplete=yes;tx.onerror=()=>no(tx.error);tx.objectStore('files').put({id,title:'포항 동백팬션 특별 홍보',photos:[pic],photo:pic,selectedIndex:0,design:{headline:'여행'},options:{format:'feed'},png});});db.close();return id;
  },id);
  assert.equal(entry,id);
  await page.waitForSelector('#db-archive-count');
  await page.fill('#db-archive-search','절대 없을 문구');
  assert.equal(await page.locator('[data-ai-job]').first().isVisible(),false);
  await page.fill('#db-archive-search','동백팬션');
  assert.equal(await page.locator('[data-ai-job]').first().isVisible(),true);
  const download=page.waitForEvent('download');await page.click('#db-archive-export');const archive=await download;
  const backupFile=await archive.path(),payload=JSON.parse(fs.readFileSync(backupFile,'utf8'));
  assert.equal(payload.version,1);assert.equal(payload.data.desk.includes('포항 동백팬션'),true);
  assert.equal(payload.posters.length,1);assert.equal(payload.posters[0].photos.length,1);
  assert.equal(payload.posters[0].png.type,'image/png');
  assert.ok(!fs.readFileSync(backupFile,'utf8').includes('OFFICE_ACCESS_TOKEN'));
  await page.evaluate(()=>{localStorage.removeItem('dongbaek-ai-desk-v1');localStorage.removeItem('dongbaek-office-manual-v1');});
  await page.reload();
  assert.equal(await page.locator('[data-ai-job]').count(),0);
  await page.locator('#db-archive-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:fs.readFileSync(backupFile)});
  assert.equal(await page.locator('#db-archive-restore').isDisabled(),false);
  await page.click('#db-archive-restore');await page.waitForFunction(()=>document.querySelector('[data-ai-job]')!==null);
  assert.match(await page.locator('[data-ai-job]').first().textContent(),/포항 동백팬션/);
  const restored=await page.evaluate(async id=>{
   const db=await new Promise((yes,no)=>{const req=indexedDB.open('dongbaek-poster-studio-v1');req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error);});
   const row=await new Promise((yes,no)=>{const tx=db.transaction('files');const req=tx.objectStore('files').get(id);req.onsuccess=()=>yes(req.result);req.onerror=()=>no(req.error);});db.close();
   return row?{photoCount:row.photos.length,pngSize:row.png.size,filename:row.photos[0].name}:null;
  },id);
  assert.deepEqual(restored,{photoCount:1,pngSize:12,filename:'sample.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS archive: task search, full export, photo and PNG, restore fresh browser storage, no GPT billing');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});