/* Cloudflare Worker. Secrets belong in Cloudflare, never in this repository. */
const ORIGIN = 'https://imminchea1363-dotcom.github.io';
const MODEL = 'gpt-4.1-mini';
const DAILY_LIMIT = 20;
const PILOT_LIMIT = 200;
const OUTPUT_LIMIT = 1200;
const MAX_BODY = 32768;
const schema = `CREATE TABLE IF NOT EXISTS gpt_jobs (
 id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, day TEXT NOT NULL,
 status TEXT NOT NULL, created INTEGER NOT NULL, result TEXT,
 input_tokens INTEGER, output_tokens INTEGER
)`;
const instructions = '당신은 동백사무실의 동백대리입니다. 대표의 지시에 따라 기획, 글 작성, 요약을 수행합니다. 한국어로 명료하게 답하세요. 제공되지 않은 사실, 가격, 시설 정보와 통계를 지어내지 마세요. 확인이 필요한 정보는 표시하세요. 외부 검색, 게시, 발송, 예약, 결제를 수행했다고 주장하지 마세요. 결과물을 바로 검토할 수 있게 작성하세요.';

class Failure extends Error {
 constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function json(data, status = 200, origin = '') {
 const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
 if (origin === ORIGIN) headers['Access-Control-Allow-Origin'] = ORIGIN;
 return new Response(JSON.stringify(data), { status, headers });
}
async function hash(value) {
 const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
 return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function authorized(request, env) {
 const supplied = request.headers.get('Authorization') || '';
 if (!supplied.startsWith('Bearer ') || supplied.length > 520) return false;
 const a = await hash(supplied.slice(7)), b = await hash(env.OFFICE_ACCESS_TOKEN);
 let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
 return diff === 0;
}
function configured(env) {
 return typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.startsWith('sk-') &&
  typeof env.OFFICE_ACCESS_TOKEN === 'string' && env.OFFICE_ACCESS_TOKEN.length >= 20 &&
  env.OFFICE_ACCESS_TOKEN.length <= 256 && env.OFFICE_ACCESS_TOKEN !== env.OPENAI_API_KEY &&
  !env.OFFICE_ACCESS_TOKEN.startsWith('sk-') && env.DB?.prepare;
}
async function readJSON(request) {
 if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw new Failure(415, 'json_required', 'JSON 형식으로 요청해 주세요.');
 const reader = request.body?.getReader(); if (!reader) throw new Failure(400, 'invalid_body', '업무 내용이 없습니다.');
 const chunks = []; let size = 0;
 while (true) {
  const { done, value } = await reader.read(); if (done) break;
  size += value.byteLength;
  if (size > MAX_BODY) { await reader.cancel(); throw new Failure(413, 'too_large', '업무 내용이 너무 깁니다.'); }
  chunks.push(value);
 }
 const bytes = new Uint8Array(size); let offset = 0;
 for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 try { return JSON.parse(new TextDecoder().decode(bytes)); }
 catch { throw new Failure(400, 'invalid_body', '업무 형식을 확인해 주세요.'); }
}
function validate(data) {
 if (!data || typeof data !== 'object' || Array.isArray(data) || !/^[a-f0-9-]{36}$/i.test(data.id || '')) throw new Failure(400, 'invalid_id', '업무 식별자가 올바르지 않습니다.');
 const text = (key, max) => {
  if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > max) throw new Failure(400, 'invalid_task', '업무 제목과 지시 내용을 확인해 주세요.');
  return data[key].trim();
 };
 return { id: data.id, title: text('title', 100), brief: text('brief', 6000), output: text('output', 80) };
}
async function usage(db, day) {
 return await db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN day = ? THEN 1 ELSE 0 END),0) AS today FROM gpt_jobs').bind(day).first();
}
function completed(row, reused = false) {
 return { id: row.id, result: row.result, model: MODEL, reused, usage: { input_tokens: row.input_tokens, output_tokens: row.output_tokens } };
}
function existing(row, fingerprint) {
 if (row.fingerprint !== fingerprint) throw new Failure(409, 'id_conflict', '같은 식별자로 다른 업무를 실행할 수 없습니다.');
 if (row.status === 'done') return completed(row, true);
 if (row.status === 'reserved') throw new Failure(409, 'pending', '이 업무는 이미 접수됐습니다. 잠시 후 결과 확인을 눌러주세요.');
 throw new Failure(409, 'previous_attempt', '이 업무의 이전 실행이 종료됐습니다. 같은 요청을 자동 재실행하지 않습니다.');
}

export default {
 async fetch(request, env) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  if (request.method === 'GET' && url.pathname === '/health') return json({ service: 'dongbaek-gpt', version: 1, ready: Boolean(configured(env)) }, 200, origin);
  if (origin !== ORIGIN) return json({ error: 'origin_denied', message: '동백사무실에서 접속해 주세요.' }, 403);
  if (request.method === 'OPTIONS') {
   return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin' } });
  }
  try {
   if (!['/api/status', '/api/jobs', '/api/result'].includes(url.pathname)) throw new Failure(404, 'not_found', '요청한 기능이 없습니다.');
   if (!configured(env)) throw new Failure(503, 'not_configured', '서버의 API 키, 사무실 접속 암호, DB 연결을 확인해 주세요.');
   if (!await authorized(request, env)) throw new Failure(401, 'unauthorized', '사무실 접속 암호가 맞지 않습니다.');
   await env.DB.prepare(schema).run();
   const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
   if (request.method === 'GET' && url.pathname === '/api/status') {
    return json({ connected: true, model: MODEL, limits: { daily: DAILY_LIMIT, pilot: PILOT_LIMIT, max_output_tokens: OUTPUT_LIMIT, timezone: 'Asia/Seoul' }, used: await usage(env.DB, day) }, 200, origin);
   }
   if (request.method === 'GET' && url.pathname === '/api/result') {
    const id = url.searchParams.get('id') || '';
    if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Failure(400, 'invalid_id', '업무 식별자가 올바르지 않습니다.');
    const row = await env.DB.prepare('SELECT * FROM gpt_jobs WHERE id = ?').bind(id).first();
    if (!row) throw new Failure(404, 'missing_job', '접수된 업무를 찾을 수 없습니다.');
    if (row.status !== 'done') throw new Failure(409, row.status === 'reserved' ? 'pending' : 'previous_attempt', row.status === 'reserved' ? '아직 결과가 준비되지 않았습니다. 잠시 후 다시 확인해 주세요.' : '이 업무는 결과 없이 종료됐습니다.');
    return json(completed(row, true), 200, origin);
   }
   if (request.method !== 'POST' || url.pathname !== '/api/jobs') throw new Failure(405, 'method_not_allowed', '요청 방식을 확인해 주세요.');
   const task = validate(await readJSON(request));
   const fingerprint = await hash(JSON.stringify([task.title, task.brief, task.output]));
   const old = await env.DB.prepare('SELECT * FROM gpt_jobs WHERE id = ?').bind(task.id).first();
   if (old) return json(existing(old, fingerprint), 200, origin);
   const now = Date.now();
   // A single atomic SQLite statement enforces both quotas and one in-flight call.
   // Failed/uncertain attempts stay counted, so retries cannot bypass the limits.
   const reserved = await env.DB.prepare(`INSERT OR IGNORE INTO gpt_jobs (id,fingerprint,day,status,created)
    SELECT ?,?,?,'reserved',? WHERE
    (SELECT COUNT(*) FROM gpt_jobs WHERE day = ?) < ? AND
    (SELECT COUNT(*) FROM gpt_jobs) < ? AND
    NOT EXISTS (SELECT 1 FROM gpt_jobs WHERE status = 'reserved' AND created > ?)`)
    .bind(task.id, fingerprint, day, now, day, DAILY_LIMIT, PILOT_LIMIT, now - 120000).run();
   if (!reserved.meta?.changes) {
    const duplicate = await env.DB.prepare('SELECT * FROM gpt_jobs WHERE id = ?').bind(task.id).first();
    if (duplicate) return json(existing(duplicate, fingerprint), 200, origin);
    const used = await usage(env.DB, day);
    if (used.total >= PILOT_LIMIT) throw new Failure(429, 'pilot_limit', '시험 운영의 총 200회 한도에 도달했습니다. 사용량을 검토한 뒤 확대해 주세요.');
    if (used.today >= DAILY_LIMIT) throw new Failure(429, 'daily_limit', '오늘의 20회 한도에 도달했습니다. 한국시간 자정 이후 다시 이용해 주세요.');
    throw new Failure(429, 'busy', '다른 업무를 처리 중입니다. 완료 후 다시 실행해 주세요.');
   }
   let remote, payload;
   try {
    remote = await fetch('https://api.openai.com/v1/responses', {
     method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
     body: JSON.stringify({ model: MODEL, instructions, input: `[업무]\n${task.title}\n\n[지시]\n${task.brief}\n\n[결과 형태]\n${task.output}`, max_output_tokens: OUTPUT_LIMIT, store: false }),
     signal: AbortSignal.timeout(45000), redirect: 'error'
    });
    if (!remote.ok) throw new Failure(502, 'upstream_error', remote.status === 429 ? 'OpenAI 잔액이나 사용 한도를 확인해 주세요. 자동 재실행하지 않았습니다.' : 'GPT 호출에 실패했습니다. API 키 권한과 모델 이용 가능 여부를 확인해 주세요.');
    payload = await remote.json();
    const result = (payload.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
    if (payload.status !== 'completed' || !result) throw new Failure(502, 'incomplete', 'GPT가 완성된 결과를 반환하지 않았습니다. 지시를 짧게 나누어 주세요.');
    const row = { id: task.id, result: result.slice(0, 20000), input_tokens: payload.usage?.input_tokens || 0, output_tokens: payload.usage?.output_tokens || 0 };
    await env.DB.prepare("UPDATE gpt_jobs SET status = 'done', result = ?, input_tokens = ?, output_tokens = ? WHERE id = ?").bind(row.result, row.input_tokens, row.output_tokens, row.id).run();
    return json(completed(row), 200, origin);
   } catch (error) {
    await env.DB.prepare("UPDATE gpt_jobs SET status = 'failed' WHERE id = ? AND status = 'reserved'").bind(task.id).run();
    if (error instanceof Failure) throw error;
    throw new Failure(502, 'uncertain', '통신 또는 저장 중 오류가 발생했습니다. 사용료가 발생했을 수 있어 자동 재실행하지 않았습니다.');
   }
  } catch (error) {
   return json({ error: error instanceof Failure ? error.code : 'server_error', message: error instanceof Failure ? error.message : '서버 처리에 실패했습니다. DB 연결을 확인해 주세요.' }, error instanceof Failure ? error.status : 503, origin);
  }
 }
};
