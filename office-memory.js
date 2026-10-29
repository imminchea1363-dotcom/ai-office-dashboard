/* Office manual v6 — explicit, editable, local rules rather than unreviewed automatic learning. */
(() => {
 'use strict';
 const KEY='dongbaek-office-manual-v1';
 const LIMIT=650;
 const defaults=Object.freeze({
  general:'확인되지 않은 가격·할인·예약 현황·후기·시설·통계를 사실처럼 쓰지 않는다. 실시간 검색이나 외부 게시를 수행했다고 주장하지 않는다. 게시·결제·광고는 대표의 사전 승인 후 실행한다.',
  manager:'직원별 담당 업무를 구분하고, 최종 보고에는 확인된 사실·미확인 사항·대표 승인 사항을 따로 제시한다. GPT 역할 분담을 실제 독립 서비스 접속으로 과장하지 않는다.',
  research:'제공된 자료와 추정을 명확히 분리한다. 출처가 없으면 실시간 조사 완료라고 쓰지 않는다. 자료 부족 시 무엇을 확인해야 하는지 구체적으로 표시한다.',
  design:'동백팬션 홍보는 실제 제공 사진을 우선 활용한다. 가상의 객실·반려견·시설을 실제처럼 표현하지 않는다. 지나친 AI 느낌을 줄이고, 제목과 주요 문구는 크게 읽기 쉽게 배치한다. 확인되지 않은 가격·혜택은 넣지 않는다.',
  qa:'원문과 이미지 문구의 가격·혜택·시설·위치 등 사실 주장을 검수한다. 미확인 정보 및 실사진 왜곡 위험을 지적한다. 검수 통과가 실제 게시 승인이라는 뜻은 아니다.'
 });
 const names={general:'공통 업무 기준',manager:'동백총괄매니저',research:'임채리 사원 · 자료조사',design:'임민채 대리 · 디자인',qa:'김검수 사원 · 검수'};
 const ids=Object.keys(names);
 function normalize(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('올바른 업무 매뉴얼 형식이 아닙니다.');
  return Object.fromEntries(ids.map(id=>{
   if(typeof data[id]!=='string')throw Error(names[id]+' 기준이 없습니다.');
   if(data[id].length>LIMIT)throw Error(names[id]+' 기준은 '+LIMIT+'자 이하로 작성하세요.');
   return [id,data[id].trim()];
  }));
 }
 let guide={...defaults};
 let stored=false;
 try{const data=localStorage.getItem(KEY);if(data){guide=normalize(JSON.parse(data));stored=true;}}catch{stored=false;}
 function persist(data){
  const checked=normalize(data);
  localStorage.setItem(KEY,JSON.stringify(checked));
  guide=checked;stored=true;
 }
 function snapshot(){return {...guide};}
 function install(anchor){
  const outer=document.createElement('section');outer.id='db-office-manual';outer.style.cssText='margin:14px 0;padding:17px;background:#f2f7ed;border:1px solid #9eb49c;border-radius:12px;color:#243d35';
  const details=document.createElement('details');outer.append(details);
  const title=document.createElement('summary');title.textContent='📘 AI 직원 업무 매뉴얼 · 대표님 지시 기준';title.style.cssText='font-weight:750;font-size:17px;cursor:pointer;padding:4px 0';details.append(title);
  const intro=document.createElement('p');intro.textContent='여기에 저장한 기준은 이후 새 GPT 업무에 자동 적용됩니다. 보고서를 읽고 AI가 스스로 학습하지는 않습니다. 저장한 내용은 이 브라우저에만 보관되며 다른 기기에는 자동 동기화되지 않습니다.';intro.style.cssText='font-size:13px;line-height:1.7';details.append(intro);
  const privacy=document.createElement('p');privacy.textContent='주의: 저장한 업무 기준은 새 GPT 업무를 실행할 때 요청문에 포함되어 외부 GPT 서버로 전달됩니다. 비밀번호나 개인정보를 적지 마세요.';privacy.style.cssText='font-size:12px;line-height:1.6;color:#774c25';details.append(privacy);
  const fields={};
  for(const id of ids){
   const label=document.createElement('label');label.textContent=names[id];label.style.cssText='display:block;margin:12px 0 5px;font-size:13px;font-weight:650';
   const textarea=document.createElement('textarea');textarea.value=guide[id];textarea.maxLength=LIMIT;textarea.rows=id==='general'||id==='design'?3:2;textarea.dataset.officeRule=id;
   textarea.style.cssText='display:block;box-sizing:border-box;width:100%;padding:9px;border:1px solid #a4b4a2;border-radius:6px;font:14px/1.6 system-ui,sans-serif;resize:vertical';
   label.append(textarea);details.append(label);fields[id]=textarea;
  }
  const controls=document.createElement('div');controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:13px 0';
  const btn=(text)=>{
   const b=document.createElement('button');b.type='button';b.textContent=text;b.style.cssText='padding:9px 13px;border-radius:7px;cursor:pointer;border:1px solid #6c9278;background:white;color:#214433';controls.append(b);return b;
  };
  const save=btn('대표 기준 저장'),backup=btn('기준 백업 JSON'),restore=btn('백업 가져오기'),reset=btn('기본 기준 복원');
  details.append(controls);
  const importInput=document.createElement('input');importInput.type='file';importInput.accept='application/json,.json';importInput.style.display='none';details.append(importInput);
  const status=document.createElement('p');status.id='db-office-manual-status';status.setAttribute('role','status');status.style.cssText='font-size:13px;margin:6px 0 0';
  status.textContent=stored?'저장된 업무 기준을 불러왔습니다. 새 업무부터 적용됩니다.':'기본 업무 기준이 표시됩니다. 수정 후 저장할 수 있습니다.';details.append(status);
  function current(){return Object.fromEntries(ids.map(id=>[id,fields[id].value]));}
  save.onclick=()=>{try{persist(current());status.textContent='대표님 업무 기준 저장 완료 · 이후 새 GPT 업무에 적용됩니다.';}catch(e){status.textContent='저장 실패: '+e.message;}};
  backup.onclick=()=>{
   try{
    const blob=new Blob([JSON.stringify(normalize(current()),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='동백사무실-직원업무기준.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    status.textContent='백업 파일을 내려받았습니다. 다른 기기에서는 파일을 가져와 저장하세요.';
   }catch(e){status.textContent=e.message;}
  };
  restore.onclick=()=>importInput.click();
  importInput.onchange=async()=>{
   const file=importInput.files?.[0];if(!file)return;
   if(file.size>16000){status.textContent='백업 파일은 16KB 이하여야 합니다.';return;}
   try{const parsed=normalize(JSON.parse(await file.text()));persist(parsed);for(const id of ids)fields[id].value=parsed[id];status.textContent='백업을 불러와 저장했습니다. 다음 업무부터 적용됩니다.';}
   catch(e){status.textContent='불러오기 실패: '+e.message;}
   finally{importInput.value='';}
  };
  reset.onclick=()=>{
   if(!confirm('기본 업무 기준으로 되돌리고 저장할까요? 기존 수정 내용은 백업하지 않으면 복구할 수 없습니다.'))return;
   try{persist({...defaults});for(const id of ids)fields[id].value=guide[id];status.textContent='기본 업무 기준으로 복원했습니다.';}
   catch(e){status.textContent='복원 실패: '+e.message;}
  };
  anchor.parentNode.insertBefore(outer,anchor);
 }
 window.DongbaekOfficeMemory=Object.freeze({snapshot,install,defaults:{...defaults}});
})();