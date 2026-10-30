/* Official licensed-service embeds for work music. No copied music or unapproved streams. */
(()=>{
 'use strict';
 const STORE='dongbaek-office-music-v1';
 const presets=[
  ['최신 가요','https://open.spotify.com/playlist/37i9dQZF1DXe5W6diBL5N4'],
  ['K-POP','https://open.spotify.com/playlist/37i9dQZF1DX9tPFwDMOaN1'],
  ['팝','https://open.spotify.com/playlist/37i9dQZF1DWUa8ZRTfalHk']
 ];
 function elem(tag,text){
  const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;
 }
 function resolve(raw){
  if(typeof raw!=='string'||raw.length>500)throw Error('주소를 확인해 주세요.');
  let url;try{url=new URL(raw.trim());}catch{throw Error('Spotify 또는 YouTube의 HTTPS 주소를 입력하세요.');}
  if(url.protocol!=='https:'||url.username||url.password||url.port)throw Error('공식 HTTPS 음악 주소만 연결할 수 있습니다.');
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  const parts=url.pathname.split('/').filter(Boolean);
  if(host==='open.spotify.com'){
   let at=0;
   if(/^intl-[a-z]{2}$/i.test(parts[at]||''))at++;
   if(parts[at]==='embed')at++;
   if(parts[at]==='user'&&parts[at+2]==='playlist')at+=2;
   const category=parts[at],id=parts[at+1];
   if(!['playlist','track','album','artist','show','episode'].includes(category)||!(/^[a-zA-Z0-9]{22}$/.test(id||'')))throw Error('Spotify 곡·앨범·재생목록 공유 주소를 입력하세요.');
   return {source:'spotify',link:'https://open.spotify.com/'+category+'/'+id,
    embed:'https://open.spotify.com/embed/'+category+'/'+id};
  }
  if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','youtu.be'].includes(host)){
   let id=null,playlist=url.searchParams.get('list');
   if(host==='youtu.be')id=parts[0];
   else if(parts[0]==='watch')id=url.searchParams.get('v');
   else if(['shorts','live','embed'].includes(parts[0]))id=parts[1];
   if(playlist&&/^[A-Za-z0-9_-]{10,110}$/.test(playlist)){
    return {source:'youtube',link:'https://www.youtube.com/playlist?list='+playlist,embed:'https://www.youtube.com/embed/videoseries?list='+playlist+'&playsinline=1'};
   }
   if(id&&/^[A-Za-z0-9_-]{11}$/.test(id)){
    return {source:'youtube',link:'https://www.youtube.com/watch?v='+id,embed:'https://www.youtube.com/embed/'+id+'?playsinline=1'};
   }
   throw Error('YouTube 영상 또는 재생목록 공유 주소를 입력하세요.');
  }
  throw Error('Spotify 또는 YouTube 공식 주소만 지원합니다.');
 }
 const launch=elem('button','♫ 작업 음악');launch.id='db-office-music-open';launch.className='db-install';launch.type='button';
 (document.querySelector('.db-secondary')||document.querySelector('.db-controls')||document.body).append(launch);
 const panel=elem('section');panel.id='db-office-music';panel.hidden=true;
 panel.setAttribute('aria-labelledby','db-office-music-heading');
 const title=elem('h3','♫ 동백사무실 작업 음악');title.id='db-office-music-heading';
 const close=elem('button','닫기 ×');close.id='db-office-music-close';close.type='button';
 const head=elem('div');head.className='db-music-heading';head.append(title,close);
 const intro=elem('p','실제 가요·팝을 Spotify·YouTube 공식 플레이어로 듣습니다. 동백사무실은 음원을 다운로드하거나 복사하지 않습니다.');
 const buttons=elem('div');buttons.className='db-music-presets';
 const urlLabel=elem('label','내 Spotify·YouTube 곡/재생목록 주소');
 const input=elem('input');input.type='url';input.id='db-office-music-url';input.maxLength=500;input.placeholder='https://open.spotify.com/playlist/...';input.autocomplete='off';urlLabel.append(input);
 const load=elem('button','공식 플레이어 열기');load.id='db-office-music-load';load.type='button';
 const stop=elem('button','음악 끄기');stop.id='db-office-music-stop';stop.type='button';stop.disabled=true;
 const actions=elem('div');actions.className='db-music-actions';actions.append(load,stop);
 const status=elem('p','가요·팝 목록을 선택하거나 공유 주소를 붙여넣으세요.');status.id='db-office-music-status';status.setAttribute('role','status');
 const holder=elem('div');holder.id='db-office-music-player';
 const official=elem('a','음악 서비스에서 열기');official.id='db-office-music-service';official.target='_blank';official.rel='noopener noreferrer';official.hidden=true;
 const notice=elem('p','브라우저 정책에 따라 자동 재생하지 않습니다. 공식 플레이어의 ▶를 눌러주세요. Spotify는 계정·곡·기기에 따라 짧은 미리 듣기만 제공될 수 있습니다. 인터넷 연결이 필요합니다.');
 notice.className='db-music-notice';
 panel.append(head,intro,buttons,urlLabel,actions,status,holder,official,notice);document.body.append(panel);
 const css=elem('style');
 css.textContent=[
  '#db-office-music[hidden]{display:none!important}',
  '#db-office-music{position:fixed;z-index:70;right:12px;bottom:12px;width:min(390px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;background:#fff9ec;color:#304c3e;border:1px solid #b9ab8c;border-radius:14px;box-shadow:0 12px 42px #1b2e2555;padding:15px}',
  '#db-office-music .db-music-heading{display:flex;justify-content:space-between;gap:10px;align-items:center}',
  '#db-office-music h3{font-size:17px;margin:0}',
  '#db-office-music p{font-size:12px;line-height:1.7;margin:10px 0}',
  '#db-office-music label{display:block;font-weight:600;font-size:12px;line-height:1.7}',
  '#db-office-music input{box-sizing:border-box;width:100%;padding:9px;font-size:12px;color:#253f35;background:white;border:1px solid #a8bba7;border-radius:7px}',
  '#db-office-music button{border:1px solid #b0bcae;border-radius:7px;padding:8px 12px;background:#eaf0e6;color:#315443;font-size:12px;cursor:pointer}',
  '#db-office-music button:disabled{opacity:.5;cursor:default}',
  '#db-office-music .db-music-presets,#db-office-music .db-music-actions{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}',
  '#db-office-music .db-music-presets button{font-weight:700;background:#e1eee1}',
  '#db-office-music #db-office-music-load{background:#315e49;color:#fff}',
  '#db-office-music #db-office-music-status{background:#eaf2e8;padding:9px;border-radius:7px}',
  '#db-office-music iframe{display:block;border:0;border-radius:9px;width:100%;min-width:200px;background:#26382b}',
  '#db-office-music #db-office-music-service{display:inline-block;font-size:12px;color:#275b42;margin:8px 0;text-decoration:underline}',
  '#db-office-music #db-office-music-service[hidden]{display:none}',
  '#db-office-music .db-music-notice{font-size:11px;color:#786f5d}',
  '@media(max-width:500px){#db-office-music{right:8px;bottom:8px;width:calc(100vw - 16px);max-height:72dvh;padding:11px}}'
 ].join('\n');document.head.append(css);
 let current=null;
 const signal=isOn=>window.dispatchEvent(new CustomEvent('dongbaek-stream-music',{detail:{active:isOn}}));
 function stopAudio(){
  holder.replaceChildren();current=null;stop.disabled=true;official.hidden=true;official.removeAttribute('href');signal(false);
 }
 function store(url){try{localStorage.setItem(STORE,JSON.stringify({url}));}catch{}}
 function loadUrl(url){
  const p=resolve(url);
  window.DongbaekRadio?.stopForStream?.();
  stopAudio();
  const frame=elem('iframe');frame.src=p.embed;frame.title=p.source==='spotify'?'Spotify 공식 음악 플레이어':'YouTube 공식 음악 플레이어';
  frame.height=p.source==='youtube'?'220':'200';frame.loading='eager';
  frame.setAttribute('allow','autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write');
  frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.setAttribute('allowfullscreen','');
  holder.append(frame);official.href=p.link;official.hidden=false;current=p;stop.disabled=false;input.value=p.link;store(p.link);
  status.textContent=(p.source==='spotify'?'Spotify':'YouTube')+' 공식 플레이어를 열었습니다. 아래 ▶를 직접 눌러주세요. 사무실 장면 이동 중에도 플레이어가 유지됩니다.';
  signal(true);panel.hidden=false;launch.setAttribute('aria-expanded','true');
 }
 function request(url){
  try{loadUrl(url);}catch(error){status.textContent=error.message||'공유 링크를 확인해 주세요.';return false;}
  return true;
 }
 for(const [label,url]of presets){
  const b=elem('button',label);b.type='button';b.dataset.musicPreset=label;b.onclick=()=>request(url);buttons.append(b);
 }
 load.onclick=()=>request(input.value);
 stop.onclick=()=>{stopAudio();status.textContent='공식 음악 플레이어를 중지했습니다.';};
 close.onclick=()=>{stopAudio();panel.hidden=true;launch.setAttribute('aria-expanded','false');};
 launch.onclick=()=>{
  if(!panel.hidden){stopAudio();panel.hidden=true;launch.setAttribute('aria-expanded','false');}
  else {panel.hidden=false;launch.setAttribute('aria-expanded','true');}
 };
 launch.setAttribute('aria-expanded','false');launch.setAttribute('aria-controls',panel.id);
 window.addEventListener('dongbaek-radio-audio',e=>{if(e.detail?.active&&current){stopAudio();status.textContent='퇴근길 라디오 재생으로 작업 음악을 중지했습니다.';}});
 window.addEventListener('pagehide',stopAudio);
 try{const settings=JSON.parse(localStorage.getItem(STORE)||'null');
  if(settings&&typeof settings.url==='string'){input.value=resolve(settings.url).link;status.textContent='마지막 재생목록을 기억했습니다. 원하는 음악을 선택해 ▶를 누르세요.';}
 }catch{}
 window.DongbaekOfficeMusic=Object.freeze({parseLink:resolve,active:()=>Boolean(current)});
})();