/* Local video output library for Minchae. IndexedDB only; no network access or automatic publishing. */
(()=>{
 'use strict';
 const DB='dongbaek-video-library-v1',STORE='renders',MAX_ITEMS=20,MAX_EACH=30*1024*1024,MAX_TOTAL=80*1024*1024;
 const clean=(s,n)=>String(s||'').trim().slice(0,n);
 function validate(record){
  if(!record||typeof record.id!=='string'||!/^[A-Za-z0-9_-]{10,110}$/.test(record.id))throw Error('영상 기록 ID가 올바르지 않습니다.');
  if(!(record.blob instanceof Blob)||record.blob.size<1024||record.blob.size>MAX_EACH)throw Error('영상 파일 크기는 1KB~30MB로 제한됩니다.');
  if(!['video/webm','video/mp4'].includes(record.blob.type))throw Error('WebM·MP4 영상만 저장할 수 있습니다.');
  return {id:record.id,blob:record.blob,title:clean(record.title,100),subtitle:clean(record.subtitle,85),
   cta:clean(record.cta,100),format:record.blob.type==='video/mp4'?'mp4':'webm',
   width:[360,720,1080].includes(record.width)?record.width:720,
   height:[640,1280,1920].includes(record.height)?record.height:1280,
   cuts:Array.isArray(record.cuts)?record.cuts.slice(0,5).map(c=>({name:clean(c.name,150),caption:clean(c.caption,85)})):[],
   created:Number.isFinite(record.created)?record.created:Date.now()};
 }
 function open(){
  return new Promise((resolve,reject)=>{
   if(!window.indexedDB){reject(Error('이 브라우저는 영상 보관함을 지원하지 않습니다. 파일을 직접 내려받으세요.'));return;}
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('영상 저장 공간을 열 수 없습니다.'));
  });
 }
 async function list(){
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
   const req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error||Error('영상 목록을 읽지 못했습니다.'));
  });}finally{db.close();}
 }
 async function get(id){
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{10,110}$/.test(id))return null;
  const db=await open();
  try{return await new Promise((resolve,reject)=>{
   const req=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
   req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('영상을 읽지 못했습니다.'));
  });}finally{db.close();}
 }
 async function replaceAll(values){
  if(!Array.isArray(values)||values.length>MAX_ITEMS)throw Error('영상 보관함은 최대 20개입니다.');
  const rows=values.map(validate);
  if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('영상 ID가 중복되었습니다.');
  if(rows.reduce((sum,r)=>sum+r.blob.size,0)>MAX_TOTAL)throw Error('영상 저장 용량은 최대 80MB입니다.');
  const db=await open();
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
   tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('영상 저장 작업이 중단되었습니다.'));tx.onerror=()=>reject(tx.error||Error('영상 저장에 실패했습니다.'));
   store.clear();for(const row of rows)store.put(row);
  });}finally{db.close();}
 }
 async function save(blob,details={}){
  const id=crypto.randomUUID?.()||'db-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  const row=validate({...details,id,blob});
  const records=await list();
  const next=[row,...records].slice(0,MAX_ITEMS);
  if(next.reduce((sum,r)=>sum+r.blob.size,0)>MAX_TOTAL)throw Error('영상 보관함 80MB 한도입니다. 완성 파일을 다운로드하고 기존 영상을 정리해 주세요.');
  await replaceAll(next);return row;
 }
 async function remove(id){const records=await list();await replaceAll(records.filter(x=>x.id!==id));}
 window.DongbaegVideoLibrary=Object.freeze({save,get,list,replaceAll,remove,MAX_TOTAL,MAX_ITEMS});
})();