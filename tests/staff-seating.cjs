const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// No external AI calls. Run against the locally served office after "npm run start".
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(process.env.APP_TEST_URL || 'http://127.0.0.1:3000');
    assert.match(await page.locator('#db-title').innerText(), /3F/);
    assert.equal(await page.locator('#db-roster [data-worker]').count(), 11); // representative + 10 staff
    assert.equal(await page.locator('#db-actors [data-pose="work"]').count(), 10);
    assert.equal(await page.locator('[data-work-seat]').count(), 10);
    assert.equal(await page.locator('[data-workstation]').count(), 10);
    assert.equal(await page.locator('#db-actors .db-speech').count(), 0);

    // The manager remains at the command desk; the first team employee reports.
    await page.locator('#db-finish').click();
    await page.clock.runFor(25000);
    assert.equal(await page.locator('#db-completed').innerText(), '1');
    assert.match(await page.locator('#db-roster [data-worker="1"]').innerText(), /작업 중/);
    assert.match(await page.locator('#db-roster [data-worker="2"]').innerText(), /보고 완료/);
    assert.match(await page.locator('#db-roster [data-worker="2"]').innerText(), /탕비실|체력단련실|옥상정원/);

    // A new assignment returns the team member to their specific desk.
    await page.locator('#db-roster [data-worker="2"]').click();
    await page.locator('[data-worker-action="work"]').click();
    await page.locator('#db-areas [data-view="office"]').click();
    assert.equal(await page.locator('[data-work-seat]').count(), 10);

    // Dongbaek stays on RF; the separate staff lounge remains available.
    await page.locator('#db-areas [data-view="roof"]').click();
    assert.equal(await page.locator('[data-rooftop-furniture="dongbaek"]').count(), 1);
    assert.equal(await page.locator('[data-rooftop-furniture="staff-lounge"]').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: ten seated workstations, staff report/rest, manager stays working, return to desk, RF dog/staff zones');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
