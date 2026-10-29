/* v11: Minchae's local 15-second short-form video editor.
   Browser-only silent WebM export from real uploaded photos/clips; no external API/AI render. */
(()=>{
 'use strict';
 const office=document.querySelector('#db-ai-desk');if(!office)return;
 const n=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const root=n('section');root.id='db-video-studio';root.style.cssText='border:1px solid #b4c7c1;background:#f5faf8;color:#203f37;padding:16px;border-radius:12px;margin:14px 0';
 root.append(n('h3','임민채 대리 · 영상 제작실'));
 root.append(n('p','실제 촬영 사진·영상 최대 5개로 15초 세로 무음 숏폼을 제작합니다. 브라우저가 지원하는 경우 WebM으로 내려받습니다. MP4·음악·자동 게시 기능은 아니며, 실제 영상 파일을 만들기 전에는 제작 완료라고 표시하지 않습니다.'));
 const form=n('div');form.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px';
 const label=(title,input)=>{const l=n('label',title);l.style.cssText='font-size:13px;font-weight:700;display:grid;gap:5px';l.append(input);form.append(l);return l;};
 const sources=n('input');sources.type='file';sources.id='db-video-files';sources.multiple=true;sources.accept='image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';label('실제 사진·영상 선택 (최대 5개)',sources);
 const title=n('input');title.id='db-video-title';title.maxLength=55;title.placeholder='첫 2초 후킹 문구';label('영상 첫 문구',title);
 const subtitle=n('input');subtitle.id='db-video-subtitle';subtitle.maxLength=70;subtitle.placeholder='평일 낮, 우리만 아는 바다';label('중간 안내 문구',subtitle);
 const cta=n('input');cta.id='db-video-cta';cta.maxLength=85;cta.value='네이버에서 ‘포항 동백팬션’ 검색';label('마지막 3초 CTA',cta);
 for(const input of [title,subtitle,cta,sources])input.style.cssText='width:100%;box-sizing:border-box;min-width:0;background:white;color:#243e36;border:1px solid #b4c6b7;border-radius:7px;padding:8px;font-size:13px';
 const preview=n('div');preview.id='db-video-preview';preview.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:9px 0';
 const actions=n('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:9px 0';
 const render=n('button','15초 무음 WebM 제작');render.type='button';render.id='db-video-render';render.style.cssText='padding:10px 15px;background:#326a53;color:white;border-radius:8px;border:0;font-weight:700';
 const cancel=n('button','제작 중단');cancel.type='button';cancel.id='db-video-cancel';cancel.disabled=true;
 const download=n('a','');download.id='db-video-download';download.hidden=true;download.textContent='완성 영상 다운로드';download.style.cssText='padding:10px 15px;background:#e9eedc;color:#24543e;border-radius:8px';
 actions.append(render,cancel,download);
 const status=n('p','영상 소스를 업로드한 다음 시작하세요. WebM을 지원하지 않는 브라우저에서는 제작할 수 없습니다.');status.id='db-video-status';status.setAttribute('role','status');
 const canvas=n('canvas');canvas.id='db-video-canvas';canvas.width=360;canvas.height=640;canvas.style.cssText='display:block;width:min(210px,100%);height:auto;border:1px solid #bfc8c0;border-radius:8px';
 const attribution=n('p','사진·동영상은 이 브라우저 안에서만 편집됩니다. 원본은 외부 AI 서버에 보내지 않으며, 제작된 영상은 직접 다운로드해야 보존됩니다.');
 root.append(form,preview,actions,status,canvas,attribution);office.append(root);
 let selected=[],urls=[],run=null,finalUrl=null;
 const clean=(v,max)=>String(v||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
 const ctx=canvas.getContext('2d');
 function cover(source){
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
  if(!sw||!sh)return;
  const ratio=Math.max(360/sw,640/sh),w=sw*ratio,h=sh*ratio;
  ctx.drawImage(source,(360-w)/2,(640-h)/2,w,h);
 }
 function wrapped(s,y,size,maxLines){
  ctx.font='800 '+size+'px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
  const parts=clean(s,85).split(/\s+/);let line='',lines=[];
  for(const part of parts){const next=line?line+' '+part:part;if(ctx.measureText(next).width>310&&line){lines.push(line);line=part;}else line=next;}
  if(line)lines.push(line);
  lines=lines.slice(0,maxLines);ctx.fillStyle='#fff';
  for(const text of lines){ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=7;ctx.fillText(text,180,y,320);ctx.shadowBlur=0;y+=size*1.24;}
 }
 function drawFrame(asset,sec){
  ctx.fillStyle='#163f47';ctx.fillRect(0,0,360,640);
  if(asset?.image&&asset.image.complete&&asset.image.naturalWidth)cover(asset.image);
  if(asset?.video&&asset.video.readyState>=2)cover(asset.video);
  const shade=ctx.createLinearGradient(0,0,0,640);shade.addColorStop(0,'rgba(0,20,24,.5)');shade.addColorStop(.48,'rgba(0,20,24,.04)');shade.addColorStop(1,'rgba(0,20,24,.9)');ctx.fillStyle=shade;ctx.fillRect(0,0,360,640);
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1;ctx.strokeRect(18,18,324,604);
  if(sec<2)wrapped(title.value||'동백팬션에서 쉬어가요',65,31,3);
  if(sec>=2&&sec<12)wrapped(subtitle.value||'바다를 바라보며 즐기는 휴식',455,24,3);
  if(sec>=12){ctx.fillStyle='rgba(255,247,224,.96)';ctx.fillRect(20,496,320,100);ctx.fillStyle='#17463f';ctx.font='800 19px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.fillText('예약·상세 안내',180,529);ctx.fillStyle='#17463f';wrapped(cta.value||'네이버에서 포항 동백팬션 검색',552,19,2);}
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(20,610,320*Math.min(1,sec/15),4);
 }
 function clear(){
  for(const u of urls)URL.revokeObjectURL(u);urls=[];
  selected.forEach(x=>{if(x.video){x.video.pause();x.video.removeAttribute('src');x.video.load();}});
  selected=[];preview.replaceChildren();
 }
 function resetDownload(){download.hidden=true;if(finalUrl){URL.revokeObjectURL(finalUrl);finalUrl=null;}download.removeAttribute('href');}
 sources.onchange=async()=>{
  if(run){status.textContent='제작 중에는 소스를 바꿀 수 없습니다.';return;}
  clear();resetDownload();
  const files=[...(sources.files||[])];
  if(files.length>5){status.textContent='최대 5개만 업로드하세요.';sources.value='';return;}
  if(files.some(f=>!['image/png','image/jpeg','image/webp','video/mp4','video/webm','video/quicktime'].includes(f.type)||f.size>60*1024*1024)){status.textContent='지원되는 JPG·PNG·WebP·MP4·WebM·MOV 파일만, 각 60MB 이하로 선택하세요.';sources.value='';return;}
  if(files.reduce((a,f)=>a+f.size,0)>150*1024*1024){status.textContent='소스 전체 크기는 최대 150MB입니다.';sources.value='';return;}
  for(const file of files){
   const url=URL.createObjectURL(file);urls.push(url);let asset={file,url};
   if(file.type.startsWith('image/')){const img=n('img');img.src=url;img.style.cssText='width:78px;height:105px;object-fit:cover';asset.image=img;const item=n('div');item.append(img,n('small',file.name));preview.append(item);}
   else{const video=n('video');video.src=url;video.muted=true;video.playsInline=true;video.preload='metadata';video.style.cssText='width:78px;height:105px;object-fit:cover';asset.video=video;const item=n('div');item.append(video,n('small',file.name));preview.append(item);}
   selected.push(asset);
  }
  status.textContent=files.length+'개 자료 선택 · 15초 9:16, 무음 WebM · 컷별 길이는 자동 배분됩니다.';
  drawFrame(selected[0],0);
 };
 async function prepareAsset(asset){
  if(asset.image){
   if(!asset.image.complete||!asset.image.naturalWidth)await new Promise((resolve,reject)=>{asset.image.onload=resolve;asset.image.onerror=()=>reject(Error('사진을 읽지 못했습니다: '+asset.file.name));});
  }
  if(asset.video){
   await new Promise((resolve,reject)=>{
    if(asset.video.readyState>=2){resolve();return;}
    const done=()=>{asset.video.removeEventListener('loadeddata',done);asset.video.removeEventListener('error',fail);resolve();};
    const fail=()=>{asset.video.removeEventListener('loadeddata',done);asset.video.removeEventListener('error',fail);reject(Error('영상 코덱을 읽지 못했습니다: '+asset.file.name));};
    asset.video.addEventListener('loadeddata',done);asset.video.addEventListener('error',fail);
    asset.video.load();
   });
  }
 }
 cancel.onclick=()=>{if(run)run.cancelled=true;};
 render.onclick=async()=>{
  if(run)return;
  if(!selected.length){status.textContent='최소 한 개의 사진 또는 영상이 필요합니다.';return;}
  if(!canvas.captureStream||typeof MediaRecorder==='undefined'){status.textContent='현재 브라우저에서는 WebM 영상 제작을 지원하지 않습니다. 크롬 최신 버전을 사용하세요.';return;}
  const type=['video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
  if(!type){status.textContent='WebM 인코딩이 지원되지 않습니다. 최신 Chrome에서 실행하세요.';return;}
  const state={cancelled:false};run=state;render.disabled=true;cancel.disabled=false;sources.disabled=true;resetDownload();
  let recorder=null,stream=null,timer=null;
  try{
   await Promise.all(selected.map(prepareAsset));
   const segments=selected.slice();const segmentSeconds=15/segments.length;
   stream=canvas.captureStream(20);
   const chunks=[];recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:950000});
   const result=new Promise((resolve,reject)=>{
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=e=>reject(e.error||Error('영상 인코딩 실패'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));
   });
   let step=0,active=null,previous=performance.now();const started=performance.now();
   const tick=()=>{
    if(run!==state)return;
    const elapsed=Math.min(15,(performance.now()-started)/1000),index=Math.min(segments.length-1,Math.floor(elapsed/segmentSeconds));
    if(index!==step||!active){active?.video?.pause();active=segments[index];step=index;if(active.video){active.video.currentTime=0;active.video.play().catch(()=>{});}}
    drawFrame(active,elapsed);
    status.textContent='무음 WebM 제작 중 · '+Math.floor(elapsed)+'/15초'+(state.cancelled?' · 중단 요청됨':'');
    if(elapsed>=15||state.cancelled){clearInterval(timer);timer=null;recorder.stop();}
   };
   drawFrame(segments[0],0);
   recorder.start(500);tick();timer=setInterval(tick,50);
   const blob=await result;
   if(state.cancelled){status.textContent='영상 제작을 취소했습니다. 저장된 파일은 없습니다.';}
   else if(blob.size<1000){status.textContent='파일 인코딩이 완료되지 않았습니다. 브라우저 호환성을 확인하세요.';}
   else{finalUrl=URL.createObjectURL(blob);download.href=finalUrl;download.download='동백팬션-15초-무음-숏폼.webm';download.hidden=false;status.textContent='15초 무음 WebM 완성 · '+(blob.size/1024/1024).toFixed(2)+'MB · 음악·실제 게시 여부는 별도 검토하세요.';}
  }catch(e){status.textContent='영상 제작 실패: '+(e.message||'원본 파일·브라우저 지원을 확인하세요.');}
  finally{if(timer)clearInterval(timer);if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}stream?.getTracks().forEach(track=>track.stop());selected.forEach(x=>x.video?.pause());run=null;render.disabled=false;cancel.disabled=true;sources.disabled=false;}
 };
 drawFrame(null,0);
})();