/* User-initiated scene analysis for actual uploaded footage. No guesses or silent uploads. */
(()=>{
 'use strict';
 const studio=document.getElementById('db-video-studio'),files=document.getElementById('db-video-files');
 if(!studio||!files)return;
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const panel=el('section');panel.id='db-video-vision';panel.style.cssText='border:1px solid #a7bdae;border-radius:10px;padding:14px;margin:14px 0;background:#fff';
 panel.append(el('h4','실제 장면 기반 AI 자막·SNS 문구'));
 panel.append(el('p','영상의 대표 장면을 이 브라우저에서 추출합니다. AI 분석은 연결 및 확인 후에만 진행하며 비용이 발생할 수 있습니다. 분석하지 않은 장면은 추측하지 않습니다.'));
 const frames=el('div');frames.id='db-video-vision-frames';frames.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 const status=el('p','분석 전: 영상에 기본 자막을 넣지 않습니다.');status.id='db-video-vision-status';status.setAttribute('role','status');
 const inspect=el('button','실제 장면 확인 (무료)');inspect.id='db-video-vision-inspect';inspect.type='button';
 const consent=el('label');consent.style.cssText='display:flex;gap:8px;align-items:flex-start;font-size:12px';
 const checkbox=el('input');checkbox.type='checkbox';checkbox.id='db-video-vision-consent';checkbox.style.width='auto';
 consent.append(checkbox,el('span','선택 영상의 추출 프레임 최대 3장을 AI 분석 서버로 전송하고, 비용이 발생할 수 있다는 점에 동의합니다.'));
 const analyze=el('button','AI로 실제 장면 분석 (유료 호출 가능)');analyze.id='db-video-vision-analyze';analyze.type='button';
 const results=el('div');results.id='db-video-vision-result';results.style.cssText='display:none;gap:8px';
 function field(name,id,max){const box=el('label',name),area=el('textarea');area.id=id;area.maxLength=max;area.rows=2;area.style.cssText='display:block;width:100%;box-sizing:border-box;padding:8px';box.append(area);results.append(box);return area;}
 const hook=field('후킹 문구','#'.slice(1)+'db-vision-hook',55);
 const middle=field('중간 자막','db-vision-caption',70);
 const cta=field('마지막 안내 (영상에서 확인된 정보만)','db-vision-cta',85);
 const post=field('SNS 게시글','db-vision-post',2400);
 const tags=field('해시태그','db-vision-tags',400);
 const evidence=el('p');evidence.id='db-video-vision-evidence';results.append(evidence);
 const apply=el('button','검토한 문구를 영상에 적용');apply.id='db-vision-apply';apply.type='button';results.append(apply);
 panel.append(inspect,frames,consent,analyze,status,results);
 studio.querySelector('#db-video-cuts').before(panel);
 let previews=[],images=[],busy=false,confirmed=false;
 function reset(){previews=[];images=[];confirmed=false;frames.replaceChildren();results.style.display='none';checkbox.checked=false;status.textContent='분석 전: 영상에 기본 자막을 넣지 않습니다.';}
 files.addEventListener('change',reset);
 const wait=(node,event)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{stop();reject(Error('영상 프레임을 읽는 시간이 초과됐습니다.'));},10000);
  const done=()=>{stop();resolve();},fail=()=>{stop();reject(Error('이 영상에서 프레임을 추출할 수 없습니다.'));};
  const stop=()=>{clearTimeout(timer);node.removeEventListener(event,done);node.removeEventListener('error',fail);};
  node.addEventListener(event,done,{once:true});node.addEventListener('error',fail,{once:true});
 });
 async function snapshot(file,ratio){
  const url=URL.createObjectURL(file),isImage=file.type.startsWith('image/'),media=document.createElement(isImage?'img':'video');
  try{
   media.src=url;
   if(isImage){if(!media.complete)await wait(media,'load');}
   else{
    media.muted=true;media.playsInline=true;media.preload='auto';
    if(media.readyState<1)await wait(media,'loadedmetadata');
    const duration=Number.isFinite(media.duration)?media.duration:0;
    if(duration>0&&ratio>0){media.currentTime=Math.max(0,Math.min(duration-0.05,duration*ratio));await wait(media,'seeked');}
    else if(media.readyState<2)await wait(media,'loadeddata');
   }
   const w=isImage?media.naturalWidth:media.videoWidth,h=isImage?media.naturalHeight:media.videoHeight;
   if(!w||!h)throw Error('프레임 크기를 읽지 못했습니다.');
   const c=document.createElement('canvas'),scale=Math.min(1,448/Math.max(w,h));c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
   c.getContext('2d').drawImage(media,0,0,c.width,c.height);
   return c.toDataURL('image/jpeg',0.62);
  }finally{media.removeAttribute('src');media.load?.();URL.revokeObjectURL(url);}
 }
 inspect.onclick=async()=>{
  if(busy)return;busy=true;inspect.disabled=true;reset();status.textContent='영상 장면을 추출하고 있습니다.';
  try{
   const sources=[...files.files||[]].slice(0,3);if(!sources.length)throw Error('실제 사진이나 영상을 먼저 선택하세요.');
   const ratios=sources.length===1?[0.12,0.5,0.85]:sources.map((_,i)=>i===0?0.25:i===1?0.55:0.75);
   for(let i=0;i<ratios.length;i++){
    const src=sources[sources.length===1?0:i],img=await snapshot(src,ratios[i]);images.push(img);
    const thumb=el('img');thumb.src=img;thumb.alt='원본 영상에서 추출한 '+(i+1)+'번 대표 장면';thumb.style.cssText='width:100px;height:125px;object-fit:contain;background:#213730;border-radius:6px';frames.append(thumb);
   }
   status.textContent=images.length+'개 장면 추출 완료 · 원본은 서버에 전송하지 않았습니다. AI 분석은 별도 동의 후 가능합니다.';
  }catch(error){reset();status.textContent='장면 추출 실패: '+error.message;}
  finally{busy=false;inspect.disabled=false;}
 };
 analyze.onclick=async()=>{
  if(busy)return;
  if(!images.length){status.textContent='먼저 실제 장면 확인 버튼으로 원본 프레임을 추출하세요.';return;}
  if(!checkbox.checked){status.textContent='영상 프레임 전송과 비용 가능성에 대한 확인이 필요합니다.';return;}
  if(typeof window.DongbaegVisionAnalyze!=='function'){status.textContent='AI 분석 서버가 아직 연결되지 않았습니다. 임의 자막은 생성하지 않습니다.';return;}
  busy=true;analyze.disabled=true;status.textContent='AI 분석 응답을 기다립니다. 자동 재호출하지 않습니다.';
  try{
   const output=await window.DongbaegVisionAnalyze({frames:images});
   if(!output||!Array.isArray(output.visible)||!output.visible.length)throw Error('검증할 장면 근거가 없습니다.');
   const text=(k,max)=>typeof output[k]==='string'?output[k].slice(0,max):'';
   hook.value=text('hook',55);middle.value=text('caption',70);cta.value=text('cta',85);
   post.value=text('post',2400);tags.value=Array.isArray(output.hashtags)?output.hashtags.filter(x=>typeof x==='string'&&/^#[\p{L}\p{N}_]{1,30}$/u.test(x)).slice(0,10).join(' '):'';
   evidence.textContent='확인된 장면: '+output.visible.filter(x=>typeof x==='string').slice(0,6).join(' · ')+(output.uncertain?' / 확인 필요: '+String(output.uncertain).slice(0,250):'');
   results.style.display='grid';status.textContent='실제 장면 분석 제안 완료. 문구를 검토하고 적용하세요.';
  }catch(error){status.textContent='AI 분석 실패: '+error.message+' · 추측 자막은 만들지 않았습니다.';}
  finally{busy=false;analyze.disabled=false;}
 };
 apply.onclick=()=>{
  if(results.style.display==='none')return;
  for(const [id,value] of [['db-video-title',hook.value],['db-video-subtitle',middle.value],['db-video-cta',cta.value]]){
   const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  const lines=[post.value,tags.value].filter(Boolean).join('\n\n');
  document.dispatchEvent(new CustomEvent('dongbaek-vision-draft',{detail:{post:lines,title:hook.value}}));
  status.textContent='검토한 자막과 SNS 게시글 초안을 적용했습니다. 자동 게시는 실행하지 않습니다. 영상은 다시 제작하세요.';
 };
})();
