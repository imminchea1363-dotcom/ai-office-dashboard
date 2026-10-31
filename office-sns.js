/* v9 SNS publishing planner: no account sessions, external posting, credentials, or API calls. */
(()=>{
 'use strict';
 const key='dongbaek-sns-workflow-v1',limit=250;
 const anchor=document.getElementById('db-ai-jobs');if(!anchor)return;
 const clean=(v,n)=>String(v||'').trim().slice(0,n);
 const platforms=['인스타그램','스레드','틱톡','유튜브 쇼츠','네이버 블로그'];
 const mediaRequired={'인스타그램':'사진·영상 확인','스레드':'텍스트 또는 미디어','틱톡':'세로 영상 필요','유튜브 쇼츠':'세로 영상 필요','네이버 블로그':'본문 확인'};
 const photoDb='dongbaek-poster-studio-v1';
 async function inspectPoster(id){
  if(!id||typeof indexedDB==='undefined')return null;
  return new Promise(resolve=>{
   let opened=false;
   try{
    const request=indexedDB.open(photoDb);
    request.onupgradeneeded=()=>{opened=true;request.transaction.abort();};
    request.onerror=()=>resolve(null);
    request.onsuccess=()=>{
     const db=request.result;
     if(opened||!db.objectStoreNames.contains('files')){db.close();resolve(null);return;}
     const tx=db.transaction('files','readonly'),read=tx.objectStore('files').get(id);
     read.onsuccess=()=>{const item=read.result;db.close();resolve(item?.png instanceof Blob?{png:item.png,format:item.options?.format||'story'}:null);};
     read.onerror=()=>{db.close();resolve(null);};
    };
   }catch{resolve(null);}
  });
 }
 function mediaCheck(entry){
  if(entry.videoId)return '완성 영상 보관함 연결 · WebM/MP4 파일을 게시 전 직접 확인하고 플랫폼 규격에 맞게 업로드하세요.';
  if(entry.platform==='유튜브 쇼츠')return '세로 동영상 파일이 연결되지 않았습니다. 영상 제작·업로드 권한 확인 필요';
  if(entry.platform==='틱톡')return entry.hasPoster?'사진 게시에는 공식 API 권한과 검증된 공개 이미지 URL이 별도로 필요합니다. 영상 게시에는 동영상 파일이 필요합니다.':'사진 또는 동영상이 연결되지 않았습니다. 게시 방식과 API 권한을 확인하세요';
  if(entry.platform==='인스타그램')return entry.hasPoster?'로컬 포스터 PNG 있음 · 해당 플랫폼의 계정·게시 규격 검증 필요':'사진 또는 동영상 자료 연결 필요';
  return entry.hasPoster?'로컬 포스터 PNG 확인 · 게시 전 내용 검토 필요':'텍스트 초안 · 미디어가 필요한 게시인지 확인';
 }
 let entries=[];try{const data=JSON.parse(localStorage.getItem(key)||'{"entries":[]}');if(Array.isArray(data.entries))entries=data.entries.slice(0,limit).filter(x=>x&&typeof x.id==='string'&&platforms.includes(x.platform));}catch{}
 const section=document.createElement('section');section.id='db-sns-planner';section.style.cssText='margin:16px 0;padding:16px;background:#f7f9f2;border:1px solid #bed1c0;border-radius:12px;color:#29443b';
 const h=document.createElement('h3');h.textContent='SNS 콘텐츠 일정·승인 관리';section.append(h);
 const explain=document.createElement('p');explain.textContent='계정 연결 전 시험 기능입니다. 작성·승인·예정일 기록만 저장하며 자동 게시하지 않습니다. 게시 완료 상태는 실제 게시를 확인한 뒤 직접 표시하세요.';section.append(explain);
 const layout=document.createElement('div');layout.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px';
 const select=document.createElement('select');select.id='db-sns-platform';for(const name of platforms){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt);}
 const input=document.createElement('input');input.id='db-sns-title';input.placeholder='콘텐츠 제목';input.maxLength=100;
 const publishDate=document.createElement('input');publishDate.id='db-sns-date';publishDate.type='datetime-local';
 const caption=document.createElement('textarea');caption.id='db-sns-caption';caption.placeholder='게시할 본문·해시태그·네이버 검색 안내';caption.rows=3;caption.maxLength=3000;
 const save=document.createElement('button');save.type='button';save.textContent='게시 초안 저장';save.id='db-sns-save';
 const info=document.createElement('p');info.id='db-sns-status';info.setAttribute('role','status');
 const origin=document.createElement('p');origin.id='db-sns-source';origin.textContent='연결된 직원 업무 없음';origin.style.cssText='font-size:12px;color:#657e70';
 let sourceJobId='',sourceVideoId='';
 const handle=document.createElement('div');handle.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:6px 0';
 const clear=document.createElement('button');clear.type='button';clear.id='db-sns-clear-source';clear.textContent='업무 연결 해제';
 clear.onclick=()=>{sourceJobId='';sourceVideoId='';origin.textContent='연결된 직원 업무 없음';info.textContent='업무·영상 연결을 해제했습니다.';};
 handle.append(clear);
 for(const n of [select,input,publishDate,caption])n.style.cssText='width:100%;box-sizing:border-box;min-width:0;padding:9px;font:inherit;font-size:13px;background:white;color:#243e37;border:1px solid #a7bba7;border-radius:7px';
 layout.append(select,input,publishDate,caption);section.append(origin,handle,layout,save,info);
 const list=document.createElement('div');list.id='db-sns-list';section.append(list);
 const buttons=section.querySelectorAll('button');for(const b of buttons)b.style.cssText='padding:9px 12px;margin:9px 5px 5px 0;border:1px solid #88a488;background:#e9f0e5;color:#254338;border-radius:8px;cursor:pointer';
 anchor.after(section);
 const put=()=>{
  try{localStorage.setItem(key,JSON.stringify({version:1,entries}));return true;}catch{info.textContent='브라우저 저장 실패. 새로고침하면 변경 사항이 사라질 수 있습니다.';return false;}
 };
 const statuses=['초안','대표 승인','게시 완료'];
 const REVIEW_FIELDS=[
  ['facts','가격·혜택·시설·예약 가능 여부 등 사실을 확인함'],
  ['media','사용 권한 있는 실제 사진·영상과 파일 규격을 확인함'],
  ['caption','자막·맞춤법·CTA·개인정보를 확인함'],
  ['account','게시할 계정과 공개 범위를 확인함'],
  ['final','대표님이 완성 콘텐츠를 최종 확인함']
 ];
 function checkedCount(entry){return REVIEW_FIELDS.filter(([id])=>entry.review?.[id]===true).length;}
 function copyReview(entry){return Object.fromEntries(REVIEW_FIELDS.map(([id])=>[id,entry.review?.[id]===true]));}
 const accounts={
  '인스타그램':'Meta 프로페셔널 계정과 승인된 게시 권한 · 미연결',
  '스레드':'Meta Threads 계정 OAuth·게시 권한 · 미연결',
  '틱톡':'개발자 앱 심사 및 사용자 승인 · 미연결',
  '유튜브 쇼츠':'YouTube 업로드 OAuth와 실제 세로 영상 · 미연결',
  '네이버 블로그':'기존 글쓰기 오픈 API 종료 · 원고 수동 게시'
 };
 function reviewPanel(entry){
  const fieldset=el('fieldset');fieldset.style.cssText='border:1px solid #b5cbb9;border-radius:7px;margin:9px 0;padding:10px';
  const legend=el('legend','게시 전 검수 · '+checkedCount(entry)+'/5');fieldset.append(legend);
  for(const [id,title] of REVIEW_FIELDS){
   const label=el('label');label.style.cssText='display:flex;align-items:flex-start;gap:9px;font-size:12px;margin:7px 0';
   const check=el('input');check.type='checkbox';check.checked=entry.review?.[id]===true;check.dataset.snsCheck=id;
   check.onchange=()=>{
    if(entry.state!=='초안'){check.checked=!check.checked;info.textContent='승인 후에는 검수 결과를 바꾸지 않습니다. 먼저 초안으로 되돌리세요.';return;}
    entry.review={...copyReview(entry),[id]:check.checked};entry.updated=Date.now();
    if(put())draw();
   };
   label.append(check,el('span',title));fieldset.append(label);
  }
  return fieldset;
 }
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const draw=()=>{
  list.replaceChildren();
  if(!entries.length){list.append(el('p','등록된 SNS 게시 계획이 없습니다.'));return;}
  for(const entry of entries){
   const card=el('article');card.dataset.snsId=entry.id;card.style.cssText='margin:12px 0;padding:12px;border:1px solid #c8d9c2;background:#fff;border-radius:9px';
   card.append(el('strong',entry.platform+' · '+entry.title),el('p','예정일: '+(entry.schedule||'미정')+' · 상태: '+entry.state));
   if(entry.sourceJobId)card.append(el('p','연결 업무: '+entry.sourceJobId.slice(0,18)+'…'));
   if(entry.videoId)card.append(el('p','완성 영상 연결: '+entry.videoId.slice(0,18)+'… · 브라우저 보관함'));
   card.append(el('p','게시 전 확인: '+mediaCheck(entry)));
   card.append(el('p','계정 연결 상태: '+accounts[entry.platform]));
   card.append(reviewPanel(entry));
   if(entry.caption)card.append(el('p',entry.caption));
   const actions=el('div');
   if(entry.state==='초안'){
    const approve=el('button','대표 승인');approve.type='button';approve.dataset.snsApprove=entry.id;
    approve.onclick=()=>{
     if(checkedCount(entry)!==REVIEW_FIELDS.length){info.textContent='게시 전 검수 5개를 모두 확인해야 대표 승인할 수 있습니다.';return;}
     if(['틱톡','유튜브 쇼츠'].includes(entry.platform))info.textContent='현재 승인은 게시 문안에만 해당합니다. 사진·영상 미디어 및 플랫폼별 업로드 준비는 별도로 확인해야 합니다.';
     if(!window.confirm('이 콘텐츠의 게시 문안을 확인하고 승인하시겠습니까? 플랫폼 업로드와 자동 게시는 실행되지 않습니다.'))return;
     entry.state='대표 승인';entry.updated=Date.now();if(put())draw();
    };actions.append(approve);
   }
   if(entry.state==='대표 승인'){
    const done=el('button','실제 게시 완료 표시');done.type='button';done.dataset.snsDone=entry.id;
    done.onclick=()=>{if(!window.confirm('실제 플랫폼에서 게시 완료를 직접 확인하셨습니까? 이 버튼은 외부 게시를 실행하지 않습니다.'))return;entry.state='게시 완료';entry.updated=Date.now();if(put())draw();};actions.append(done);
   }
   if(entry.state!=='초안'){
    const rollback=el('button','초안으로 되돌리기');rollback.type='button';rollback.dataset.snsReset=entry.id;
    rollback.onclick=()=>{if(!window.confirm('승인 또는 완료 표시를 취소하고 초안으로 되돌릴까요?'))return;entry.state='초안';entry.updated=Date.now();if(put())draw();};actions.append(rollback);
   }
   if(entry.sourceJobId){
    const getPoster=el('button','연결된 PNG 내려받기');getPoster.type='button';getPoster.dataset.snsPoster=entry.id;
    getPoster.onclick=async()=>{
     const media=await inspectPoster(entry.sourceJobId);
     if(!media){info.textContent='저장된 포스터를 찾지 못했습니다. 원본 업무에서 PNG를 다시 확인해 주세요.';return;}
     const url=URL.createObjectURL(media.png),link=el('a');link.href=url;link.download='동백-SNS-'+entry.title.replace(/[\\/:*?"<>|]/g,'-')+'.png';
     document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
     info.textContent='로컬 PNG를 내려받았습니다. 플랫폼에서 직접 확인 후 게시하세요.';
    };actions.append(getPoster);
   }
   if(entry.videoId){
    const getVideo=el('button','연결된 영상 내려받기');getVideo.type='button';getVideo.dataset.snsVideo=entry.id;
    getVideo.onclick=async()=>{
     try{
      const video=await window.DongbaegVideoLibrary?.get(entry.videoId);
      if(!video)throw Error('연결된 영상이 현재 브라우저에 없습니다. 백업·복원을 확인하세요.');
      const link=el('a'),url=URL.createObjectURL(video.blob);link.href=url;link.download='동백-SNS-'+entry.title.replace(/[\\/:*?"<>|]/g,'-')+'.'+video.format;
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
      info.textContent='완성 영상을 내려받았습니다. 플랫폼별 업로드 가능 여부를 확인하세요.';
     }catch(error){info.textContent='영상 내려받기 실패: '+error.message;}
    };actions.append(getVideo);
   }
   const copy=el('button','본문 복사');copy.type='button';copy.dataset.snsCopy=entry.id;
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(entry.caption);info.textContent='본문을 복사했습니다. 플랫폼에서 직접 확인 후 게시하세요.';}catch{info.textContent='복사가 제한됐습니다. 본문을 직접 선택해 복사하세요.';}};actions.append(copy);
   const remove=el('button','삭제');remove.type='button';remove.dataset.snsDelete=entry.id;
   remove.onclick=()=>{if(!window.confirm('게시 계획을 삭제할까요?'))return;entries=entries.filter(x=>x.id!==entry.id);if(put())draw();};actions.append(remove);
   card.append(actions);list.append(card);
  }
 };
 save.onclick=async()=>{
  const title=clean(input.value,100),body=clean(caption.value,3000);
  if(!title||!body){info.textContent='제목과 게시 본문을 입력하세요.';return;}
  if(entries.length>=limit){info.textContent='게시 계획이 250건입니다. 기존 계획을 정리해 주세요.';return;}
  const source=sourceJobId,videoId=sourceVideoId;
  const linked=source?await inspectPoster(source):null;
  const item={id:crypto.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2),platform:select.value,title,caption:body,schedule:clean(publishDate.value,30),sourceJobId:source,videoId,hasPoster:Boolean(linked),review:{},state:'초안',updated:Date.now()};
  entries.unshift(item);if(put()){input.value='';caption.value='';sourceJobId='';sourceVideoId='';origin.textContent='연결된 직원 업무 없음';info.textContent='게시 초안이 저장됐습니다. 대표 승인 전에는 게시하지 않습니다.';draw();}
 };
 document.addEventListener('dongbaek-vision-draft',event=>{
  const item=event.detail||{};
  if(typeof item.post!=='string'||!item.post.trim())return;
  caption.value=clean(item.post,3000);
  if(typeof item.title==='string'&&item.title.trim())input.value=clean(item.title,100);
  info.textContent='실제 장면 분석 기반 게시글과 해시태그 초안을 받아왔습니다. 검토하고 별도 저장해 주세요. 자동 게시는 실행하지 않습니다.';
 });
 document.addEventListener('dongbaek-video-to-sns',async event=>{
  const id=event.detail?.videoId;
  if(typeof id!=='string'||id.length>110||!window.DongbaegVideoLibrary){info.textContent='영상 연결 요청이 올바르지 않습니다.';return;}
  const video=await window.DongbaegVideoLibrary.get(id);
  if(!video){info.textContent='영상 보관함에서 완성 파일을 찾지 못했습니다.';return;}
  let linked=null;
  try{linked=JSON.parse(localStorage.getItem('dongbaek-ai-desk-v1')||'{}').jobs?.find(j=>j.videoId===id);}catch{}
  if(linked&&linked.videoReview!=='approved'){info.textContent='대표실 영상 검수 승인 후 SNS 초안으로 연결할 수 있습니다.';return;}
  sourceVideoId=id;sourceJobId=linked?.id||'';
  input.value=clean(video.title,100);
  caption.value=clean([video.title,video.subtitle,video.cta].filter(Boolean).join('\n'),3000);
  select.value='인스타그램';
  origin.textContent='완성 영상 연결: '+video.title+' · '+video.format.toUpperCase()+' · '+video.width+'×'+video.height;
  info.textContent='영상이 SNS 초안과 연결됐습니다. 문안 수정·5개 항목 검수·대표 승인 후 직접 게시하세요.';
  section.scrollIntoView({behavior:'smooth',block:'start'});
 });
 document.addEventListener('dongbaek-office-to-sns',async event=>{
  const id=event.detail?.jobId;
  if(typeof id!=='string'||id.length>100)return;
  let result=null;
  try{
   const saved=JSON.parse(localStorage.getItem('dongbaek-ai-desk-v1')||'{}');
   result=Array.isArray(saved.jobs)?saved.jobs.find(j=>j.id===id):null;
  }catch{}
  if(!result||!result.result||['generating','pending'].includes(result.status)){info.textContent='직원 업무 결과가 저장된 작업만 SNS 초안으로 전달할 수 있습니다.';return;}
  if(result.videoId){
   if(result.videoReview!=='approved'){info.textContent='대표실 영상 검수 승인이 필요합니다.';return;}
   if(!await window.DongbaegVideoLibrary?.get(result.videoId)){info.textContent='영상 보관함에서 완성 파일을 찾지 못했습니다.';return;}
  }
  sourceJobId=id;sourceVideoId=result.videoId||'';
  const content=clean(result.result,3000);
  const title=clean(result.title,100);
  input.value=title;
  caption.value=content;
  const poster=await inspectPoster(id);
  const suffix=result.videoId?' · 완성 영상 보관함 연결':poster?' · 포스터 PNG 저장됨':' · 연결된 PNG 없음';
  origin.textContent='직원 결과 연결: '+title+suffix;
  info.textContent='직원 결과를 복사했습니다. 문구는 게시글에 맞게 수정하고 대표 승인 후 직접 게시하세요. 자동 실행은 하지 않습니다.';
  section.scrollIntoView({behavior:'smooth',block:'start'});
 });
 draw();
})();
