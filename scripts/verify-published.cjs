/* Read-only verification of the published release in a fresh browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const base = 'https://imminchea1363-dotcom.github.io/ai-office-dashboard/';
const latest = fs.readFileSync(path.join(root,'dist/dongbaek-pwa/latest.html'),'utf8');
const release = latest.match(/releases\/([^/]+)\//)[1];
const target = base+'releases/'+release+'/';
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  let ready = false;
  for(let attempt=0;attempt<24;attempt++){
    try {
      const response=await fetch(base+'latest.html?check='+Date.now(),{signal:AbortSignal.timeout(20000)});
      const html=await response.text();
      if(response.ok&&html.includes('releases/'+release+'/')){ready=true;break;}
    } catch(error){console.log('Waiting for Pages: '+error.message);}
    console.log('Waiting for Pages release '+release+' ('+(attempt+1)+'/24)');
    await delay(10000);
  }
  assert.ok(ready,'GitHub Pages did not expose the expected release');
  for(const name of ['characters.js','pixel-mode.js','v3.js','index.html','sw.js']){
    const response=await fetch(target+name,{signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,name);
    assert.equal(await response.text(),fs.readFileSync(path.join(root,'dist/dongbaek-pwa',name),'utf8'),name+' differs from the checked build');
  }
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1180},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400) errors.push(response.status()+' '+response.url());});
    await page.goto(base+'latest.html');
    await page.waitForURL(target);
    assert.match(await page.title(),/v6\.1/);
    for(const scene of ['office','director','pantry']){
      await page.locator('#db-areas [data-view='+scene+']').click();
      await page.waitForFunction(()=>[...document.querySelectorAll('[data-painted-sprite] img')].every(img=>img.complete&&img.naturalWidth>0));
      if(scene==='office') assert.equal(await page.locator('.db-dog-seated').count(),1);
      const bytes=await page.locator('#db-world').screenshot({type:'jpeg',quality:65});
      fs.writeFileSync(path.join(root,'previews','published-'+scene+'.jpg'),bytes);
      console.log('PUBLISHED_IMAGE:'+JSON.stringify({scene,base64:bytes.toString('base64')}));
    }
    await page.setViewportSize({width:390,height:844});
    for(const scene of ['office','director','pantry']){
      await page.locator('#db-areas [data-view='+scene+']').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS published: HTTPS latest redirect, all checked release files match, desktop/mobile scenes, seated dog, no JS/resource errors: '+target);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
