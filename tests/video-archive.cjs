const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const ctx=await browser.newContext({serviceWorkers:'block',acceptDownloads:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
  await page.goto(process.env.APP_TEST_URL||'http://localhost:3000');
  const id=await page.evaluate(async()=>{
   const bytes=new Uint8Array(2048);bytes.set([26,69,223,163]);const blob=new Blob([bytes],{type:'video/webm'});
   const x=await DongbaegVideoLibrary.save(blob,{title:'백업용 동백 영상',cuts:[{name:'실제 이미지',caption:'바다 풍경'}]});
   return x.id;
  });
  const wait=page.waitForEvent('download');await page.click('#db-archive-export');const d=await wait;const bytes=fs.readFileSync(await d.path());
  const archive=JSON.parse(bytes.toString('utf8'));
  assert.equal(archive.videos.length,1);assert.equal(archive.videos[0].id,id);
  await page.evaluate(()=>DongbaegVideoLibrary.replaceAll([]));
  assert.equal(await page.evaluate(()=>DongbaegVideoLibrary.list().then(r=>r.length)),0);
  await page.locator('#db-archive-import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:bytes});
  await page.click('#db-archive-restore');
  await page.waitForFunction(async id=>Boolean(await DongbaegVideoLibrary.get(id)),id,{timeout:15000});
  const restored=await page.evaluate(async id=>{const x=await DongbaegVideoLibrary.get(id);return {name:x.title,caption:x.cuts[0].caption,size:x.blob.size};},id);
  assert.deepEqual(restored,{name:'백업용 동백 영상',caption:'바다 풍경',size:2048});
  assert.deepEqual(errors,[]);
  console.log('PASS video archive: WebM preserved in JSON backup and restored to IndexedDB');
 }finally{await ctx.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});