/* v5: text-planned real PNG posters, using only local photographs and browser Canvas. */
(() => {
 'use strict';
 const NAME='dongbaek-poster-studio-v1', SIZE=8*1024*1024;
 let selected=null;
 const clean=(s,n)=>String(s||'').replace(/[<>]/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
 function openDB(){return new Promise((ok,bad)=>{
  if(!indexedDB)return bad(Error('이 브라우저에서 이미지 저장이 불가능합니다.'));
  const req=indexedDB.open(NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'});};
  req.onsuccess=()=>ok(req.result);req.onerror=()=>bad(req.error);
 });}
 async function item(mode,id,data){
  const db=await openDB();
  try{return await new Promise((ok,bad)=>{
   const tx=db.transaction('files',mode==='write'?'readwrite':'readonly');
   const req=mode==='write'?tx.objectStore('files').put(data):tx.objectStore('files').get(id);
   req.onsuccess=()=>ok(req.result||null);req.onerror=()=>bad(req.error);
   tx.onerror=()=>bad(tx.error);
  });}finally{db.close();}
 }
 function verifyPhoto(file){
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<1||file.size>SIZE)throw Error('JPG·PNG·WebP 사진을 8MB 이하로 선택하세요.');
 }
 function getDesign(raw,task){
  let data={};
  const s=String(raw||'');
  try{const start=s.indexOf('{'),end=s.lastIndexOf('}');if(start>=0&&end>start)data=JSON.parse(s.slice(start,end+1));}catch{}
  const brand=/동백팬션|동백펜션|dongbaeg/i.test(task.title+' '+task.brief);
  return {
   headline:clean(data.headline||task.title,46),
   subtitle:clean(data.subtitle||(brand?'애견동반 · 바다 전망 · 개별 바베큐 · 불멍':'자세한 내용은 본문에서 확인하세요.'),100),
   cta:clean(data.cta||(brand?"네이버에서 '포항 동백팬션' 검색":'자세한 내용은 본문 참고'),65)
  };
 }
 function wrap(ctx,str,width,max){
  const words=String(str||'').split(/\s+/),out=[];let line='';
  for(const word of words){
   let next=line?line+' '+word:word;
   if(ctx.measureText(next).width<=width){line=next;continue;}
   if(line)out.push(line);
   line='';
   for(const ch of [...word]){if(ctx.measureText(line+ch).width>width&&line){out.push(line);line='';}line+=ch;}
  }
  if(line)out.push(line);
  if(out.length>max){
   out.length=max;let tail=out[max-1];
   while(tail&&ctx.measureText(tail+'…').width>width)tail=tail.slice(0,-1);
   out[max-1]=tail+'…';
  }
  return out;
 }
 function text(ctx,s,x,y,font,width,max=3,step=1.3,color='white'){
  ctx.font='700 '+font+'px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  ctx.fillStyle=color;ctx.textBaseline='top';
  for(const line of wrap(ctx,s,width,max)){ctx.fillText(line,x,y);y+=font*step;}
  return y;
 }
 async function draw(data,photo){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
  const c=canvas.getContext('2d');if(!c)throw Error('브라우저 이미지 제작을 지원하지 않습니다.');
  const g=c.createLinearGradient(0,0,1080,1920);
  g.addColorStop(0,'#163d46');g.addColorStop(1,'#0e242e');c.fillStyle=g;c.fillRect(0,0,1080,1920);
  if(photo){
   const bitmap=await createImageBitmap(photo);
   try{const f=Math.max(1080/bitmap.width,1920/bitmap.height),w=bitmap.width*f,h=bitmap.height*f;c.drawImage(bitmap,(1080-w)/2,(1920-h)/2,w,h);}
   finally{bitmap.close?.();}
  }else{
   // Graphic-only background, never a fictitious guesthouse or pet photo.
   c.fillStyle='#35717c';c.beginPath();c.ellipse(850,410,590,295,-.3,0,Math.PI*2);c.fill();
   c.fillStyle='#d5ac77';c.beginPath();c.arc(790,475,115,0,Math.PI*2);c.fill();
   c.fillStyle='#2e5c64';c.beginPath();c.ellipse(130,1160,650,320,-.3,0,Math.PI*2);c.fill();
  }
  const shade=c.createLinearGradient(0,0,0,1920);shade.addColorStop(0,'rgba(0,24,30,.46)');
  shade.addColorStop(.45,'rgba(0,24,30,.10)');shade.addColorStop(.69,'rgba(0,24,30,.72)');shade.addColorStop(1,'rgba(0,24,30,.96)');
  c.fillStyle=shade;c.fillRect(0,0,1080,1920);
  c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=3;c.strokeRect(44,44,992,1832);
  text(c,'DONGBAEG  ·  PENSION',86,98,35,910,1);
  c.fillStyle='#e6c794';c.fillRect(86,1183,98,9);
  const end=text(c,data.headline,86,1230,91,905,3,1.33);
  text(c,data.subtitle,90,Math.min(1580,end+30),41,900,3,1.42);
  c.fillStyle='#fff7e7';c.fillRect(78,1740,924,105);
  text(c,data.cta,108,1768,35,850,1,1.2,'#224348');
  return await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('PNG 저장에 실패했습니다.')),'image/png'));
 }
 async function prepare(id,photo){
  verifyPhoto(photo);const old=await item('read',id);
  await item('write',id,{id,photo:photo||old?.photo||null,png:old?.png||null,design:old?.design||null,title:old?.title||'',updated:Date.now()});
 }
 async function generate(id,task){
  const old=await item('read',id)||{id,photo:null};
  const design=getDesign(task.designText,task),png=await draw(design,old.photo);
  await item('write',id,{...old,png,design,title:task.title,updated:Date.now()});
  scan();
  return {size:png.size,hasPhoto:Boolean(old.photo)};
 }
 function download(row){
  const url=URL.createObjectURL(row.png),a=document.createElement('a');
  a.href=url;a.download='동백사무실-'+clean(row.title,58).replace(/[\\/:*?"|]/g,'-')+'.png';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),25000);
 }
 function addCard(card,row){
  if(card.querySelector('.db-poster-result'))return;
  const shell=document.createElement('section');shell.className='db-poster-result';
  shell.style.cssText='margin:12px 0;padding:15px;background:#eef4e9;border:1px solid #becdb4;border-radius:10px';
  const h=document.createElement('h4');h.textContent='임민채 대리 · 실제 포스터 이미지';shell.append(h);
  const desc=document.createElement('p');desc.textContent=row.png?'PNG 1080×1920 · 이 브라우저에 저장됨 · 게시 전 검토 필요':'포스터 생성이 미완료 상태입니다. 아래에서 다시 만들어 보세요.';shell.append(desc);
  if(row.png){
   const img=document.createElement('img');img.alt='실제 사진 또는 그래픽 기반 홍보 포스터';img.style.cssText='width:min(100%,270px);height:auto;display:block;margin:12px 0;border-radius:7px';
   const url=URL.createObjectURL(row.png);img.src=url;img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);shell.append(img);
   const btn=document.createElement('button');btn.textContent='포스터 PNG 내려받기';btn.dataset.posterDownload=row.id;btn.onclick=()=>download(row);shell.append(btn);
  }
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='문구·사진 수정하기 (GPT 요금 없음)';
  details.append(summary);
  const fields={};
  for(const [key,label,max] of [['headline','큰 제목',46],['subtitle','보조 문구',100],['cta','마지막 안내',65]]){
   const wrap=document.createElement('label');wrap.textContent=label;
   const input=document.createElement('input');input.type='text';input.maxLength=max;input.value=row.design?.[key]||'';
   input.style.cssText='display:block;box-sizing:border-box;width:100%;padding:8px;margin:4px 0 9px;border:1px solid #b9c4ad;border-radius:4px';wrap.append(input);details.append(wrap);fields[key]=input;
  }
  const photoLabel=document.createElement('label');photoLabel.textContent='실제 사진 변경 (선택) ';
  const photoInput=document.createElement('input');photoInput.type='file';photoInput.accept='image/png,image/jpeg,image/webp';photoLabel.append(photoInput);details.append(photoLabel);
  const edit=document.createElement('button');edit.type='button';edit.textContent='포스터 다시 만들기';details.append(edit);
  const status=document.createElement('p');status.setAttribute('role','status');details.append(status);
  edit.onclick=async()=>{
   edit.disabled=true;status.textContent='이미지를 생성하고 있습니다.';
   try{
    const photo=photoInput.files?.[0]||row.photo||null;verifyPhoto(photo);
    const design=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,clean(v.value,k==='subtitle'?100:65)]));
    if(!design.headline||!design.cta)throw Error('큰 제목과 마지막 안내를 적어 주세요.');
    const png=await draw(design,photo);
    await item('write',row.id,{...row,photo,design,png,updated:Date.now()});
    shell.remove();scan();
   }catch(e){status.textContent=e.message||'수정 실패';}finally{edit.disabled=false;}
  };
  shell.append(details);card.append(shell);
 }
 async function scan(){
  for(const card of document.querySelectorAll('#db-ai-jobs [data-ai-job]')){
   if(card.querySelector('.db-poster-result'))continue;
   try{const row=await item('read',card.dataset.aiJob);if(row&&card.isConnected)addCard(card,row);}catch{}
  }
 }
 function install(form){
  const label=document.createElement('label');label.textContent='실제 사진 (선택) · JPG/PNG/WebP · 8MB 이하';
  const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.id='db-manager-photo';label.append(input);
  const note=document.createElement('small');note.textContent='사진은 외부 AI 서버로 보내지 않습니다. 사진이 없으면 객실을 묘사하지 않는 그래픽 포스터를 만듭니다.';note.style.display='block';label.append(note);
  form.insertBefore(label,form.querySelector('button[type=submit]'));
  input.onchange=()=>{selected=input.files?.[0]||null;try{verifyPhoto(selected);}catch(e){selected=null;input.value='';document.getElementById('db-manager-quick-progress').textContent=e.message;}};
  document.addEventListener('dongbaek-ai-jobs',scan);scan();
 }
 window.DongbaekPosterStudio=Object.freeze({install,prepare,generate,scan,selectedPhoto:()=>selected,
  available:async()=>{try{const d=await openDB();d.close();return true;}catch{return false;}}});
})();