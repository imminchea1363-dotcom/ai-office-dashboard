import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from '../server/worker.mjs';
const secret='office-test-credential-01234567890123456',origin='https://imminchea1363-dotcom.github.io';
const keys={OPENAI_API_KEY:'sk-test-not-a-real-key',GEMINI_API_KEY:'google-test-key-placeholder-012345',ANTHROPIC_API_KEY:'anthropic-test-key-placeholder-012345',NVIDIA_API_KEY:'nvidia-test-key-placeholder-012345'};
function env(){
 const db=new DatabaseSync(':memory:');
 const DB={prepare(sql,args=[]){return{bind(...v){return DB.prepare(sql,v);},async run(){const d=db.prepare(sql).run(...args);return{meta:{changes:Number(d.changes)}};},async first(){return db.prepare(sql).get(...args)||null;}};}};
 return {...keys,OFFICE_ACCESS_TOKEN:secret,DB,db};
}
function request(path,body){
 return new Request('https://api.example'+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:'Bearer '+secret,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
const task=(provider,extra={})=>({id:crypto.randomUUID(),staffId:9,provider,title:'동백 SNS 초안',brief:'확인된 정보만 작성',output:'검수용 텍스트',...extra});
const responseFor={
 chatgpt:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'GPT 초안'}]}],usage:{input_tokens:31,output_tokens:19}},
 gemini:{candidates:[{content:{parts:[{text:'Gemini 초안'}]}}],usageMetadata:{promptTokenCount:30,candidatesTokenCount:14}},
 claude:{content:[{type:'text',text:'Claude 초안'}],usage:{input_tokens:29,output_tokens:15}},
 nemotron:{choices:[{message:{content:'Nemotron 초안'}}],usage:{prompt_tokens:28,completion_tokens:12}}
};
test('four optional real provider request protocols, secret separation, output and idempotent resume (mocked network)',async()=>{
 const old=globalThis.fetch,environment=env(),calls=[];
 globalThis.fetch=async(url,options)=>{
  const provider=String(url).includes('openai')?'chatgpt':String(url).includes('googleapis')?'gemini':String(url).includes('anthropic')?'claude':'nemotron';
  calls.push({url,options,provider});return Response.json(responseFor[provider]);
 };
 try{
  const check=await (await worker.fetch(request('/api/status'),environment)).json();
  assert.equal(check.providers.gemini.configured,true);assert.equal(check.providers.claude.verified,false);
  for(const provider of ['chatgpt','gemini','claude','nemotron']){
   const job=task(provider);
   let result=await worker.fetch(request('/api/jobs',job),environment);
   assert.equal(result.status,200,provider);
   const data=await result.json();
   assert.equal(data.provider,provider);
   assert.match(data.result,/초안/);
   assert.equal(data.model,check.providers[provider].model);
   assert.ok(data.usage.input_tokens>0);
   assert.equal((await (await worker.fetch(request('/api/result?id='+job.id),environment)).json()).provider,provider);
   const before=calls.length;
   result=await worker.fetch(request('/api/jobs',job),environment);
   assert.equal((await result.json()).reused,true);
   assert.equal(calls.length,before,'No duplicate paid request');
   result=await worker.fetch(request('/api/jobs',{...job,provider:provider==='chatgpt'?'gemini':'chatgpt'}),environment);
   assert.equal(result.status,409);
  }
  assert.equal(calls.length,4);
  for(const c of calls){
   const payload=JSON.parse(c.options.body);
   assert.equal(c.options.redirect,'manual');
   assert.ok(!String(c.url).includes('key='));
   if(c.provider==='gemini'){assert.equal(c.options.headers['x-goog-api-key'],keys.GEMINI_API_KEY);assert.equal(payload.contents[0].role,'user');}
   if(c.provider==='claude'){assert.equal(c.options.headers['x-api-key'],keys.ANTHROPIC_API_KEY);assert.ok(c.options.headers['anthropic-version']);}
   if(c.provider==='nemotron'){assert.equal(payload.messages[0].role,'system');assert.equal(payload.stream,false);}
   if(c.provider==='chatgpt')assert.equal(payload.store,false);
  }
  const noGemini=env();delete noGemini.GEMINI_API_KEY;
  assert.equal((await worker.fetch(request('/api/jobs',task('gemini')),noGemini)).status,503);
  assert.equal(calls.length,4,'Missing key must not silently fall back to GPT');
  noGemini.db.close();
  assert.equal((await worker.fetch(request('/api/jobs',task('runway')),environment)).status,400);
  console.log('PASS multi-provider real API contracts: OpenAI/Gemini/Claude/Nemotron, explicit four requests, no key leak, authentic response recovery, no silent fallback');
 }finally{globalThis.fetch=old;environment.db.close();}
});