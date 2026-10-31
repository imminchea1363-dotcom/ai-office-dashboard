const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({serviceWorkers:'block'}),errors=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 try{
  await page.goto(process.env.APP_TEST_URL||'http://localhost:3000');
  assert.equal(await page.locator('#db-video-vision').count(),1);
  assert.equal(await page.locator('#db-video-title').inputValue(),'');
  assert.equal(await page.locator('#db-video-subtitle').inputValue(),'');
  assert.equal(await page.locator('#db-video-cta').inputValue(),'');
  const c=await page.locator('#db-video-canvas').evaluate(canvas=>({width:canvas.width,height:canvas.height,blank:!canvas.getContext('2d')}));
  assert.equal(c.width,720);assert.equal(c.height,1280);
  await page.locator('#db-video-files').setInputFiles(path.resolve('assets/office-background.png'));
  await page.click('#db-video-vision-inspect');
  await page.waitForFunction(()=>document.querySelectorAll('#db-video-vision-frames img').length>0);
  assert.match(await page.locator('#db-video-vision-status').textContent(),/장면 추출 완료/);
  await page.click('#db-video-vision-analyze');
  assert.match(await page.locator('#db-video-vision-status').textContent(),/확인이 필요/);
  await page.check('#db-video-vision-consent');await page.click('#db-video-vision-analyze');
  assert.match(await page.locator('#db-video-vision-status').textContent(),/연결되지 않았습니다|연결이 필요합니다/);
  assert.deepEqual(posts,[]);
  await page.evaluate(()=>{window.DongbaegVisionAnalyze=async ({frames})=>{
   if(frames.length!==1||frames.some(f=>!f.startsWith('data:image/jpeg;base64,')))throw Error('bad extracted frames');
   return {visible:['실제 촬영 장면에서 건물 외관이 보임'],uncertain:'위치는 확인 필요',hook:'촬영된 건물 외관',caption:'건물 외관을 보여줍니다',cta:'',post:'촬영 장면에 건물이 보입니다.',hashtags:['#건물','#외관']};
  };});
  await page.click('#db-video-vision-analyze');
  await page.waitForFunction(()=>document.querySelector('#db-vision-hook')?.value==='촬영된 건물 외관');
  assert.equal(await page.locator('#db-video-title').inputValue(),'','AI suggestions require review');
  await page.click('#db-vision-apply');
  assert.equal(await page.locator('#db-video-title').inputValue(),'촬영된 건물 외관');
  assert.equal(await page.locator('#db-video-cta').inputValue(),'');
  assert.match(await page.locator('#db-sns-caption').inputValue(),/촬영 장면에 건물이 보입니다/);
  assert.match(await page.locator('#db-sns-caption').inputValue(),/#건물/);
  assert.deepEqual(posts,[]);assert.deepEqual(errors,[]);
  console.log('PASS vision preview: no default captions, real local frames, consent gate, offline state, mocked AI suggestions, manual review, SNS draft, zero network POST');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
