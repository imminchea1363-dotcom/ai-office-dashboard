/* Minchae local 15s short-form editor: real photos/clips only. Browser-native MP4 when supported, WebM otherwise; never mislabeled. */
(()=>{
 'use strict';
 const office=document.querySelector('#db-ai-desk');if(!office)return;
 const n=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const root=n('section');root.id='db-video-studio';root.style.cssText='border:1px solid #b4c7c1;background:#f5faf8;color:#203f37;padding:16px;border-radius:12px;margin:14px 0';
 root.append(n('h3','임민채 대리 · 영상 제작실'));
 root.append(n('p','실제 촬영 사진·영상 최대 5개로 15초 무음 세로 영상을 제작합니다. 기본 자막은 삽입하지 않습니다. 영상 장면 분석은 별도 명시 승인과 AI 서버 연결 후에만 실행됩니다.'));
 const form=n('div');form.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px';
 const label=(title,input)=>{const l=n('label',title);l.style.cssText='font-size:13px;font-weight:700;display:grid;gap:5px';l.append(input);form.append(l);return l;};
 const sources=n('input');sources.type='file';sources.id='db-video-files';sources.multiple=true;sources.accept='image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';label('실제 사진·영상 선택 (최대 5개)',sources);
 const title=n('input');title.id='db-video-title';title.maxLength=55;title.placeholder='첫 2초 후킹 문구';label('영상 첫 문구',title);
 const subtitle=n('input');subtitle.id='db-video-subtitle';subtitle.maxLength=70;subtitle.placeholder='평일 낮, 우리만 아는 바다';label('중간 안내 문구',subtitle);
 const cta=n('input');cta.id='db-video-cta';cta.maxLength=85;cta.value='';label('마지막 3초 CTA',cta);
 const format=n('select');format.id='db-video-format';
 for(const [value,name] of [['auto','자동 · MP4 우선'],['mp4','MP4 (지원 브라우저만)'],['webm','WebM']]){const opt=n('option',name);opt.value=value;format.append(opt);}
 label('출력 파일 형식',format);
 const quality=n('select');quality.id='db-video-quality';
 for(const [value,name] of [['720','720×1280 · 권장'],['1080','1080×1920 · 고화질']]){const opt=n('option',name);opt.value=value;quality.append(opt);}
 label('출력 영상 해상도 (9:16)',quality);
 for(const input of [title,subtitle,cta,sources,format,quality])input.style.cssText='width:100%;box-sizing:border-box;min-width:0;background:white;color:#243e36;border:1px solid #b4c6b7;border-radius:7px;padding:8px;font-size:13px';
 const cutEditor=n('div');cutEditor.id='db-video-cuts';cutEditor.style.cssText='display:grid;gap:8px;margin:9px 0';
 const preview=n('div');preview.id='db-video-preview';preview.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:9px 0';
 const cutNote=n('p','선택한 소스별 자막을 입력하고 위·아래 버튼으로 장면 순서를 바꿀 수 있습니다. 각 장면은 동일한 길이로 배분됩니다.');
 cutNote.style.cssText='font-size:12px;color:#416557';
 const actions=n('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin:9px 0';
 const render=n('button','15초 무음 영상 제작');render.type='button';render.id='db-video-render';render.style.cssText='padding:10px 15px;background:#326a53;color:white;border-radius:8px;border:0;font-weight:700';
 const cancel=n('button','제작 중단');cancel.type='button';cancel.id='db-video-cancel';cancel.disabled=true;
 const download=n('a','');download.id='db-video-download';download.hidden=true;download.textContent='완성 영상 다운로드';download.style.cssText='padding:10px 15px;background:#e9eedc;color:#24543e;border-radius:8px';
 const toSns=n('button','완성 영상을 SNS 초안으로 보내기');toSns.type='button';toSns.id='db-video-to-sns';toSns.disabled=true;toSns.style.cssText='padding:9px 12px;border-radius:8px;border:1px solid #8ba68c;background:#ecf2e5;color:#254936';
 const saveLocal=n('button','완성 영상 보관함에 저장');saveLocal.type='button';saveLocal.id='db-video-save';saveLocal.disabled=true;
 actions.append(render,cancel,download,saveLocal,toSns);
 const status=n('p','영상 소스를 업로드한 다음 시작하세요. WebM을 지원하지 않는 브라우저에서는 제작할 수 없습니다.');status.id='db-video-status';status.setAttribute('role','status');
 const canvas=n('canvas');canvas.id='db-video-canvas';canvas.width=720;canvas.height=1280;canvas.style.cssText='display:block;width:min(210px,100%);height:auto;border:1px solid #bfc8c0;border-radius:8px';
 const timeline=n('p','컷 구성: 0–2초 후킹 / 2–12초 시설·풍경 / 12–15초 예약 CTA');timeline.id='db-video-timeline';
 const playback=n('video');playback.id='db-video-playback';playback.controls=true;playback.playsInline=true;playback.hidden=true;playback.style.cssText='width:min(230px,100%);max-height:420px;margin:10px 0;border-radius:8px';
 const attribution=n('p','사진·동영상은 이 브라우저 안에서만 편집됩니다. 원본은 외부 AI 서버에 보내지 않으며, 제작된 영상은 직접 다운로드해야 보존됩니다.');
 root.append(form,timeline,cutNote,cutEditor,preview,actions,status,canvas,playback,attribution);office.append(root);
 let selected=[],urls=[],run=null,finalUrl=null,completedBlob=null,savedVideoId='',renderedCuts=[];
 let linkedJobId='',linkedVideoId='';
 document.addEventListener('dongbaek-video-job-select',event=>{
  const d=event.detail||{};if(typeof d.jobId!=='string'||d.jobId.length>100||run)return;
  linkedJobId=d.jobId;linkedVideoId='';resetDownload();
  title.value=String(d.title||'').slice(0,title.maxLength);
  status.textContent='영상 업무가 연결됐습니다. 완성 영상을 저장하면 대표실 검수 대기에 등록합니다.';
 });
 const clean=(v,max)=>String(v||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
 const ctx=canvas.getContext('2d');
 const formats={mp4:['video/mp4;codecs=avc1.42E01E','video/mp4'],webm:['video/webm;codecs=vp8','video/webm']};
 function supported(type){return typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(type);}
 function chooseFormat(){const requested=format.value;const candidates=requested==='auto'?[...formats.mp4,...formats.webm]:formats[requested]||formats.webm;return candidates.find(supported)||null;}
 function isRealVideo(bytes,kind){return kind==='mp4'?bytes.length>12&&String.fromCharCode(...bytes.subarray(4,8))==='ftyp':bytes.length>4&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163;}
 function updateSupport(){const canMp4=formats.mp4.some(supported);format.querySelector('option[value=mp4]').disabled=!canMp4;format.title=canMp4?'브라우저가 MP4 녹화를 지원합니다.':'이 브라우저는 MP4 녹화를 지원하지 않습니다.';status.textContent=canMp4?'MP4 녹화 지원 브라우저 · 기본값은 자동 선택입니다.':'MP4 인코딩 미지원 브라우저 · WebM 출력은 가능합니다. MP4 파일은 별도 변환이 필요합니다.';}
 format.onchange=()=>{if(run)return;resetDownload();updateSupport();if(format.value==='mp4'&&!formats.mp4.some(supported))status.textContent='이 브라우저는 MP4를 제작할 수 없습니다. 자동 또는 WebM을 선택하세요.';};
 quality.onchange=()=>{if(run)return;resetDownload();canvas.width=Number(quality.value);canvas.height=Number(quality.value)*16/9;drawFrame(selected[0],0);};
 function cover(source){
  const sw=source.videoWidth||source.naturalWidth||source.width,sh=source.videoHeight||source.naturalHeight||source.height;
  if(!sw||!sh)return;
  const ratio=Math.max(360/sw,640/sh),w=sw*ratio,h=sh*ratio;
  ctx.drawImage(source,(360-w)/2,(640-h)/2,w,h);
 }
 function wrapped(s,y,size,maxLines,color='#fff'){
  ctx.font='800 '+size+'px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
  const parts=clean(s,85).split(/\s+/);let line='',lines=[];
  for(const part of parts){const next=line?line+' '+part:part;if(ctx.measureText(next).width>310&&line){lines.push(line);line=part;}else line=next;}
  if(line)lines.push(line);
  lines=lines.slice(0,maxLines);ctx.fillStyle=color;
  for(const text of lines){ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=7;ctx.fillText(text,180,y,320);ctx.shadowBlur=0;y+=size*1.24;}
 }
 function drawFrame(asset,sec){
  ctx.setTransform(canvas.width/360,0,0,canvas.height/640,0,0);
  ctx.fillStyle='#163f47';ctx.fillRect(0,0,360,640);
  if(asset?.image&&asset.image.complete&&asset.image.naturalWidth)cover(asset.image);
  if(asset?.video&&asset.video.readyState>=2)cover(asset.video);
  const shade=ctx.createLinearGradient(0,0,0,640);shade.addColorStop(0,'rgba(0,20,24,.5)');shade.addColorStop(.48,'rgba(0,20,24,.04)');shade.addColorStop(1,'rgba(0,20,24,.9)');ctx.fillStyle=shade;ctx.fillRect(0,0,360,640);
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1;ctx.strokeRect(18,18,324,604);
  if(sec<2)wrapped(title.value.trim(),65,31,3);
  if(sec>=2&&sec<12)wrapped(asset?.caption||subtitle.value.trim(),455,24,3);
  if(sec>=12&&cta.value.trim()){ctx.fillStyle='rgba(255,247,224,.96)';ctx.fillRect(20,496,320,100);ctx.fillStyle='#17463f';ctx.font='800 19px "Malgun Gothic",sans-serif';ctx.textAlign='center';ctx.fillText('안내',180,529);wrapped(cta.value.trim(),552,19,2,'#17463f');}
  ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(20,610,320*Math.min(1,sec/15),4);
 }
 function updateTimeline(){
  const duration=selected.length?(15/selected.length).toFixed(1):'—';
  timeline.textContent='15초 영상 · '+selected.length+'컷 · 컷당 '+duration+'초 · 0~2초 후킹 · 12~15초 CTA';
 }
 function rebuildCuts(){
  cutEditor.replaceChildren();updateTimeline();
  selected.forEach((asset,i)=>{
   const row=n('div');row.dataset.videoCut=String(i);row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:1px solid #b5c7bb;padding:8px;border-radius:8px;background:#fff';
   const header=n('strong',(i+1)+'번 장면 · '+asset.file.name.slice(0,55));header.style.cssText='font-size:12px;flex:1 1 160px';
   const caption=n('input');caption.type='text';caption.dataset.videoCaption=String(i);caption.maxLength=70;caption.placeholder='이 장면의 자막 (선택)';caption.value=asset.caption||'';
   caption.style.cssText='flex:2 1 180px;min-width:0;border:1px solid #aabcae;border-radius:5px;padding:8px;background:white;color:#28463e';
   caption.oninput=()=>{asset.caption=caption.value;resetDownload();drawFrame(asset,3);};
   const prev=n('button','↑');prev.type='button';prev.dataset.videoUp=String(i);prev.disabled=i===0;
   const next=n('button','↓');next.type='button';next.dataset.videoDown=String(i);next.disabled=i===selected.length-1;
   for(const b of [prev,next])b.style.cssText='padding:7px 12px;border:1px solid #a6b9a4;border-radius:5px;cursor:pointer';
   prev.onclick=()=>moveCut(i,-1);next.onclick=()=>moveCut(i,1);
   row.append(header,caption,prev,next);cutEditor.append(row);
  });
 }
 function moveCut(index,delta){
  if(run)return;
  const target=index+delta;if(target<0||target>=selected.length)return;
  [selected[index],selected[target]]=[selected[target],selected[index]];
  resetDownload();rebuildCuts();drawFrame(selected[target],3);
 }
 function clear(){
  for(const u of urls)URL.revokeObjectURL(u);urls=[];
  selected.forEach(x=>{if(x.video){x.video.pause();x.video.removeAttribute('src');x.video.load();}});
  selected=[];preview.replaceChildren();rebuildCuts();
 }
 function resetDownload(){completedBlob=null;savedVideoId='';saveLocal.disabled=true;toSns.disabled=true;download.hidden=true;playback.pause();playback.hidden=true;playback.removeAttribute('src');playback.load();if(finalUrl){URL.revokeObjectURL(finalUrl);finalUrl=null;}download.removeAttribute('href');}
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
  rebuildCuts();
  status.textContent=files.length+'개 실제 자료 선택 · 15초 무음 9:16 · 컷 길이는 자동 배분됩니다.';
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
  if(!canvas.captureStream||typeof MediaRecorder==='undefined'){status.textContent='이 브라우저에서는 영상 제작을 지원하지 않습니다. 최신 Chrome을 사용하세요.';return;}
  const type=chooseFormat();
  if(!type){status.textContent=format.value==='mp4'?'MP4 출력 미지원 브라우저입니다. 자동 또는 WebM을 선택하세요.':'지원되는 영상 인코더가 없습니다. 브라우저를 확인하세요.';return;}
  const fileKind=type.startsWith('video/mp4')?'mp4':'webm';
  const state={cancelled:false};run=state;render.disabled=true;cancel.disabled=false;sources.disabled=true;format.disabled=true;quality.disabled=true;resetDownload();
  let recorder=null,stream=null,timer=null;
  try{
   await Promise.all(selected.map(prepareAsset));
   const segments=selected.slice();const segmentSeconds=15/segments.length;renderedCuts=segments.map(a=>({name:a.file.name,caption:a.caption||''}));
   stream=canvas.captureStream(20);
   const chunks=[];recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:quality.value==='1080'?4500000:2400000});
   const result=new Promise((resolve,reject)=>{
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onerror=e=>reject(e.error||Error('영상 인코딩 실패'));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:fileKind==='mp4'?'video/mp4':'video/webm'}));
   });
   let step=0,active=null;const started=performance.now();
   const tick=()=>{
    if(run!==state)return;
    const elapsed=Math.min(15,(performance.now()-started)/1000),index=Math.min(segments.length-1,Math.floor(elapsed/segmentSeconds));
    if(index!==step||!active){active?.video?.pause();active=segments[index];step=index;if(active.video){active.video.currentTime=0;active.video.play().catch(()=>{});}}
    drawFrame(active,elapsed);
    status.textContent='무음 '+fileKind.toUpperCase()+' 제작 중 · '+Math.floor(elapsed)+'/15초'+(state.cancelled?' · 중단 요청됨':'');
    if(elapsed>=15||state.cancelled){clearInterval(timer);timer=null;recorder.stop();}
   };
   drawFrame(segments[0],0);
   recorder.start(500);tick();timer=setInterval(tick,50);
   const blob=await result;
   if(state.cancelled){status.textContent='영상 제작을 취소했습니다. 저장된 파일은 없습니다.';}
   else if(blob.size<1000){status.textContent='파일 인코딩이 완료되지 않았습니다. 브라우저 호환성을 확인하세요.';}
   else{
    const signature=new Uint8Array(await blob.slice(0,16).arrayBuffer());
    if(!isRealVideo(signature,fileKind))throw Error('파일 헤더를 검증하지 못했습니다. 다운로드를 중단했습니다.');
    finalUrl=URL.createObjectURL(blob);download.href=finalUrl;download.download='동백팬션-15초-무음-숏폼.'+fileKind;download.hidden=false;
    completedBlob=blob;playback.src=finalUrl;playback.hidden=false;saveLocal.disabled=false;toSns.disabled=false;
    status.textContent='15초 '+canvas.width+'×'+canvas.height+' 무음 '+fileKind.toUpperCase()+' 완성 · '+(blob.size/1024/1024).toFixed(2)+'MB · 아래에서 미리 보고 게시 전 검수하세요.';
   }
  }catch(e){status.textContent='영상 제작 실패: '+(e.message||'원본 파일·브라우저 지원을 확인하세요.');}
  finally{if(timer)clearInterval(timer);if(recorder&&recorder.state!=='inactive'){try{recorder.stop();}catch{}}stream?.getTracks().forEach(track=>track.stop());selected.forEach(x=>x.video?.pause());run=null;render.disabled=false;cancel.disabled=true;sources.disabled=false;format.disabled=false;quality.disabled=false;}
 };
 async function persistVideo(){
  if(!completedBlob)throw Error('먼저 영상을 완성해 주세요.');
  const library=window.DongbaegVideoLibrary;
  if(!library)throw Error('영상 보관함을 불러오지 못했습니다.');
  if(savedVideoId){const existing=await library.get(savedVideoId);if(existing)return existing;}
  const row=await library.save(completedBlob,{title:title.value.trim()||'15초 영상',subtitle:subtitle.value,cta:cta.value,
   width:canvas.width,height:canvas.height,cuts:renderedCuts});
  savedVideoId=row.id;
  if(linkedJobId&&linkedVideoId!==row.id){
    linkedVideoId=row.id;
    document.dispatchEvent(new CustomEvent('dongbaek-video-job-completed',{detail:{jobId:linkedJobId,videoId:row.id}}));
  }
  return row;
 }
 saveLocal.onclick=async()=>{
  if(!completedBlob)return;
  saveLocal.disabled=true;
  try{const row=await persistVideo();status.textContent='영상 보관함 저장 완료 · '+row.id.slice(0,10)+'… · 전체 백업으로 다른 기기에 옮길 수 있습니다.';}
  catch(error){status.textContent='영상 저장 실패: '+(error.message||'저장 공간을 확인하세요.');}
  finally{saveLocal.disabled=false;}
 };
 toSns.onclick=async()=>{
  if(!completedBlob)return;
  toSns.disabled=true;
  try{
   const row=await persistVideo();
   if(linkedJobId){
    const job=JSON.parse(localStorage.getItem('dongbaek-ai-desk-v1')||'{}').jobs?.find(j=>j.id===linkedJobId);
    if(!job||job.videoId!==row.id||job.videoReview!=='approved'){status.textContent='대표실에서 완성 영상을 검수 승인한 뒤 SNS 초안으로 연결해 주세요.';return;}
   }
   document.dispatchEvent(new CustomEvent('dongbaek-video-to-sns',{detail:{videoId:row.id,title:row.title,subtitle:row.subtitle,cta:row.cta}}));
   status.textContent='완성 영상과 SNS 초안을 연결했습니다. 검수 후 대표 승인으로 진행하세요. 실제 SNS 게시가 실행된 것은 아닙니다.';
  }catch(error){status.textContent='SNS 초안 연결 실패: '+(error.message||'영상 저장 공간을 확인하세요.');}
  finally{toSns.disabled=false;}
 };
 drawFrame(null,0);
 updateSupport();
})();