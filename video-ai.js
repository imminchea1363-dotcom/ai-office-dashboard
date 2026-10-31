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
 const wait=(node,event,timeout=10000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{stop();reject(Error('영상 읽기 시간이 초과됐습니다.'));},timeout);
  const done=()=>{stop();resolve();},fail=()=>{stop();reject(Error('영상 프레임을 읽지 못했습니다.'));};
  const stop=()=>{clearTimeout(timer);node.removeEventListener(event,done);node.removeEventListener('error',fail);};
  node.addEventListener(event,done,{once:true});node.addEventListener('error',fail);
 });
 function makeFrame(media,isImage){
  const w=isImage?media.naturalWidth:media.videoWidth,h=isImage?media.naturalHeight:media.videoHeight;
  if(!w||!h)throw Error('프레임 크기를 읽지 못했습니다.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,384/Math.max(w,h));
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);
  const sample=document.createElement('canvas');sample.width=16;sample.height=16;
  const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,16,16);
  const rgba=ctx.getImageData(0,0,16,16).data,signature=[];
  for(let i=0;i<rgba.length;i+=4)signature.push((rgba[i]+rgba[i+1]+rgba[i+2])/3);
  return {image:canvas.toDataURL('image/jpeg',0.53),signature};
 }
 function different(a,b){
  if(!a||!b||a.length!==b.length)return true;
  let delta=0;for(let i=0;i<a.length;i++)delta+=Math.abs(a[i]-b[i]);
  return delta/a.length>6;
 }
 async function seekTo(video,target){
  const duration=video.duration;
  if(!Number.isFinite(duration)||duration<=0)throw Error('영상 길이를 확인하지 못했습니다.');
  const second=Math.max(0,Math.min(Math.max(0,duration-0.035),target*duration));
  if(Math.abs(video.currentTime-second)<0.012&&video.readyState>=2)return;
  // Install the listener before setting currentTime, then wait for the exact seek to finish.
  const sought=wait(video,'seeked');
  video.currentTime=second;
  await sought;
  if(video.readyState<2)await wait(video,'loadeddata');
 }
 async function framesOf(file,count){
  const url=URL.createObjectURL(file),isImage=file.type.startsWith('image/'),media=document.createElement(isImage?'img':'video');
  try{
   if(isImage){
    const loaded=wait(media,'load');media.src=url;
    if(!media.complete||!media.naturalWidth)await loaded;
    return [makeFrame(media,true)];
   }
   media.muted=true;media.playsInline=true;media.preload='auto';
   const loaded=wait(media,'loadedmetadata');media.src=url;
   if(media.readyState<1)await loaded;
   // Reuse the SAME decoded video element for all timestamps; independent players can
   // capture the first frame repeatedly before their decoders update.
   const chosen=[];
   const times=count===1?[0.5]:[0.12,0.5,0.88,0.25,0.75,0.38,0.62,0.04,0.96];
   for(const time of times){
    await seekTo(media,time);
    const frame=makeFrame(media,false);
    if(chosen.every(previous=>different(previous.signature,frame.signature)))chosen.push(frame);
    if(chosen.length>=count)break;
   }
   return chosen;
  }finally{
   if(!isImage)media.pause();
   media.removeAttribute('src');if(!isImage)media.load();
   URL.revokeObjectURL(url);
  }
 }
 inspect.onclick=async()=>{
  if(busy)return;busy=true;inspect.disabled=true;reset();status.textContent='영상의 서로 다른 시간대를 확인하고 있습니다.';
  try{
   const sources=[...(files.files||[])].slice(0,3);if(!sources.length)throw Error('실제 사진이나 영상을 먼저 선택하세요.');
   const target=sources.length===1?3:1;
   for(const src of sources){
    const extracted=await framesOf(src,target);
    for(const frame of extracted){
     if(images.length>=3)break;
     if(images.some(previous=>!different(previous.signature,frame.signature)))continue;
     images.push(frame);
    }
   }
   if(!images.length)throw Error('추출 가능한 장면이 없습니다.');
   for(const item of images){
    const thumb=el('img');thumb.src=item.image;thumb.alt='실제 원본의 서로 다른 장면';thumb.style.cssText='width:100px;height:125px;object-fit:contain;background:#213730;border-radius:6px';frames.append(thumb);
   }
   status.textContent=images.length+'개 서로 다른 장면 추출 완료'+(images.length<3?' · 원본의 변화가 적어 같은 화면을 억지로 반복하지 않았습니다.':'')+' · 원본은 서버로 전송하지 않았습니다.';
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
   const output=await window.DongbaegVisionAnalyze({frames:images.map(item=>item.image)});
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
