import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker from '../server/worker.mjs';

const origin = 'https://imminchea1363-dotcom.github.io';
const secret = 'test-only-office-password-24chars';
function database() {
 const sqlite = new DatabaseSync(':memory:');
 function prepare(sql, args = []) {
  return {
   bind(...values) { return prepare(sql, values); },
   async first() { return sqlite.prepare(sql).get(...args) || null; },
   async run() { const r = sqlite.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; }
  };
 }
 return { prepare, sqlite };
}
function environment() { return { OPENAI_API_KEY: 'sk-test-not-a-real-key', OFFICE_ACCESS_TOKEN: secret, DB: database() }; }
function request(path, body, extra = {}) {
 return new Request('https://dongbaek-api.example' + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, Authorization: 'Bearer ' + secret, ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
function task(extra = {}) { return { id: crypto.randomUUID(), title: '홍보글 작성', brief: '고객 제공 사진을 설명하는 한국어 문구', output: '홍보 문구', ...extra }; }
const success = () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '완성된 결과 <img onerror=alert(1)>' }] }], usage: { input_tokens: 120, output_tokens: 80 } });

test('security and billing protections use real SQLite, with OpenAI calls mocked', async () => {
 const realFetch = globalThis.fetch; let calls = [];
 globalThis.fetch = async (url, options) => { calls.push({ url, options }); return success(); };
 try {
  let env = environment();
  assert.equal((await worker.fetch(request('/api/status'), { ...env, OFFICE_ACCESS_TOKEN: '' })).status, 503);
  assert.equal((await worker.fetch(request('/api/status'), { ...env, DB: null })).status, 503);
  assert.equal((await worker.fetch(request('/api/status', null, { Authorization: 'Bearer wrong' }), env)).status, 401);
  assert.equal((await worker.fetch(request('/api/status', null, { Origin: 'https://evil.example' }), env)).status, 403);
  assert.equal(calls.length, 0);
  const preflight = await worker.fetch(new Request('https://worker.example/api/jobs', { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  let status = await worker.fetch(request('/api/status'), env);
  assert.equal(status.headers.get('Cache-Control'), 'no-store');
  assert.equal((await status.json()).limits.daily, 20); assert.equal(calls.length, 0);
  assert.equal((await worker.fetch(request('/api/jobs', task({ brief: 'x'.repeat(6001) })), env)).status, 400);
  assert.equal((await worker.fetch(request('/api/jobs', task({ brief: 'x'.repeat(33000) })), env)).status, 413);
  assert.equal((await worker.fetch(request('/api/jobs', task(), { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal(calls.length, 0);
  const job = task(); let reply = await worker.fetch(request('/api/jobs', job), env);
  assert.equal(reply.status, 200); let data = await reply.json(); assert.match(data.result, /완성된 결과/); assert.equal(data.reused, false);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://api.openai.com/v1/responses'); assert.equal(calls[0].options.redirect, 'manual');
  const sent = JSON.parse(calls[0].options.body);
  assert.equal(sent.store, false); assert.equal(sent.model, 'gpt-4.1-mini'); assert.equal(sent.max_output_tokens, 1200); assert.equal(sent.tools, undefined);
  reply = await worker.fetch(request('/api/jobs', job), env); assert.equal((await reply.json()).reused, true); assert.equal(calls.length, 1);
  reply = await worker.fetch(request('/api/jobs', { ...job, brief: '別の仕事' }), env); assert.equal(reply.status, 409); assert.equal(calls.length, 1);
  reply = await worker.fetch(request('/api/result?id=' + job.id), env); assert.match((await reply.json()).result, /完|완성/); assert.equal(calls.length, 1);
  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  for (let i = 1; i < 20; i++) env.DB.sqlite.prepare("INSERT INTO gpt_jobs (id,fingerprint,day,status,created) VALUES (?,?,?,'failed',?)").run(crypto.randomUUID(), 'fake', day, Date.now());
  reply = await worker.fetch(request('/api/jobs', task()), env); assert.equal(reply.status, 429); assert.equal((await reply.json()).error, 'daily_limit'); assert.equal(calls.length, 1);
  env.DB.sqlite.prepare("UPDATE gpt_jobs SET day = '2000-01-01'").run();
  for (let i = 20; i < 200; i++) env.DB.sqlite.prepare("INSERT INTO gpt_jobs (id,fingerprint,day,status,created) VALUES (?,?,?,'failed',?)").run(crypto.randomUUID(), 'fake', '2000-01-01', Date.now());
  reply = await worker.fetch(request('/api/jobs', task()), env); assert.equal(reply.status, 429); assert.equal((await reply.json()).error, 'pilot_limit'); assert.equal(calls.length, 1);

  // Concurrent duplicate jobs and different jobs cannot cause two API requests.
  env = environment(); let release;
  globalThis.fetch = async () => { calls.push({ concurrent: true }); await new Promise(resolve => { release = resolve; }); return success(); };
  const concurrent = task(), first = worker.fetch(request('/api/jobs', concurrent), env);
  while (!release) await new Promise(resolve => setTimeout(resolve, 0));
  const duplicates = await Promise.all([worker.fetch(request('/api/jobs', concurrent), env), worker.fetch(request('/api/jobs', task()), env)]);
  assert.equal(duplicates[0].status, 409); assert.equal((await duplicates[0].json()).error, 'pending');
  assert.equal(duplicates[1].status, 429); assert.equal((await duplicates[1].json()).error, 'busy'); release(); assert.equal((await first).status, 200);

  // An upstream error is counted, sanitized, and never retried automatically.
  env = environment(); let failures = 0;
  globalThis.fetch = async () => { failures++; return Response.json({ error: { message: 'private upstream detail' } }, { status: 429 }); };
  const failedJob = task(); reply = await worker.fetch(request('/api/jobs', failedJob), env);
  assert.equal(reply.status, 502); assert.doesNotMatch(await reply.text(), /private upstream|sk-test/);
  assert.equal(failures, 1); reply = await worker.fetch(request('/api/jobs', failedJob), env); assert.equal(reply.status, 409); assert.equal(failures, 1);
  status = await worker.fetch(request('/api/status'), env); assert.equal((await status.json()).used.today, 1);
  globalThis.fetch = async () => { throw new TypeError('network failed'); };
  reply = await worker.fetch(request('/api/jobs', task()), env); assert.equal((await reply.json()).error, 'uncertain');
  console.log('PASS GPT worker: no key exposure, exact origin and authentication, bounded input/output, Responses API only, real SQLite atomic quotas/idempotency, concurrent request blocking, result recovery without extra API calls, counted errors and no automatic retry');
 } finally { globalThis.fetch = realFetch; }
});
