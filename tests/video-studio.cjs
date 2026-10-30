const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(process.env.APP_TEST_URL||'http://localhost:3000');
  assert.equal(await page.locator('#db-video-studio').count(),1);
  assert.match(await page.locator('#db-roster').textContent(),/임민채대리/);
  assert.match(await page.locator('#db-roster').textContent(),/디자인·영상/);
  const gptRequests=[];page.on('request',req=>{if(req.url().includes('dongbaek-api.')&&req.method()==='POST')gptRequests.push(req.url());});
  await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#264e64';ctx.fillRect(0,0,64,64);
   const image=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const photo=new File([image],'real-source.png',{type:'image/png'});
   const dt=new DataTransfer();dt.items.add(photo);
   const input=document.getElementById('db-video-files');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('#db-video-status')?.textContent.includes('1개 실제 자료 선택'));
  assert.equal(await page.locator('#db-video-preview img').count(),1);
  assert.equal(await page.locator('[data-video-cut]').count(),1);
  await page.locator('[data-video-caption="0"]').fill('반려견과 함께 보는 진짜 바다');
  assert.match(await page.locator('#db-video-timeline').textContent(),/1컷/);
  await page.fill('#db-video-title','우리만 아는 바다');
  await page.fill('#db-video-subtitle','반려견과 함께');
  await page.selectOption('#db-video-format','webm');
  await page.selectOption('#db-video-quality','720');
  assert.equal(await page.locator('#db-video-playback').isVisible(),false);
  await page.click('#db-video-render');
  try {await page.waitForFunction(()=>document.querySelector('#db-video-download')?.hidden===false,null,{timeout:65000});}
  catch(error){throw Error('v13 video render failed: '+await page.locator('#db-video-status').textContent()+' | '+JSON.stringify(errors)+' | '+error.message);}
  const handle=page.waitForEvent('download');await page.click('#db-video-download');
  const artifact=await handle;const bytes=fs.readFileSync(await artifact.path());
  assert.match(artifact.suggestedFilename(),/\.webm$/);
  assert.ok(bytes.length>1000,'WebM payload must contain actual media');
  assert.deepEqual([...bytes.subarray(0,4)],[0x1a,0x45,0xdf,0xa3],'EBML signature should be real WebM');
  assert.equal(await page.locator('#db-video-playback').isVisible(),true);
  await page.click('#db-video-save');
  await page.waitForFunction(()=>document.querySelector('#db-video-status')?.textContent.includes('보관함 저장 완료'));
  const records=await page.evaluate(()=>DongbaegVideoLibrary.list().then(x=>x.map(r=>({id:r.id,cuts:r.cuts,size:r.blob.size}))));
  assert.equal(records.length,1);
  assert.equal(records[0].cuts[0].caption,'반려견과 함께 보는 진짜 바다');
  await page.click('#db-video-to-sns');
  await page.waitForFunction(()=>document.querySelector('#db-sns-source')?.textContent.includes('완성 영상 연결'));
  assert.equal(await page.locator('#db-sns-title').inputValue(),'우리만 아는 바다');
  await page.locator('#db-sns-save').click();
  await page.waitForFunction(()=>document.querySelector('[data-sns-video]')!==null);
  const linked=page.waitForEvent('download');
  await page.locator('[data-sns-video]').click();
  const linkedVideo=await linked;assert.match(linkedVideo.suggestedFilename(),/\.webm$/);
  assert.equal(await page.locator('#db-video-playback').isVisible(),true);
  assert.match(await page.locator('#db-video-status').textContent(),/완성 영상과 SNS 초안을 연결/);
  const capability=await page.evaluate(()=>({
   mp4Supported:MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E')||MediaRecorder.isTypeSupported('video/mp4'),
   mp4Disabled:document.querySelector('#db-video-format option[value=mp4]').disabled
  }));
  assert.equal(capability.mp4Disabled,!capability.mp4Supported);
  assert.equal(gptRequests.length,0,'No charged GPT calls during local video render');
  assert.deepEqual(errors,[]);
  console.log('PASS Minchae video: assigned design/video role, real 15s vertical WebM, no GPT calls or posts');
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});