const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const options={args:['--no-sandbox']};
  if(process.env.CHROMIUM_PATH)options.executablePath=process.env.CHROMIUM_PATH;
  else if(fs.existsSync('/usr/bin/chromium'))options.executablePath='/usr/bin/chromium';
  const browser=await chromium.launch(options);
  const base=(process.env.PWA_TEST_URL||'http://127.0.0.1:3000/dist/dongbaek-pwa/').replace(/\/?$/, '/');
  const workerPath=path.resolve(__dirname,'../dist/dongbaek-pwa/sw.js');
  const originalWorker=fs.readFileSync(workerPath,'utf8');
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1050}});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.click('#db-install');
    await page.waitForFunction(()=>document.getElementById('db-offline-status')?.textContent==='✓ 오프라인 준비 완료');
    assert.equal(await page.locator('#db-total').textContent(),'4');
    const cdp=await context.newCDPSession(page);
    const manifest=await cdp.send('Page.getAppManifest');
    assert.equal(manifest.errors.length,0);
    const config=JSON.parse(manifest.data);assert.equal(config.display,'standalone');assert.equal(config.name,'주식회사 동백 · AI 오피스');
    for(const icon of config.icons){const response=await context.request.get(new URL(icon.src,base).href);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/image\/png/);}
    assert.equal(await page.locator('#db-install').textContent(),'▣ 홈 화면에 설치');
    // Real prompt availability varies in headless Chrome; exercise dismissal explicitly.
    await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});
    await page.click('#db-install-confirm');await page.waitForFunction(()=>document.getElementById('db-install-dialog').textContent.includes('설치를 취소'));
    assert.doesNotMatch(await page.locator('#db-install').textContent(),/설치 완료/);
    await page.locator('#db-install-dialog .install-close').click();
    await page.click('#db-settings');await page.fill('#db-name-0','동백 대표');await page.locator('#db-name-form button').click();
    // Test actual cache-backed navigation with networking disabled, including manifest start URL.
    await context.setOffline(true);
    await page.goto(base+'?source=homescreen');
    assert.equal(await page.locator('#db-working').textContent(),'2');
    assert.equal(await page.evaluate(async()=> (await fetch('assets/office-background.png')).status),200);
    assert.equal(await page.locator('[data-live-background]').count(),1);
    for(const asset of ['characters-standing.png','characters-working.png','gym-background.png','lobby-background.png'])assert.equal(await page.evaluate(async name=>(await fetch('assets/'+name)).status,asset),200);
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-painted-sprite] img')].every(img=>img.naturalWidth>0));
    for(const room of ['gym','lobby']){await page.locator('#db-areas [data-view='+room+']').click();assert.equal(await page.locator('[data-room-art='+room+']').count(),1);}
    await page.locator('#db-areas [data-view=office]').click();
    assert.match(await page.locator('#db-roster').textContent(),/동백 대표/);
    await page.click('#db-artwork');await page.waitForFunction(()=>document.querySelector('#db-artwork-dialog img')?.naturalWidth>0);
    await page.locator('#db-artwork-dialog .install-close').click();
    await page.locator('#db-areas [data-view="roof"]').click();assert.equal(await page.locator('.db-dog-route').count(),1);
    await page.locator('#db-areas [data-view="office"]').click();await page.click('#db-finish');
    await page.waitForFunction(()=>document.querySelector('#db-actors [data-worker="1"]')?.dataset.pose==='walk');
    await context.setOffline(false);
    await page.click('#db-reset');
    // A version update waits for explicit application and preserves names/unrelated caches.
    await page.evaluate(async()=>{await caches.open('personal-cache');await caches.open('dongbaek-pwa-other-scope-keep');});
    fs.writeFileSync(workerPath,originalWorker.replace(/PREFIX \+ '([^']+)'/,"PREFIX + '$1-test-update'"));
    await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
    await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
    await page.waitForSelector('#db-update-notice:not([hidden])');await page.click('#db-update-notice');await page.waitForSelector('#db-pwa-update');
    await Promise.all([page.waitForNavigation(),page.click('#db-pwa-update')]);
    assert.match(await page.locator('#db-roster').textContent(),/동백 대표/);
    const keys=await page.evaluate(()=>caches.keys());assert.ok(keys.includes('personal-cache'));assert.ok(keys.includes('dongbaek-pwa-other-scope-keep'));
    const scopePrefix='dongbaek-pwa-'+encodeURIComponent(new URL(base).pathname)+'-';assert.equal(keys.filter(k=>k.startsWith(scopePrefix)).length,1);
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'/tmp/dongbaek-pixel-mobile.png',fullPage:true});
    const local=await browser.newPage();const localErrors=[];local.on('pageerror',e=>localErrors.push(e.message));
    await local.setContent(fs.readFileSync(path.resolve(__dirname,'../dist/주식회사동백-v3.html'),'utf8'));
    await local.click('#db-install');assert.match(await local.locator('#db-install-dialog').textContent(),/저장한 HTML 파일/);assert.equal(await local.locator('#db-install-confirm').count(),0);
    assert.deepEqual(localErrors,[]);assert.deepEqual(errors,[]);
    console.log('PASS: manifest/icons, real service-worker cache, offline cold navigation and artwork, simulation offline, home-screen start URL, name persistence, install dismissal without false success, user-applied update, scope-safe cache cleanup, mobile, local-file install limitation');
  } finally {
    fs.writeFileSync(workerPath,originalWorker);
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
