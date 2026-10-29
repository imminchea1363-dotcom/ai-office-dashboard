/* v5: text-planned real PNG posters, using only local photographs and browser Canvas. */
(() => {
 'use strict';
 const NAME='dongbaek-poster-studio-v1', SIZE=8*1024*1024, MAX_PHOTOS=5, MAX_TOTAL=30*1024*1024;
 let selected=[];let selectedIndex=0;
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
 function verifyPhotos(files){
  const arr=Array.from(files||[]);
  if(arr.length>MAX_PHOTOS)throw Error('사진은 최대 '+MAX_PHOTOS+'장까지 선택할 수 있습니다.');
  let total=0;
  for(const file of arr){verifyPhoto(file);total+=file.size;}
  if(total>MAX_TOTAL)throw Error('사진 전체 크기는 30MB 이하로 선택하세요.');
  return arr;
 }
 function photoGallery(files,chosen,onPick){
  const gallery=document.createElement('div');gallery.className='db-poster-gallery';
  gallery.style.cssText='display:flex;gap:8px;flex-wrap:wrap;padding:8px 0';
  const urls=[];
  for(const [i,file] of files.entries()){
   const b=document.createElement('button');b.type='button';b.dataset.photoPick=String(i);
   b.setAttribute('aria-pressed',String(i===chosen));b.title='대표 사진 '+(i+1)+'번 선택';
   b.style.cssText='border:3px solid '+(i===chosen?'#276c42':'#c7d4c7')+';padding:3px;border-radius:9px;background:#fff;display:grid;gap:4px;cursor:pointer;';
   const url=URL.createObjectURL(file);urls.push(url);
   const img=document.createElement('img');img.src=url;img.alt='업로드 사진 '+(i+1);img.style.cssText='width:92px;height:82px;object-fit:cover;border-radius:5px';
   const cap=document.createElement('small');cap.textContent=(i===chosen?'✓ 대표 사진 ':'사진 ')+(i+1);
   b.append(img,cap);gallery.append(b);
   b.onclick=()=>onPick(i);
  }
  // URLs are kept through user interaction and released when gallery is detached.
  gallery.cleanup=()=>urls.forEach(url=>URL.revokeObjectURL(url));
  return gallery;
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

 const FORMATS={story:{w:1080,h:1920,label:'스토리·릴스 9:16'},feed:{w:1080,h:1350,label:'인스타 피드 4:5'}};
 const STYLES={
  coastal:{label:'바다 감성',background:'#163d46',accent:'#e6c794',text:'#fff7e7'},
  warm:{label:'따뜻한 휴식',background:'#453c34',accent:'#f0d2a9',text:'#fff7e7'},
  clean:{label:'깔끔한 홍보',background:'#17323b',accent:'#93dccc',text:'#ffffff'}
 };
 function choices(value){
  const obj=value&&typeof value==='object'?value:{};
  return {format:FORMATS[obj.format]?obj.format:'story',template:STYLES[obj.template]?obj.template:'coastal',
   layout:obj.layout==='collage'?'collage':'single',
   selectedIndex:Number.isInteger(obj.selectedIndex)&&obj.selectedIndex>=0?obj.selectedIndex:0};
 }
 function settingsUI(input,id){
  const preset=choices(input),root=document.createElement('div'),selects={};
  root.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(156px,1fr));gap:8px;margin:8px 0';
  const specifications=[
   ['format','포스터 규격',[['story','릴스·스토리 9:16'],['feed','피드 4:5']]],
   ['template','디자인',[['coastal','바다 감성'],['warm','따뜻한 휴식'],['clean','깔끔한 홍보']]],
   ['layout','사진 배치',[['single','대표 사진 1장'],['collage','사진 2~3장 조합']]]
  ];
  for(const [key,title,options] of specifications){
   const label=document.createElement('label');label.textContent=title;label.style.cssText='font-size:13px;font-weight:600';
   const sel=document.createElement('select');sel.id=id+'-'+key;sel.style.cssText='display:block;width:100%;padding:8px;background:white;border:1px solid #aebeb0;border-radius:5px;color:#183b39;font-size:13px';
   for(const [value,display] of options){const option=document.createElement('option');option.value=value;option.textContent=display;sel.append(option);}
   sel.value=preset[key];selects[key]=sel;label.append(sel);root.append(label);
  }
  return {root,get:()=>Object.fromEntries(Object.entries(selects).map(([key,sel])=>[key,sel.value]))};
 }
 function cover(ctx,image,x,y,w,h){
  const ratio=Math.max(w/image.width,h/image.height),rw=image.width*ratio,rh=image.height*ratio;
  ctx.drawImage(image,x+(w-rw)/2,y+(h-rh)/2,rw,rh);
 }
 function printLines(ctx,str,x,y,size,width,limit,color){
  ctx.font='800 '+size+'px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  ctx.fillStyle=color;ctx.textBaseline='top';
  const lines=wrap(ctx,str,width,limit);
  for(const line of lines){ctx.fillText(line,x,y,width);y+=size*1.2;}
  return y;
 }
 async function draw(data,photos,settings){
  const cfg=choices(settings),{w,h}=FORMATS[cfg.format],style=STYLES[cfg.template];
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const c=canvas.getContext('2d');if(!c)throw Error('브라우저 이미지 제작을 지원하지 않습니다.');
  c.fillStyle=style.background;c.fillRect(0,0,w,h);
  const photosArr=verifyPhotos(Array.isArray(photos)?photos:photos?[photos]:[]);
  if(photosArr.length){
   const front=photosArr[cfg.selectedIndex]||photosArr[0];
   const arranged=[front,...photosArr.filter(f=>f!==front)].slice(0,cfg.layout==='collage'?3:1);
   const bitmaps=await Promise.all(arranged.map(photo=>createImageBitmap(photo)));
   try{
    if(cfg.layout==='collage'&&bitmaps.length>1){
     const top=Math.round(h*.80),left=Math.round(w*.61),gap=7;
     cover(c,bitmaps[0],0,0,left-gap/2,top);
     if(bitmaps.length===2)cover(c,bitmaps[1],left+gap/2,0,w-left-gap/2,top);
     else{
      cover(c,bitmaps[1],left+gap/2,0,w-left-gap/2,top/2-gap/2);
      cover(c,bitmaps[2],left+gap/2,top/2+gap/2,w-left-gap/2,top/2-gap/2);
     }
    }else cover(c,bitmaps[0],0,0,w,h);
   }finally{bitmaps.forEach(b=>b.close?.());}
  }else{
   // Abstract graphic only; do not invent photographs of real facilities or pets.
   c.fillStyle='#327480';c.beginPath();c.ellipse(w*.8,h*.23,w*.4,h*.17,-.3,0,Math.PI*2);c.fill();
   c.fillStyle='#d5ac77';c.beginPath();c.arc(w*.74,h*.26,w*.10,0,Math.PI*2);c.fill();
  }
  const shade=c.createLinearGradient(0,0,0,h);
  shade.addColorStop(0,'rgba(0,24,30,.48)');shade.addColorStop(.48,'rgba(0,24,30,.07)');
  shade.addColorStop(.64,'rgba(0,24,30,.72)');shade.addColorStop(1,'rgba(0,24,30,.97)');
  c.fillStyle=shade;c.fillRect(0,0,w,h);
  c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=3;c.strokeRect(44,44,w-88,h-88);
  printLines(c,'DONGBAEG · PENSION',82,94,34,910,1,'#fff7e8');
  const titleTop=Math.round(h*.64),subtitleBottom=h-212;
  c.fillStyle=style.accent;c.fillRect(82,titleTop-42,95,9);
  let titleSize=cfg.format==='feed'?75:91,lines=3;
  while(titleSize>48){
   c.font='800 '+titleSize+'px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
   const count=wrap(c,data.headline,905,lines).length;
   if(titleTop+count*titleSize*1.2<h-(cfg.format==='feed'?270:330))break;
   titleSize-=3;
  }
  const end=printLines(c,data.headline,82,titleTop,titleSize,905,lines,style.text);
  const subtitleY=Math.min(subtitleBottom-68,end+21);
  printLines(c,data.subtitle,86,subtitleY,cfg.format==='feed'?32:39,898,2,'#ffffff');
  const footerY=h-155;c.fillStyle='#fff7e7';c.fillRect(78,footerY,924,100);
  let ctaSize=38;
  while(ctaSize>23){c.font='800 '+ctaSize+'px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';if(c.measureText(data.cta).width<=850)break;ctaSize-=2;}
  printLines(c,data.cta,108,footerY+(100-ctaSize)/2-2,ctaSize,850,1,'#224348');
  return await new Promise((ok,bad)=>canvas.toBlob(blob=>blob?ok(blob):bad(Error('PNG 저장에 실패했습니다.')),'image/png'));
 }
 async function prepare(id,photos,chosen=0,settings){
  const incoming=verifyPhotos(Array.isArray(photos)?photos:photos?[photos]:[]);
  const old=await item('read',id);
  const saved=incoming.length?incoming:(old?.photos|| (old?.photo?[old.photo]:[]));
  const index=incoming.length?chosen:(old?.selectedIndex||0);
  await item('write',id,{id,photo:saved[index]||saved[0]||null,photos:saved,selectedIndex:index,options:choices(settings||old?.options),
   png:old?.png||null,design:old?.design||null,title:old?.title||'',updated:Date.now()});
 }
 async function generate(id,task){
  const old=await item('read',id)||{id,photo:null};
  const photos=old.photos|| (old.photo?[old.photo]:[]);
  const chosen=photos[old.selectedIndex||0]||old.photo||null;
  const design=getDesign(task.designText,task),png=await draw(design,photos,{...old.options,selectedIndex:old.selectedIndex||0});
  await item('write',id,{...old,png,design,title:task.title,updated:Date.now()});
  scan();
  return {size:png.size,hasPhoto:Boolean(chosen),photoCount:photos.length,format:choices(old.options).format};
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
  const shape=FORMATS[choices(row.options).format];
  const desc=document.createElement('p');desc.textContent=row.png?'PNG '+shape.w+'×'+shape.h+' · '+shape.label+' · 브라우저 저장 · 게시 전 검토 필요':'포스터 생성이 미완료 상태입니다. 아래에서 다시 만들어 보세요.';shell.append(desc);
  const savedPhotos=row.photos||(row.photo?[row.photo]:[]);
  if(savedPhotos.length){
   const count=document.createElement('p');count.textContent='업로드된 실제 사진 '+savedPhotos.length+'장 · 대표 사진 '+((row.selectedIndex||0)+1)+'번';
   shell.append(count);
  }
  if(row.png){
   const img=document.createElement('img');img.alt='실제 사진 또는 그래픽 기반 홍보 포스터';img.style.cssText='width:min(100%,270px);height:auto;display:block;margin:12px 0;border-radius:7px';
   const url=URL.createObjectURL(row.png);img.src=url;img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);shell.append(img);
   const btn=document.createElement('button');btn.textContent='포스터 PNG 내려받기';btn.dataset.posterDownload=row.id;btn.onclick=()=>download(row);shell.append(btn);
  }
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='문구·사진 수정하기 (GPT 요금 없음)';
  details.append(summary);
  const editSettings=settingsUI(row.options,'db-edit-'+row.id.slice(0,8));details.append(editSettings.root);
  const fields={};
  for(const [key,label,max] of [['headline','큰 제목',46],['subtitle','보조 문구',100],['cta','마지막 안내',65]]){
   const wrap=document.createElement('label');wrap.textContent=label;
   const input=document.createElement('input');input.type='text';input.maxLength=max;input.value=row.design?.[key]||'';
   input.style.cssText='display:block;box-sizing:border-box;width:100%;padding:8px;margin:4px 0 9px;border:1px solid #b9c4ad;border-radius:4px';wrap.append(input);details.append(wrap);fields[key]=input;
  }
  const photoLabel=document.createElement('label');photoLabel.textContent='실제 사진 여러 장 변경 (선택 · 최대 5장) ';
  const photoInput=document.createElement('input');photoInput.type='file';photoInput.multiple=true;photoInput.accept='image/png,image/jpeg,image/webp';photoLabel.append(photoInput);details.append(photoLabel);
  let editPhotos=savedPhotos.slice(),editIndex=Math.min(row.selectedIndex||0,Math.max(0,editPhotos.length-1)),editGallery=null;
  const editNote=document.createElement('p');editNote.textContent='사진을 다시 선택하지 않으면 기존 사진 전체가 유지됩니다.';details.append(editNote);
  function refreshEdit(){
   editGallery?.cleanup?.();editGallery?.remove();if(!editPhotos.length)return;
   editGallery=photoGallery(editPhotos,editIndex,i=>{editIndex=i;refreshEdit();});details.insertBefore(editGallery,editNote);
  }
  photoInput.onchange=()=>{
   try{
    const next=verifyPhotos(photoInput.files);if(!next.length)return;
    editPhotos=next;editIndex=0;refreshEdit();
    editNote.textContent=next.length+'장 선택됨 · 대표 사진을 누르면 포스터에 사용할 사진을 바꿀 수 있습니다.';
   }catch(e){photoInput.value='';editNote.textContent=e.message;}
  };
  refreshEdit();
  const edit=document.createElement('button');edit.type='button';edit.textContent='포스터 다시 만들기';details.append(edit);
  const status=document.createElement('p');status.setAttribute('role','status');details.append(status);
  edit.onclick=async()=>{
   edit.disabled=true;status.textContent='이미지를 생성하고 있습니다.';
   try{
    verifyPhotos(editPhotos);
    const photo=editPhotos[editIndex]||null;
    const design=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,clean(v.value,k==='subtitle'?100:65)]));
    if(!design.headline||!design.cta)throw Error('큰 제목과 마지막 안내를 적어 주세요.');
    const options={...editSettings.get(),selectedIndex:editIndex};
    const png=await draw(design,editPhotos,options);
    await item('write',row.id,{...row,photo,photos:editPhotos,selectedIndex:editIndex,options,design,png,updated:Date.now()});
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
  const label=document.createElement('div');label.textContent='실제 사진 (선택) · 최대 5장 · 각 8MB 이하 · 전체 30MB 이하';
  const creationSettings=settingsUI({},'db-new-poster');label.append(creationSettings.root);
  const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/jpeg,image/png,image/webp';input.id='db-manager-photo';label.append(input);
  const note=document.createElement('small');note.textContent='여러 사진을 선택하고 대표 사진 1장을 지정하세요. 사진 전체는 이 브라우저에 저장되고, 현재 포스터는 대표 사진 1장으로 제작됩니다. 외부 AI 서버로 보내지 않습니다.';note.style.display='block';label.append(note);
  let gallery=null;
  function refreshGallery(){
   gallery?.cleanup?.();gallery?.remove();
   if(!selected.length)return;
   gallery=photoGallery(selected,selectedIndex,i=>{selectedIndex=i;refreshGallery();});
   label.append(gallery);
  }
  label.id='db-manager-photo-panel';
  label.style.cssText='display:grid;gap:10px;border:2px solid #42785e;border-radius:10px;background:#eef6e9;padding:16px;margin:14px 0;font-size:15px;font-weight:700;color:#1d4c3d';
  input.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px;background:white;border:1px solid #94b5a0;border-radius:6px;font-size:14px;color:#1d4c3d';
  label.prepend(document.createTextNode('📷 포스터 사진 업로드 — 아래에서 파일 선택'));
  form.insertBefore(label,form.firstElementChild);
  input.onchange=()=>{
   try{
    const next=verifyPhotos(input.files);selected=next;selectedIndex=0;
    note.textContent=next.length?next.length+'장 선택됨 · 포스터에 사용할 대표 사진을 누르세요. 전체 사진은 저장됩니다.':'사진 없이 그래픽 포스터를 제작합니다.';
    refreshGallery();
   }catch(e){selected=[];selectedIndex=0;input.value='';refreshGallery();note.textContent=e.message;}
  };
  document.addEventListener('dongbaek-ai-jobs',scan);scan();
 }
 window.DongbaekPosterStudio=Object.freeze({install,prepare,generate,scan,selectedPhoto:()=>selected.slice(),selectedPhotoIndex:()=>selectedIndex,selectedOptions:()=>creationSettings.get(),
  available:async()=>{try{const d=await openDB();d.close();return true;}catch{return false;}}});
})();