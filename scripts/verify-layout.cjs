/* Local-only browser verification; writes previews only in this review copy. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {chromium} = require('playwright');
const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const workspace = path.dirname(root);
const previews = path.join(root, 'previews');
fs.mkdirSync(previews, {recursive: true});
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(workspace, '.' + pathname);
  if (!file.startsWith(workspace + path.sep)) {res.writeHead(403).end(); return;}
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {res.writeHead(404).end(); return;}
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'application/javascript','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)] || 'text/plain');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const host = 'http://127.0.0.1:' + server.address().port;
  const base = host + '/' + path.basename(root) + '/';
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage']});
  try {
    for (const [name, url] of [['before',host+'/ai-office-dashboard/'],['after',base]]) {
      const context = await browser.newContext({viewport:{width:1600,height:1180},reducedMotion:'reduce',serviceWorkers:'block'});
      const page = await context.newPage();
      if (name === 'after') await page.clock.install();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {if(response.status()>=400) errors.push(response.status()+' '+response.url());});
      await page.goto(url);
      for (const scene of ['director','pantry','office','roof']) {
        await page.locator('#db-areas [data-view='+scene+']').click();
        await page.waitForFunction(() => [...document.querySelectorAll('[data-painted-sprite] img')].every(img=>img.complete&&img.naturalWidth>0));
        await page.locator('#db-world').screenshot({path:path.join(previews, name+'-'+scene+'.png')});
        if(name === 'after'){
          const jpeg=await page.locator('#db-world').screenshot({type:'jpeg',quality:65});
          fs.writeFileSync(path.join(previews,'after-'+scene+'.jpg'),jpeg);
          console.log('REVIEW_IMAGE:'+JSON.stringify({scene,base64:jpeg.toString('base64')}));
        }
      }
      if (name === 'after') {
        assert.equal(await page.locator('#db-total').textContent(),'10');
        assert.equal(await page.locator('#db-areas [data-view=lobby]').count(),0);
        await page.locator('#db-areas [data-view=office]').click();
        assert.equal(await page.locator('#db-actors [data-worker]').count(),10);
        assert.equal(await page.locator('#db-team-zones [data-team-zone]').count(),5);
        assert.equal(await page.locator('#db-office-refit').count(),1);
        assert.equal(await page.locator('.db-dog-route, .db-dog-seated').count(),0);
        await page.locator('#db-world').screenshot({path:path.join(previews,'after-office-ten.png')});
        await page.locator('#db-areas [data-view=roof]').click();
        assert.equal(await page.locator('[data-character="black-french-bulldog"]').count(),1);
        assert.equal(await page.locator('[data-rooftop-furniture="dongbaek"]').count(),1);
        assert.equal(await page.locator('[data-rooftop-furniture="staff-lounge"]').count(),1);
        await page.locator('#db-world').screenshot({path:path.join(previews,'after-roof.png')});
        const employees=await page.evaluate(()=>DongbaekOffice.employees());
        assert.equal(employees.length,10);
        for(const employee of employees){
          await page.locator('#db-roster [data-worker="'+employee.id+'"]').click();
          await page.locator('[data-worker-action=pantry]').click();
        }
        await page.locator('#db-areas [data-view=pantry]').click();
        assert.equal(await page.locator('#db-actors [data-pose=coffee]').count(),10);
        assert.equal(await page.locator('[data-seat-support=stool]').count(),8);
        const placements=await page.locator('#db-actors [data-worker]').evaluateAll(nodes=>nodes.map(node=>node.parentElement.getAttribute('transform')));
        assert.equal(new Set(placements).size,10);
        await page.locator('#db-world').screenshot({path:path.join(previews,'after-pantry-ten.png')});
        await page.click('#db-reset');
        await page.setViewportSize({width:390,height:844});
        for(const scene of ['director','pantry','office','roof']){
          await page.locator('#db-areas [data-view='+scene+']').click();
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
          await page.locator('#db-viewport').screenshot({path:path.join(previews,'mobile-'+scene+'.png')});
        }
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS layouts: 10 employees, 4 separate teams, no lobby, dog rooftop only, 10 distinct pantry seats, mobile, no JS/resource errors');
  } finally {await browser.close();}
  for (const test of ['smoke.cjs','scene-details.cjs','radio.cjs','recovery.cjs','ai-desk.cjs','gpt-desk.cjs','gpt-manager.cjs','gpt-manager-preview.cjs','office-archive.cjs','office-sns.cjs','office-pipeline.cjs','video-studio.cjs','office-music.cjs','video-archive.cjs','video-review.cjs','video-ai.cjs']) {
    const result = await run(process.execPath,[path.join(root,'tests',test)],{cwd:root,env:{...process.env,APP_TEST_URL:base,PWA_TEST_URL:base+'dist/dongbaek-pwa/'},timeout:120000,maxBuffer:1024*1024});
    process.stdout.write(result.stdout);
  }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
