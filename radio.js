/* Local-only request radio: no accounts, streaming service, or file uploads. */
(()=>{'use strict';
const office=window.DongbaekOffice;
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const panel=el('section');panel.className='db-panel db-radio';panel.id='db-radio';
const heading=el('h2','♫ 동백 퇴근길 라디오'),intro=el('p','퇴근 전, 오늘의 신청곡과 사연을 남겨 주세요.');
const status=el('p','신청곡을 모아 대표님이 선곡해 주세요.');status.id='db-radio-status';status.setAttribute('role','status');
const list=el('div');list.id='db-radio-queue';
const collect=el('button','직원 신청곡 받기 · 시뮬레이션');collect.id='db-radio-collect';
const form=el('form');form.id='db-radio-form';
const worker=el('select');worker.id='db-radio-worker';
const title=el('input');title.id='db-radio-song';title.maxLength=80;title.required=true;title.placeholder='곡명';
const artist=el('input');artist.id='db-radio-artist';artist.maxLength=60;artist.required=true;artist.placeholder='가수';
const story=el('textarea');story.id='db-radio-story';story.maxLength=240;story.placeholder='오늘의 사연을 적어 주세요';
const file=el('input');file.id='db-radio-file';file.type='file';file.accept='audio/*';
for(const [name,input]of [['신청 직원',worker],['곡명',title],['가수',artist],['짧은 사연',story],['음악 파일 (선택)',file]]){const label=el('label',name);label.htmlFor=input.id;form.append(label,input);}
const submit=el('button','신청곡 보내기');submit.type='submit';form.append(submit);
const note=el('p','음악 서비스는 연결되지 않습니다. 선택한 파일은 업로드 없이 이 기기에서만 재생됩니다. 파일이 없으면 동백 오리지널 데모를 들을 수 있어요.');note.className='db-radio-note';
const audio=el('audio');audio.controls=true;audio.preload='metadata';audio.id='db-radio-audio';audio.hidden=true;
const stop=el('button','재생 중지');stop.id='db-radio-stop';stop.disabled=true;
const skip=el('button','음악 없이 퇴근하기');skip.id='db-radio-skip';skip.hidden=true;
const auto=el('input');auto.type='checkbox';auto.id='db-radio-auto';auto.checked=true;const autoLabel=el('label');autoLabel.className='db-radio-auto';autoLabel.append(auto,document.createTextNode('곡이 끝나면 신청 직원 퇴근하기'));
panel.append(heading,intro,collect,status,list,form,note,audio,autoLabel,stop,skip);
document.querySelector('.db-right').prepend(panel);
const open=el('button','♫ 퇴근길 라디오');open.id='db-radio-open';document.querySelector('.db-controls').append(open);
const style=el('style');style.textContent='.db-radio h2{font-size:16px;margin:0 0 8px}.db-radio p{font-size:11px;line-height:1.8}.db-radio button{font:inherit;font-size:11px;border:1px solid #b8c1a5;background:#edf0df;color:#315447;border-radius:7px;padding:8px 10px;margin:4px 5px 4px 0}.db-radio form{display:grid;gap:6px;margin-top:14px}.db-radio label{font-size:11px;color:#6f7d65}.db-radio input:not([type=checkbox]),.db-radio select,.db-radio textarea{font:inherit;font-size:12px;width:100%;min-width:0;border:1px solid #d2c8ad;border-radius:6px;padding:8px;background:#fffdf5;color:#354e40}.db-radio textarea{resize:vertical;min-height:64px}.db-radio input[type=file]{font-size:10px}.db-radio-note{color:#8a856f}.db-radio audio{width:100%;margin:10px 0}.db-radio-auto{display:flex;align-items:center;gap:6px;margin:8px 0}.db-radio-item{padding:10px 0;border-bottom:1px solid #ddd5c2}.db-radio-item b{font-size:12px;display:block}.db-radio-item small{display:block;font-size:10px;color:#7d896f;margin:5px 0}.db-radio-item p{margin:4px 0;overflow-wrap:anywhere}#db-radio-status{padding:9px;background:#edf0df;border-radius:7px}';document.head.append(style);
let requests=[],urls=[],playing=null,context=null,timer=null,queueId=null,departureId=null,serial=0,generation=0;
function refreshWorkers(preferred){const current=preferred??Number(worker.value);worker.replaceChildren();for(const p of office.employees().filter(p=>p.state!=='off')){const option=el('option',p.job+' · '+p.name);option.value=p.id;worker.append(option);}if([...worker.options].some(o=>Number(o.value)===current))worker.value=current;submit.disabled=!worker.options.length;}
function show(){refreshWorkers();panel.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});}
function radioAudio(active){window.dispatchEvent(new CustomEvent('dongbaek-radio-audio',{detail:{active}}));}
function stopPlayback(){radioAudio(false);generation++;clearTimeout(timer);timer=null;audio.pause();audio.removeAttribute('src');audio.load();audio.hidden=true;if(context){context.close().catch(()=>{});context=null;}playing=null;stop.disabled=true;}
function render(){list.replaceChildren();for(const r of requests){const item=el('article');item.className='db-radio-item';item.dataset.request=r.id;item.append(el('b',r.title+' · '+r.artist),el('small',r.job+' · '+r.name),el('p',r.story||'오늘도 모두 수고하셨습니다.'));const play=el('button',r.url?'선곡 · 파일 재생':r.original?'선곡 · 오리지널 데모 재생':'선곡 · 동백 데모로 듣기');play.dataset.radioPlay=r.id;play.onclick=()=>playRequest(r);item.append(play);if(r.done)item.append(el('small','✓ 감상 완료'));list.append(item);}}
function depart(id){if(!office.employees().some(p=>p.id===id&&p.state!=='off'))return;if(office.depart(id)){status.textContent='음악과 함께 하루를 마쳤어요. 3층 작업실에서 퇴근합니다.';departureId=null;skip.hidden=true;queueId=null;}else{queueId=id;status.textContent='승강기를 이용 중인 직원이 있어요. 이동이 끝나면 신청 직원이 퇴근합니다.';}}
function complete(r){radioAudio(false);r.done=true;playing=null;stop.disabled=true;render();status.textContent=r.name+'의 신청 시간이 끝났습니다. 오늘도 수고했어요!';if(auto.checked)depart(r.workerId);}
async function playRequest(r){const employee=office.employees().find(p=>p.id===r.workerId);if(!employee||employee.state==='off'){status.textContent='이미 퇴근한 직원입니다. 다른 직원의 신청곡을 골라 주세요.';return;}queueId=null;stopPlayback();playing=r;radioAudio(true);const token=generation;stop.disabled=false;status.textContent=r.url?'재생 중: '+r.title+' · '+r.artist:'재생 중: 동백 오리지널 데모 (12초) · 신청곡 음원을 대신 재생하는 것은 아닙니다.';
try{if(r.url){audio.src=r.url;audio.hidden=false;await audio.play();}else{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error();context=new AC();await context.resume();if(token!==generation)return;const notes=[261.63,329.63,392,440,392,329.63,293.66,261.63,329.63,392,523.25,392,329.63,293.66,261.63,196];for(let i=0;i<notes.length;i++){const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*.7;osc.type='sine';osc.frequency.value=notes[(i+(r.workerId%4)*2)%notes.length];gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.08,at+.05);gain.gain.exponentialRampToValueAtTime(.001,at+.65);osc.connect(gain);gain.connect(context.destination);osc.start(at);osc.stop(at+.7);}timer=setTimeout(()=>{if(token!==generation)return;context?.close().catch(()=>{});context=null;complete(r);},12000);}}
catch{if(token!==generation)return;stopPlayback();status.textContent='음악을 재생하지 못했어요. 파일 형식이나 브라우저의 소리 허용을 확인해 주세요. 직원은 아직 퇴근하지 않습니다.';}}
audio.onended=()=>{if(playing)complete(playing);};audio.onerror=()=>{if(playing){stopPlayback();status.textContent='이 음악 파일을 재생할 수 없습니다. 다른 파일을 선택해 주세요.';}};
stop.onclick=()=>{stopPlayback();queueId=null;status.textContent='재생을 중지했습니다. 직원은 퇴근하지 않습니다.';};
form.onsubmit=e=>{e.preventDefault();const p=office.employees().find(p=>p.id===Number(worker.value)&&p.state!=='off');if(!p||!title.value.trim()||!artist.value.trim()){status.textContent='출근 중인 직원과 곡명, 가수를 확인해 주세요.';return;}const f=file.files[0];if(f&&f.type&&!f.type.startsWith('audio/')){status.textContent='음악 파일을 선택해 주세요.';return;}const url=f?URL.createObjectURL(f):null;if(url)urls.push(url);requests.push({id:++serial,workerId:p.id,job:p.job,name:p.name,title:title.value.trim(),artist:artist.value.trim(),story:story.value.trim(),url});title.value='';artist.value='';story.value='';file.value='';render();status.textContent=p.name+'의 신청곡을 받았습니다. 목록에서 선곡해 주세요.';};
collect.onclick=()=>{const songs=['오늘도 수고했어요','동백꽃 산책','노을빛 책상','집으로 가는 길'];for(const p of office.employees().filter(p=>p.state!=='off')){if(requests.some(r=>r.workerId===p.id&&!r.done))continue;requests.push({id:++serial,workerId:p.id,job:p.job,name:p.name,title:songs[(p.id-1)%4],artist:'동백 라디오 · 오리지널 데모',story:['오늘 함께해 준 동료들에게 들려주고 싶어요.','퇴근길엔 잠깐 하늘을 보고 싶어요.','오늘 만든 디자인처럼 포근한 곡을 신청해요.','모두 꼼꼼하게 마무리한 하루, 수고하셨습니다.'][(p.id-1)%4],original:true});}render();status.textContent='직원들의 데모 신청곡과 사연을 받았습니다. 대표님이 한 곡 골라 주세요.';refreshWorkers();};
open.onclick=show;skip.onclick=()=>{stopPlayback();queueId=null;if(departureId!==null)depart(departureId);};
window.DongbaekRadio={stopForStream(){if(playing)stopPlayback();},requestDeparture(id){departureId=id;skip.hidden=false;show();refreshWorkers(id);status.textContent='퇴근 전에 신청곡을 남겨 주세요. 선곡해서 듣거나 음악 없이 퇴근할 수 있어요.';title.focus({preventScroll:true});},reset(){stopPlayback();for(const url of urls)URL.revokeObjectURL(url);urls=[];requests=[];queueId=null;departureId=null;skip.hidden=true;render();status.textContent='새로운 하루의 신청곡을 기다립니다.';refreshWorkers();}};
setInterval(()=>{if(queueId!==null&&!office.busy())depart(queueId);},1000);
window.addEventListener('pagehide',()=>{stopPlayback();});refreshWorkers();
})();
