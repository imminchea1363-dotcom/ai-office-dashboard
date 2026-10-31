/* Text-only provider adapters. Every call is explicit, authenticated upstream with server-only credentials. */
const MODELS=Object.freeze({chatgpt:'gpt-4.1-mini',gemini:'gemini-3.8-flash',claude:'claude-sonnet-5-5',nemotron:'nvidia/nemotron-3-ultra-550b-a55b'});
const KEYS=Object.freeze({chatgpt:'OPENAI_API_KEY',gemini:'GEMINI_API_KEY',claude:'ANTHROPIC_API_KEY',nemotron:'NVIDIA_API_KEY'});
export const PROVIDER_IDS=Object.freeze(Object.keys(MODELS));
export const providerModel=id=>MODELS[id]||null;
export function providerStatus(env){
 return Object.fromEntries(PROVIDER_IDS.map(id=>[id,{configured:typeof env[KEYS[id]]==='string'&&env[KEYS[id]].length>=16,model:MODELS[id],verified:false}]));
}
export async function runTextProvider({provider,env,instructions,input,maxOutputTokens}){
 if(!PROVIDER_IDS.includes(provider))throw Error('unsupported_provider');
 const key=env[KEYS[provider]];
 if(typeof key!=='string'||key.length<16)throw Error('provider_not_configured');
 const model=MODELS[provider];
 let url,headers,body;
 if(provider==='chatgpt'){
  url='https://api.openai.com/v1/responses';
  headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
  body={model,instructions,input,max_output_tokens:maxOutputTokens,store:false};
 }else if(provider==='gemini'){
  url='https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent';
  headers={'x-goog-api-key':key,'Content-Type':'application/json'};
  body={systemInstruction:{parts:[{text:instructions}]},contents:[{role:'user',parts:[{text:input}]}],generationConfig:{maxOutputTokens}};
 }else if(provider==='claude'){
  url='https://api.anthropic.com/v1/messages';
  headers={'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'};
  body={model,max_tokens:maxOutputTokens,system:instructions,messages:[{role:'user',content:input}]};
 }else{
  url='https://integrate.api.nvidia.com/v1/chat/completions';
  headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
  body={model,messages:[{role:'system',content:instructions},{role:'user',content:input}],max_tokens:maxOutputTokens,stream:false};
 }
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000),redirect:'manual'});
 if(!response.ok)throw Error('upstream_error');
 const raw=await response.json();
 let result='',usage={input_tokens:0,output_tokens:0};
 if(provider==='chatgpt'){
  if(raw.status!=='completed')throw Error('incomplete');
  result=(raw.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  usage={input_tokens:raw.usage?.input_tokens||0,output_tokens:raw.usage?.output_tokens||0};
 }else if(provider==='gemini'){
  result=(raw.candidates?.[0]?.content?.parts||[]).filter(x=>typeof x.text==='string').map(x=>x.text).join('\n');
  usage={input_tokens:raw.usageMetadata?.promptTokenCount||0,output_tokens:raw.usageMetadata?.candidatesTokenCount||0};
 }else if(provider==='claude'){
  result=(raw.content||[]).filter(x=>x.type==='text'&&typeof x.text==='string').map(x=>x.text).join('\n');
  usage={input_tokens:raw.usage?.input_tokens||0,output_tokens:raw.usage?.output_tokens||0};
 }else{
  const val=raw.choices?.[0]?.message?.content;
  result=typeof val==='string'?val:'';
  usage={input_tokens:raw.usage?.prompt_tokens||0,output_tokens:raw.usage?.completion_tokens||0};
 }
 if(!result.trim())throw Error('incomplete');
 return {model,result:result.trim(),usage};
}
