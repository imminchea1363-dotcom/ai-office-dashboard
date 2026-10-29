/* Representative-approved office rules. Local to this browser, never auto-learn from GPT. */
(() => {
 'use strict';
 const KEY='dongbaek-office-manual-v1', MAX=1400;
 const defaults={
  common:'실시간 검색·게시·결제·이미지 AI 생성이 확인되지 않았다면 완료했다고 주장하지 않는다. 모르는 수치·가격·시설·후기·예약 가능 여부는 추측하지 않고 확인 필요로 표시한다. 외부 게시와 유료 작업은 대표 승인 후 실행한다.',
  research:'임채리 사원: 자료조사 담당. 검색 연결이 없으면 실시간 검색했다고 주장하지 않고 제공된 내용과 미확인 사항을 구분한다.',
  design:'임민채 대리: 이미지 디자인과 영상 제작 담당. 15초 세로 숏폼은 실제 촬영 자료로 편집하며 초반 1~2초 후킹·가독성 있는 자막·안전 영역·CTA를 지킨다. 확인되지 않은 장면이나 시설을 지어내지 않고, 원본 영상과 실제 출력 형식을 정확히 구분한다.  동백팬션 홍보는 실제 제공된 사진을 우선 사용한다. 사진 속 내용을 임의 변형하거나 없는 시설을 추가하지 않는다. 큰 제목, 짧고 읽기 쉬운 문구, 과도한 AI 느낌을 피한다.',
  review:'김검수 사원: 출처·숫자·과장 광고·사진 진위·가격·실행 가능성을 확인한다. 확인 불가 사항은 대표 승인 필요로 분리한다.',
  manager:'동백총괄매니저: 업무를 담당자에게 나눠 배정하고 검수 뒤 결과와 대표 승인 사항을 간결하게 보고한다.'
 };
 const clean=x=>typeof x==='string'?x.trim().slice(0,MAX):'';
 let rules={...defaults};
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
   for(const k of Object.keys(defaults))if(typeof saved[k]==='string')rules[k]=clean(saved[k]);
  }
 }catch{}
 function save(next){
  const result={};
  for(const k of Object.keys(defaults))result[k]=clean(next[k]);
  try{localStorage.setItem(KEY,JSON.stringify(result));rules=result;return true;}catch{return false;}
 }
 const api={
  forStage:(stage,design)=>{
   const keys=stage===0?['common','manager']:stage===1?['common','research']:
    design&&stage===2?['common','design']:
    stage===(design?3:2)?['common','review']:['common','manager'];
   return keys.map(k=>'['+k+'] '+rules[k]).join('\n').slice(0,2800);
  },
  read:()=>({...rules}),
  defaults:()=>({...defaults}),
  appendApprovedDesign:(note)=>{
   const value=clean(note);
   if(!value||value.length<8)throw Error('앞으로 기억할 디자인 기준을 8자 이상 적어 주세요.');
   if(value.length>320)throw Error('한 번에 저장할 기준은 320자 이하로 적어 주세요.');
   const next={...rules};
   if(next.design.includes(value))return true;
   if((next.design+'\n- '+value).length>MAX)throw Error('매뉴얼 저장 공간이 부족합니다. 기존 디자인 기준을 정리해 주세요.');
   next.design=next.design+'\n- '+value;
   if(!save(next))throw Error('브라우저에 매뉴얼을 저장하지 못했습니다.');
   const manual=document.querySelector('#db-manual');
   if(manual){const fields=manual.querySelectorAll('textarea');if(fields[3])fields[3].value=next.design;}
   return true;
  }
 };
 function install(target){
  if(!target||document.getElementById('db-manual'))return;
  const section=document.createElement('section');section.id='db-manual';
  section.style.cssText='margin:16px 0;padding:16px;border:1px solid #b4c3ad;border-radius:12px;background:#f4f8f1';
  const details=document.createElement('details'),title=document.createElement('summary');
  title.textContent='📘 동백사무실 직원별 업무 매뉴얼 · 대표님 승인 기준';
  title.style.cssText='font-weight:750;cursor:pointer;font-size:16px';
  details.append(title);
  const intro=document.createElement('p');
  intro.textContent='저장한 기준은 이후 새로운 GPT 업무 지시에 자동 포함됩니다. 기존 완료 보고서를 AI가 스스로 학습하는 기능은 아닙니다. 이 브라우저에만 저장되므로 다른 기기에서는 JSON 내보내기·가져오기를 사용하세요.';
  details.append(intro);
  const labels={common:'전체 공통 기준',manager:'동백총괄매니저',research:'임채리 사원 · 조사',design:'임민채 대리 · 디자인·영상',review:'김검수 사원 · 검수'};
  const areas={};
  for(const key of ['common','manager','research','design','review']){
   const label=document.createElement('label');label.textContent=labels[key];
   label.style.cssText='display:block;font-weight:650;font-size:13px;margin:10px 0';
   const area=document.createElement('textarea');area.value=rules[key];area.rows=3;area.maxLength=MAX;
   area.style.cssText='display:block;width:100%;box-sizing:border-box;padding:9px;font:inherit;font-size:13px;border:1px solid #a7b8a4;border-radius:7px';
   label.append(area);details.append(label);areas[key]=area;
  }
  const status=document.createElement('p');status.setAttribute('role','status');
  const buttons=document.createElement('div');buttons.style.cssText='display:flex;flex-wrap:wrap;gap:8px';
  function button(label,fn){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;buttons.append(b);
  }
  button('매뉴얼 저장',()=>{
   const next=Object.fromEntries(Object.keys(defaults).map(k=>[k,areas[k].value]));
   status.textContent=save(next)?'매뉴얼 저장 완료 · 이후 새 업무부터 적용됩니다.':'브라우저 저장이 제한되어 적용하지 못했습니다.';
  });
  button('JSON 백업 내보내기',()=>{
   const blob=new Blob([JSON.stringify({version:1,rules:api.read()},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='동백사무실-직원매뉴얼.json';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
  });
  const importer=document.createElement('input');importer.type='file';importer.accept='.json,application/json';
  importer.setAttribute('aria-label','직원 매뉴얼 JSON 가져오기');buttons.append(importer);
  importer.onchange=async()=>{
   try{
    const file=importer.files?.[0];if(!file)return;
    if(file.size>16000)throw Error('16KB 이하 JSON 파일만 사용할 수 있습니다.');
    const data=JSON.parse(await file.text());
    if(data.version!==1||!data.rules||typeof data.rules!=='object')throw Error('매뉴얼 백업 형식이 아닙니다.');
    const next={...rules};
    for(const k of Object.keys(defaults)){
     if(typeof data.rules[k]!=='string')throw Error('매뉴얼 항목이 빠졌습니다: '+k);
     next[k]=clean(data.rules[k]);areas[k].value=next[k];
    }
    if(!save(next))throw Error('브라우저 저장이 허용되지 않습니다.');
    status.textContent='매뉴얼을 가져와 저장했습니다. 이후 새 업무에 적용됩니다.';
   }catch(e){status.textContent=e.message||'가져오기에 실패했습니다.';}
   finally{importer.value='';}
  };
  details.append(buttons,status);section.append(details);target.prepend(section);
 }
 window.DongbaekOfficeManual=Object.freeze({...api,install});
})();