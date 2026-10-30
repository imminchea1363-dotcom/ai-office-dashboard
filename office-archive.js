/* v8: browser-local task search and explicit, reversible-by-saved-copy archive export/import.
   Never reads access tokens, never calls remote services, never executes GPT jobs. */
(() => {
 'use strict';
 const JOB='dongbaek-ai-desk-v1';
 const MANUAL='dongbaek-office-manual-v1';
 const MANAGER='dongbaek-manager-runs-v1';
 const PREVIEW_MANAGER='dongbaek-manager-preview-runs-v1';
 const SNS='dongbaek-sns-workflow-v1';
 const DB='dongbaek-poster-studio-v1';
 const MAX_BINARY=80*1024*1024, MAX_FILE=145*1024*1024;
 const section=document.getElementById('db-ai-desk'),list=document.getElementById('db-ai-jobs');
 if(!section||!list)return;
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const style=node('style');
 style.textContent='.db-archive{border:1px solid #bdcdbd;background:#f7fbf5;border-radius:12px;margin:14px 0;padding:15px;color:#263e37}.db-archive h3{margin:0 0 10px;font-size:17px}.db-archive p{font-size:12px;line-height:1.7}.db-archive-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.db-archive input[type=search]{box-sizing:border-box;width:100%;padding:10px;border:1px solid #aebba9;border-radius:8px;color:#263e37;background:#fff;font-size:14px}.db-archive input[type=file]{width:min(100%,320px);font-size:12px}.db-archive [data-status]{background:#eaf2e8;padding:8px;border-radius:6px;font-size:12px;line-height:1.7;overflow-wrap:anywhere}.db-archive button{background:#edf2e7;border:1px solid #9aaf99;border-radius:7px;padding:9px 13px;color:#284e39;cursor:pointer;font-size:12px}.db-archive button:disabled{opacity:.55;cursor:default}';
 document.head.append(style);
 const area=node('section');area.id='db-archive';area.className='db-archive';
 const h=node('h3','업무 검색 · 안전 백업 · 복원');
 const intro=node('p','이 브라우저에 저장된 보고서·직원 매뉴얼·사진과 PNG를 한 파일로 백업합니다. 사무실 접속 암호와 API 키는 저장하지 않습니다. 백업 파일에는 업무 내용과 사진이 포함되므로 안전하게 보관하세요.');
 const search=node('input');search.id='db-archive-search';search.type='search';search.placeholder='업무 제목, 결과, 담당 직원 검색';search.setAttribute('aria-label','업무 및 보고서 검색');
 const count=node('p');count.id='db-archive-count';
 const actions=node('div');actions.className='db-archive-actions';
 const backup=node('button','전체 자료 백업(JSON)');backup.id='db-archive-export';backup.type='button';
 const source=node('input');source.id='db-archive-import';source.type='file';source.accept='.json,application/json';
 source.setAttribute('aria-label','동백사무실 전체 백업 JSON 선택');
 const restore=node('button','선택한 백업 파일 복원');restore.id='db-archive-restore';restore.type='button';restore.disabled=true;
 const status=node('p','백업과 검색에는 GPT 호출 비용이 발생하지 않습니다.');status.dataset.status='true';status.id='db-archive-status';status.setAttribute('role','status');
 const note=node('p','복원은 현재 브라우저 기록을 교체하므로 반드시 먼저 최신 백업을 내려받으세요. 진행 중·결과 확인 대기 중인 GPT 업무가 있으면 복원을 차단합니다. 사진까지 다른 기기로 옮기려면 두 기기에서 각각 백업·복원을 사용하세요.');
 actions.append(backup,source,restore);area.append(h,intro,search,count,actions,note,status);
 list.before(area);

 function stored(key){try{return localStorage.getItem(key)||'';}catch{return '';}}
 function isActiveJob(job){return job&&['pending','generating'].includes(job.status);}
 function parseDesk(value){
  const data=JSON.parse(value||'{"jobs":[]}');
  if(!data||typeof data!=='object'||!Array.isArray(data.jobs)||data.jobs.length>100)throw Error('백업에 업무 기록이 없거나 형식이 올바르지 않습니다.');
  if(data.jobs.some(j=>!j||typeof j.id!=='string'||j.id.length>100||!Number.isInteger(j.workerId)))throw Error('업무 ID 또는 담당 직원 정보가 올바르지 않습니다.');
  const ids=new Set(data.jobs.map(j=>j.id));if(ids.size!==data.jobs.length)throw Error('업무 ID가 중복되어 있습니다.');
  return data;
 }
 function hasActive(data){return data.jobs.some(isActiveJob);}
 function makeState(){
  return {desk:stored(JOB)||JSON.stringify({jobs:[],assignments:{}}),manual:stored(MANUAL)||'{}',manager:stored(MANAGER)||'{}',previewManager:stored(PREVIEW_MANAGER)||'{}',sns:stored(SNS)||'{"entries":[]}'};
 }
 function parseState(data){
  if(!data||typeof data!=='object'||typeof data.desk!=='string'||typeof data.manual!=='string'||typeof data.manager!=='string'||typeof data.previewManager!=='string'||(data.sns!==undefined&&typeof data.sns!=='string'))throw Error('전체 백업 형식이 아닙니다.');
  const desk=parseDesk(data.desk);
  if(data.desk.length>3*1024*1024||data.manual.length>12000||data.manager.length>900000||data.previewManager.length>900000||(data.sns||'').length>2000000)throw Error('백업 내 텍스트 크기가 허용 범위를 초과했습니다.');
  for(const value of [data.manager,data.previewManager]){
   const parsed=JSON.parse(value||'{}');
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).length>100)throw Error('중단 업무 저장 형식이 올바르지 않습니다.');
  }
  const planned=JSON.parse(data.sns||'{"entries":[]}');
  if(!planned||typeof planned!=='object'||!Array.isArray(planned.entries)||planned.entries.length>250)throw Error('SNS 게시 계획 백업이 올바르지 않습니다.');
  const manual=JSON.parse(data.manual||'{}');
  if(!manual||typeof manual!=='object'||Array.isArray(manual))throw Error('직원 매뉴얼 형식이 올바르지 않습니다.');
  return desk;
 }
 async function openDb(){
  if(typeof indexedDB==='undefined')throw Error('브라우저 이미지 저장을 지원하지 않습니다.');
  return await new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'});};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('사진 저장 공간을 열 수 없습니다.'));
  });
 }
 async function readPosters(){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction('files','readonly'),req=tx.objectStore('files').getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
  });}finally{db.close();}
 }
 async function writePosters(posters){
  const db=await openDb();
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction('files','readwrite');
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('사진 저장 실패'));tx.onabort=()=>reject(tx.error||Error('사진 저장 중단'));
   const store=tx.objectStore('files');
   store.clear();
   for(const value of posters)store.put(value);
  });}finally{db.close();}
 }
 async function base64(blob){
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let result='';
  for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));
  return btoa(result);
 }
 function decode(value){
  if(typeof value!=='string'||value.length>MAX_FILE*1.38||!/^([A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('사진 파일 데이터가 손상되어 있습니다.');
  const raw=atob(value),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
 }
 async function archiveBlob(blob,name,isPng=false){
  if(!blob)return null;
  if(!(blob instanceof Blob)||blob.size<1||blob.size>(isPng?25*1024*1024:8*1024*1024))throw Error('사진 파일 크기가 허용 범위를 초과했습니다.');
  if(!isPng&&!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('지원하지 않는 사진 형식입니다.');
  return {name:String(name||'photo').slice(0,150),type:isPng?'image/png':blob.type,content:await base64(blob)};
 }
 function reviveBinary(entry,isPng=false){
  if(!entry)return null;
  if(typeof entry!=='object'||typeof entry.type!=='string'||typeof entry.name!=='string')throw Error('사진 백업 구조가 올바르지 않습니다.');
  const bytes=decode(entry.content);
  if(bytes.length<1||bytes.length>(isPng?25*1024*1024:8*1024*1024))throw Error('사진 데이터 크기가 허용 범위를 초과했습니다.');
  if(isPng&&!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw Error('PNG 포스터 데이터가 올바르지 않습니다.');
  if(!isPng&&!['image/png','image/jpeg','image/webp'].includes(entry.type))throw Error('사진 형식을 확인해 주세요.');
  const safeName=entry.name.slice(0,150).replace(/[\\/:*?"<>|]/g,'-');
  return isPng?new Blob([bytes],{type:'image/png'}):new File([bytes],safeName,{type:entry.type});
 }
 async function serializePosters(rows,desk){
  let total=0;const ids=new Set(desk.jobs.map(j=>j.id));const encoded=[];
  for(const row of rows){
   if(!ids.has(row.id))continue;
   const photos=row.photos||(row.photo?[row.photo]:[]);
   if(photos.length>5)throw Error('한 업무에 사진 5장을 초과하여 백업할 수 없습니다.');
   const list=[];
   for(let i=0;i<photos.length;i++){
    total+=photos[i].size;
    if(total>MAX_BINARY)throw Error('사진 총용량이 80MB를 넘었습니다. 개별 PNG를 먼저 저장하고 불필요한 기록을 정리해 주세요.');
    list.push(await archiveBlob(photos[i],photos[i].name||'source-'+(i+1)+'.png'));
   }
   if(row.png)total+=row.png.size;
   if(total>MAX_BINARY)throw Error('이미지 총용량이 80MB를 넘었습니다. 개별 PNG를 먼저 저장해 주세요.');
   encoded.push({id:row.id,title:row.title||'',design:row.design||null,options:row.options||null,
    selectedIndex:Number.isInteger(row.selectedIndex)?row.selectedIndex:0,updated:row.updated||0,
    photos:list,png:await archiveBlob(row.png,'poster.png',true)});
  }
  return encoded;
 }
 function revivePosters(rows,desk){
  if(!Array.isArray(rows)||rows.length>100)throw Error('사진 백업 목록이 올바르지 않습니다.');
  const ids=new Set(desk.jobs.map(j=>j.id)),all=[],used=new Set();let total=0;
  for(const row of rows){
   if(!row||typeof row.id!=='string'||!ids.has(row.id)||used.has(row.id))throw Error('사진 연결 업무가 잘못되었습니다.');
   used.add(row.id);
   if(!Array.isArray(row.photos)||row.photos.length>5)throw Error('사진 5장 제한을 초과했습니다.');
   const photos=row.photos.map(e=>reviveBinary(e));const png=reviveBinary(row.png,true);
   total+=photos.reduce((a,f)=>a+f.size,0)+(png?.size||0);
   if(total>MAX_BINARY)throw Error('복원할 이미지 총용량이 80MB를 초과했습니다.');
   const idx=Number.isInteger(row.selectedIndex)&&row.selectedIndex>=0&&row.selectedIndex<photos.length?row.selectedIndex:0;
   all.push({id:row.id,title:typeof row.title==='string'?row.title.slice(0,100):'',design:row.design&&typeof row.design==='object'?row.design:null,
    options:row.options&&typeof row.options==='object'?row.options:null,
    selectedIndex:idx,updated:Date.now(),photos,photo:photos[idx]||null,png});
  }
  return all;
 }
 async function serializeVideos(){
  const lib=window.DongbaegVideoLibrary;if(!lib)return [];
  const rows=await lib.list();if(rows.reduce((sum,r)=>sum+r.blob.size,0)>45*1024*1024)throw Error('영상 백업 용량은 최대 45MB입니다. 일부 영상을 다운로드하고 정리해 주세요.');
  const result=[];
  for(const row of rows){
   const magic=new Uint8Array(await row.blob.slice(0,12).arrayBuffer());
   if(row.blob.type==='video/webm'&&!(magic[0]===26&&magic[1]===69&&magic[2]===223&&magic[3]===163))throw Error('손상된 WebM 영상으로 백업을 중단했습니다.');
   if(row.blob.type==='video/mp4'&&String.fromCharCode(...magic.slice(4,8))!=='ftyp')throw Error('손상된 MP4 영상으로 백업을 중단했습니다.');
   result.push({id:row.id,title:row.title,subtitle:row.subtitle,cta:row.cta,width:row.width,height:row.height,cuts:row.cuts,created:row.created,
    media:{name:'office-video',type:row.blob.type,content:await base64(row.blob)}});
  }
  return result;
 }
 function reviveVideos(rows){
  if(rows===undefined)return null;
  if(!Array.isArray(rows)||rows.length>20)throw Error('영상 백업 목록은 최대 20개입니다.');
  let bytesTotal=0;return rows.map(row=>{
   if(!row||!row.media||!['video/mp4','video/webm'].includes(row.media.type))throw Error('영상 백업 형식이 잘못되었습니다.');
   const data=decode(row.media.content);bytesTotal+=data.length;
   if(data.length<1024||data.length>30*1024*1024||bytesTotal>45*1024*1024)throw Error('영상 백업 용량을 초과했습니다.');
   if(row.media.type==='video/webm'&&!(data[0]===26&&data[1]===69&&data[2]===223&&data[3]===163))throw Error('WebM 헤더가 잘못되었습니다.');
   if(row.media.type==='video/mp4'&&String.fromCharCode(...data.slice(4,8))!=='ftyp')throw Error('MP4 헤더가 잘못되었습니다.');
   const {media,...rest}=row;return {...rest,blob:new Blob([data],{type:media.type})};
  });
 }
 function download(name,content){
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
  const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function filter(){
  const q=search.value.trim().toLocaleLowerCase('ko');
  let shown=0,total=0;
  for(const card of list.querySelectorAll('[data-ai-job]')){
   total++;
   const match=!q||card.textContent.toLocaleLowerCase('ko').includes(q);
   card.hidden=!match;card.style.display=match?'':'none';if(match)shown++;
  }
  let calls=0;
  try{
   const saved=JSON.parse(stored(JOB)||'{}');
   for(const job of saved.jobs||[])if(job?.gpt&&job.usage&&Number.isInteger(job.usage.calls))calls+=job.usage.calls;
  }catch{}
  count.textContent=q?'검색 결과 '+shown+'건 / 전체 '+total+'건':'저장 업무 '+total+'건 · 기록에 남은 GPT 단계 '+calls+'회 (서버 사용량과 다를 수 있음)';
 }
 search.addEventListener('input',filter);
 document.addEventListener('dongbaek-ai-jobs',()=>queueMicrotask(filter));
 source.addEventListener('change',()=>{restore.disabled=!source.files?.length;status.textContent=source.files?.length?'선택한 파일을 검사한 뒤 복원할 수 있습니다. 최신 백업을 먼저 내려받으세요.':'백업 파일을 선택하세요.';});
 backup.onclick=async()=>{
  backup.disabled=true;status.textContent='업무 기록과 포스터 파일을 백업하고 있습니다. 외부 전송하지 않습니다.';
  try{
   const state=makeState(),desk=parseState(state),photos=await serializePosters(await readPosters(),desk),videos=await serializeVideos();
   const record={format:'dongbaek-office-full-backup',version:1,exported:new Date().toISOString(),data:state,posters:photos,videos};
   const bytes=JSON.stringify(record);
   if(bytes.length>MAX_FILE)throw Error('백업 파일 크기가 145MB를 초과했습니다.');
   download('동백사무실-전체백업-'+new Date().toISOString().slice(0,10)+'.json',bytes);
   status.textContent='전체 백업 파일 생성 완료 · 업무 '+desk.jobs.length+'건 · 포스터 '+photos.length+'건 · 영상 '+videos.length+'건. 파일을 안전하게 보관하세요.';
  }catch(error){status.textContent='백업 실패: '+(error.message||'브라우저 저장 공간을 확인해 주세요.');}
  finally{backup.disabled=false;}
 };
 restore.onclick=async()=>{
  const file=source.files?.[0];if(!file)return;
  if(file.size>MAX_FILE){status.textContent='복원할 파일은 145MB 이하여야 합니다.';return;}
  restore.disabled=true;status.textContent='백업 내용을 검사하고 있습니다. 아직 현재 기록을 변경하지 않았습니다.';
  try{
   const archive=JSON.parse(await file.text());
   if(archive.format!=='dongbaek-office-full-backup'||archive.version!==1)throw Error('이 기능에서 만든 전체 백업 파일이 아닙니다.');
   const desk=parseState(archive.data);
   const current=parseDesk(stored(JOB)||JSON.stringify({jobs:[]}));
   if(hasActive(current))throw Error('현재 진행 중인 GPT 작업이 있습니다. 먼저 결과 확인 또는 작업 종료 후 복원하세요.');
   if(Object.keys(JSON.parse(stored(MANAGER)||'{}')).length||Object.keys(JSON.parse(stored(PREVIEW_MANAGER)||'{}')).length)throw Error('현재 중단·대기 중인 총괄매니저 작업이 있어 복원할 수 없습니다. 결과를 확인하고 완료해 주세요.');
   if(hasActive(desk))throw Error('백업에 진행 중인 GPT 작업이 있어 안전한 자동 복원을 제한했습니다.');
   if(Object.keys(JSON.parse(archive.data.manager||'{}')).length||Object.keys(JSON.parse(archive.data.previewManager||'{}')).length)throw Error('중단된 총괄 업무 단계가 저장된 백업은 복원할 수 없습니다.');
   const photos=revivePosters(archive.posters,desk),videos=reviveVideos(archive.videos);
   const proceed=window.confirm('현재 이 브라우저의 업무 기록·직원 매뉴얼을 선택한 백업 내용으로 교체합니다. 기존 자료를 백업했나요? 복원 후 화면을 새로고침합니다.');
   if(!proceed){status.textContent='복원을 취소했습니다. 현재 기록은 유지됩니다.';return;}
   // Keep the old images for rollback if browser text storage later fails.
   const oldPosters=await readPosters();
   const lib=window.DongbaegVideoLibrary,oldVideos=videos!==null&&lib?await lib.list():null;
   if(videos!==null&&!lib)throw Error('영상 보관함이 없어 영상 포함 백업을 복원할 수 없습니다.');
   await writePosters(photos);
   try{if(videos!==null)await lib.replaceAll(videos);}
   catch(error){await writePosters(oldPosters);throw error;}
   const changes=[[JOB,archive.data.desk],[MANUAL,archive.data.manual],[MANAGER,archive.data.manager],[PREVIEW_MANAGER,archive.data.previewManager],[SNS,archive.data.sns||'{"entries":[]}']];
   const before=changes.map(([key])=>[key,stored(key)]);
   try{for(const [key,value] of changes)localStorage.setItem(key,value);}
   catch(error){
    for(const [key,value] of before){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch{}}
    try{await writePosters(oldPosters);if(oldVideos!==null)await lib.replaceAll(oldVideos);}catch{throw Error('복원 도중 저장 실패·영상/사진 되돌리기 실패. 기존 백업 파일로 복원해 주세요.');}
    throw Error('브라우저 공간 부족으로 업무 기록을 교체하지 못했습니다. 원래 사진과 기록을 되돌렸습니다.');
   }
   status.textContent='복원 완료 · 업무 '+desk.jobs.length+'건 · 포스터 '+photos.length+'건 · 영상 '+(videos?.length||0)+'건. 화면을 새로고침합니다.';
   window.location.reload();
  }catch(error){status.textContent='복원 중단: '+(error.message||'백업 파일을 확인해 주세요.');}
  finally{restore.disabled=false;}
 };
 filter();
})();
