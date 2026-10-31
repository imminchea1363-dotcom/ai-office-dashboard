/* Read-only, real-task status board. Never starts a paid API call or publishes content. */
(() => {
  'use strict';
  const model = window.DongbaekTeam10State, desk = window.DongbaekAIDesk;
  const section = document.getElementById('db-ai-desk');
  if (!model || !desk?.jobsSnapshot || !section) return;
  const teamNames=['총괄','조사·기획','영상·디자인','SNS 운영','검수·성과'];
  const panel=document.createElement('section');
  panel.id='db-team10-live';
  panel.setAttribute('aria-labelledby','db-team10-heading');
  const heading=document.createElement('h3');
  heading.id='db-team10-heading';
  heading.textContent='10명 직원 · 실제 업무 기록 현황';
  const explanation=document.createElement('p');
  explanation.textContent='업무 기록과 GPT 단계 진행 상태를 보여줍니다. 수동 서비스는 지시문을 복사했다고 실제 AI 작업이 실행된 것은 아닙니다. 직원 이동 화면은 시뮬레이션입니다.';
  const stats=document.createElement('p');stats.id='db-team10-stats';stats.setAttribute('role','status');
  const cards=document.createElement('div');cards.id='db-team10-cards';
  panel.append(heading,explanation,stats,cards);
  section.querySelector('#db-ai-jobs').before(panel);
  const style=document.createElement('style');
  style.textContent=`
    #db-team10-live{padding:18px;margin:18px 0;border:1px solid #c6d4bf;border-radius:12px;background:#f8fbf7}
    #db-team10-live h3{margin:0 0 8px;font-size:17px}
    #db-team10-live p{font-size:12px;line-height:1.7;color:#526451;margin:5px 0 14px}
    #db-team10-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .db-t10-person{padding:11px;border:1px solid #d4dfd0;background:white;border-radius:9px;min-width:0;display:flex;flex-direction:column;gap:5px;overflow-wrap:anywhere}
    .db-t10-person strong{font-size:13px}.db-t10-person small{font-size:11px;color:#677867}
    .db-t10-status{font-size:12px;font-weight:650;color:#315a49}
    .db-t10-title{font-size:11px;color:#5d695c;line-height:1.6}
    #db-team10-live button{margin-top:auto;align-self:flex-start;border:1px solid #a7baa5;border-radius:6px;padding:6px 10px;background:#fff;color:#315447;font-size:11px;cursor:pointer}
    #db-team10-live button:focus-visible{outline:2px solid #376c9c}
    @media(max-width:820px){#db-team10-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:500px){#db-team10-cards{grid-template-columns:1fr}}
  `;
  document.head.append(style);
  const priority={generating:90,pending:85,reporting:80,ready:70,copied:60,prepared:50,failed:30,reported:20};
  const statusText={
    generating:'GPT 호출 진행 중',pending:'GPT 결과 조회 필요',reporting:'대표실 보고 이동 중',
    ready:'결과 기록됨 · 보고 대기',copied:'지시문 복사됨 · 외부 실행 확인 필요',
    prepared:'업무 준비됨 · 외부 실행 전',failed:'GPT 실행 중단',reported:'대표 보고 접수'
  };
  let managerStage=null;
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
  const visibleJobs=()=>desk.jobsSnapshot().filter(j=>model.roster.some(p=>p.id===j.workerId));
  const bestJob=(jobs,id)=>jobs.filter(j=>j.workerId===id)
    .sort((a,b)=>(priority[b.status]||0)-(priority[a.status]||0)||String(b.updated).localeCompare(String(a.updated)))[0];
  const labelFor=(p,job)=>{
    if(managerStage?.workerId===p.id && managerStage.status==='running')return '자동 GPT 단계 진행 중';
    if(managerStage?.workerId===p.id && managerStage.status==='paused')return 'GPT 단계 결과 확인 필요';
    if(!job)return '배정된 업무 없음';
    if(job.status==='ready'&&!job.hasResult)return '결과 기록 확인 필요';
    return statusText[job.status]||'상태 확인 필요';
  };
  function render(){
    const jobs=visibleJobs();
    const pending=jobs.filter(j=>!['reported','failed'].includes(j.status)).length;
    const completed=jobs.filter(j=>j.status==='reported').length;
    stats.textContent='등록된 업무 '+jobs.length+'건 · 진행·확인 '+pending+'건 · 보고 접수 '+completed+'건';
    cards.replaceChildren();
    for(const person of model.roster){
      const job=bestJob(jobs,person.id);
      const card=el('article',undefined,'db-t10-person');card.dataset.staffId=String(person.id);
      card.append(el('small',teamNames[person.team]),el('strong',person.name),el('span',labelFor(person,job),'db-t10-status'));
      if(managerStage?.workerId===person.id&&['running','paused'].includes(managerStage.status))
        card.append(el('span',managerStage.title||'GPT 자동 분장','db-t10-title'));
      else if(job){
        const kind=job.gpt?'GPT 자동 요청 기록':'수동 도구 업무 기록';
        card.append(el('span',job.title+' · '+kind,'db-t10-title'));
      }else card.append(el('span',person.job,'db-t10-title'));
      const button=el('button','업무 배정');button.type='button';
      button.dataset.assignStaff=String(person.id);
      button.addEventListener('click',()=>{
        const select=document.getElementById('db-ai-worker');
        const option=[...select.options].find(o=>o.value===String(person.id));
        if(!option)return;
        select.value=option.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        document.getElementById('db-ai-form').scrollIntoView({behavior:'smooth',block:'start'});
        document.getElementById('db-ai-title').focus({preventScroll:true});
      });
      card.append(button);cards.append(card);
    }
  }
  document.addEventListener('dongbaek-ai-jobs',render);
  document.addEventListener('dongbaek-manager-stage',event=>{
    const d=event.detail||{};
    if(!Number.isInteger(d.workerId)||!model.roster.some(p=>p.id===d.workerId))return;
    managerStage=d.status==='finished'?null:{workerId:d.workerId,status:d.status,title:String(d.title||'').slice(0,120)};
    render();
  });
  window.DongbaekTeam10Live=Object.freeze({snapshot:()=>model.roster.map(p=>{
    const job=bestJob(visibleJobs(),p.id);
    return {id:p.id,name:p.name,status:labelFor(p,job),taskId:job?.id||null,source:job?(job.gpt?'gpt':'manual'):null};
  })});
  render();
})();
