import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Hermes status viewer is bundled for normal, offline PWA and single HTML',()=>{
 const index=read('index.html'),build=read('scripts/build-pwa.py'),standalone=read('scripts/export-standalone.py'),sw=read('sw.js');
 assert.ok(index.includes('<script src="hermes-bridge/dashboard.js"></script>'));
 assert.ok(build.includes("'hermes-bridge/dashboard.js'"));
 assert.ok(standalone.includes("'hermes-bridge/dashboard.js'"));
 assert.ok(sw.includes("'./hermes-bridge/dashboard.js'"));
 // Cache version must be rewritten by build-pwa.py; stale SW cache must not retain old UI.
 assert.ok(build.includes('"PREFIX + \'source-v3\'"'));
 assert.ok(sw.includes("PREFIX + 'source-v3'"));
});

test('status UI exposes no remote actions and does not persist tokens',()=>{
 const js=read('hermes-bridge/dashboard.js');
 assert.ok(js.includes('/api/hermes/status'));
 assert.ok(!js.includes('/api/hermes/approve'));
 assert.doesNotMatch(js,/\\b(?:localStorage|sessionStorage)\\s*(?:\\.|\\[)/,'no browser storage access is permitted');
 assert.ok(js.includes('cache:\'no-store\''));
 const python=read('hermes-bridge/export_status.py');
 assert.ok(python.includes('mode=ro'));
});
