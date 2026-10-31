/* Team-of-ten staffing and real-task state model. Staged only: no external API calls or publishing. */
(function(root){
  'use strict';
  const SEATS=[
    [399,98],[20,216],[-3,580],[611,569],[150,216],
    [158,580],[310,580],[599,216],[766,216],[769,569]
  ];
  const PEOPLE=[
    {id:1,team:0,job:'총괄',name:'동백총괄매니저'},
    {id:2,team:1,job:'자료조사',name:'임채리사원'},
    {id:3,team:2,job:'디자인·영상',name:'임민채대리'},
    {id:4,team:4,job:'검수',name:'김검수사원'},
    {id:5,team:1,job:'홍보기획',name:'홍보기획 사원'},
    {id:6,team:2,job:'광고영상',name:'광고영상 사원'},
    {id:7,team:2,job:'영상편집',name:'영상편집 사원'},
    {id:8,team:3,job:'SNS 운영',name:'SNS 운영팀장'},
    {id:9,team:3,job:'블로그',name:'블로그·콘텐츠 사원'},
    {id:10,team:4,job:'성과분석',name:'성과분석 사원'}
  ];
  const REST=['pantry','gym','roof'];
  const roster=Object.freeze(PEOPLE.map((p,i)=>Object.freeze({...p,seat:i,coordinates:Object.freeze([...SEATS[i]])})));
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  function createState(){
    return {workers:roster.map(p=>({...p,state:'ready',location:'office',current:null,queue:[],reports:0})),restTurn:0};
  }
  function workerOf(state,id){
    check(state&&Array.isArray(state.workers),'유효하지 않은 사무실 상태');
    const worker=state.workers.find(w=>w.id===id);
    check(worker,'등록되지 않은 직원 ID');
    return worker;
  }
  function enqueue(state,id,task){
    const w=workerOf(state,id);
    check(task&&typeof task.id==='string'&&task.id.trim()&&typeof task.title==='string'&&task.title.trim(),'업무에는 id와 제목이 필요합니다');
    check(!state.workers.some(w=>(w.current&&w.current.id===task.id)||w.queue.some(t=>t.id===task.id)),'중복 업무 ID');
    const item={id:task.id.trim(),title:task.title.trim(),result:null,approved:false};
    if(w.current){w.queue.push(item);return w;}
    w.current=item;w.state='working';w.location='office';
    return w;
  }
  function complete(state,id,result){
    const w=workerOf(state,id);
    check(w.current&&w.state==='working','진행 중인 업무만 완료할 수 있습니다');
    check(typeof result==='string'&&result.trim(),'실제 작업 결과를 입력해야 합니다');
    w.current.result=result.trim();w.state='review';return w;
  }
  function review(state,id,approved){
    const w=workerOf(state,id);
    check(w.current&&w.state==='review','검수 대기 상태만 검수할 수 있습니다');
    check(typeof approved==='boolean','검수 승인 여부는 불리언이어야 합니다');
    if(approved){w.current.approved=true;w.state='approved';}
    else{w.current.result=null;w.current.approved=false;w.state='working';}
    return w;
  }
  function report(state,id){
    const w=workerOf(state,id);
    check(w.current&&w.state==='approved'&&w.current.approved,'검수 승인된 업무만 보고할 수 있습니다');
    w.reports+=1;
    w.current=null;
    if(w.queue.length){
      w.current=w.queue.shift();
      w.state='working';
      w.location='office';
    }else{
      w.state='resting';
      w.location=REST[state.restTurn++%REST.length];
    }
    return w;
  }
  function snapshot(state){
    check(state&&Array.isArray(state.workers),'유효하지 않은 사무실 상태');
    return state.workers.map(w=>({...w,current:w.current?{...w.current}:null,queue:w.queue.map(t=>({...t})),coordinates:[...w.coordinates]}));
  }
  const api=Object.freeze({roster,createState,enqueue,complete,review,report,snapshot});
  root.DongbaekTeam10State=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
