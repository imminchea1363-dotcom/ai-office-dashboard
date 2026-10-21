/* Home-screen installation and offline readiness. No install is implied by a click. */
(() => {
  'use strict';
  let promptEvent = null, registration = null, ready = false, checking = false, error = '', installedThisSession = false, applyingUpdate = false;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const fileLike = !['http:', 'https:'].includes(location.protocol);
  const secure = window.isSecureContext && !fileLike;
  const embedded = /; wv\)|\bwv\b|Acode/i.test(navigator.userAgent);
  const style = document.createElement('style');
  style.textContent = `.db-install{font:inherit;font-size:11px;background:#e6c16d;color:#352d22;border:2px solid #9d793c;border-radius:3px;padding:8px 12px;cursor:pointer}.db-install-panel{border:2px solid #a68a53;border-radius:5px;background:#fff8e6;color:#4a3c28;padding:25px;max-width:440px;width:calc(100% - 28px);max-height:85vh;overflow:auto}.db-install-panel::backdrop{background:#211b16aa}.db-install-panel h2{font-size:19px;margin:0 0 15px}.db-install-panel p,.db-install-panel li{font-size:13px;line-height:1.9}.db-install-panel ol{padding-left:22px}.db-install-panel .install-status{padding:10px 12px;background:#eee7d2;border:1px solid #d5c79b;border-radius:4px}.db-install-panel button{font:inherit;font-size:12px;padding:9px 12px;margin:6px 5px 0 0;border:1px solid #b69a64;border-radius:3px;cursor:pointer;background:#e9d7a5;color:#4b3d25}.db-install-panel a{display:inline-block;color:#72572c;margin:8px 10px 0 0;font-size:13px}.db-install-panel .install-note{color:#8c7657;font-size:11px}.db-install-panel .install-error{color:#9c4937}.db-install-panel .install-close{float:right;font-size:19px;margin:-9px -8px 0 8px;background:transparent;border:0}`;
  document.head.append(style);
  const trigger = document.createElement('button');
  trigger.id = 'db-install'; trigger.className = 'db-install'; trigger.type = 'button'; trigger.textContent = '▣ 홈 화면에 설치';
  document.querySelector('.db-secondary').prepend(trigger);
  const dialog = document.createElement('dialog');dialog.id='db-install-dialog';dialog.className='db-install-panel';document.body.append(dialog);
  const create = (tag, text, className) => {const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
  function chromeLink(){
    const link=create('a','Chrome에서 열기');link.id='db-open-chrome';
    if(/Android/i.test(navigator.userAgent)){
      const target = location.host + location.pathname + location.search;
      link.href='intent://' + target + '#Intent;scheme=' + location.protocol.slice(0,-1) + ';package=com.android.chrome;end';
    } else {link.href=location.href;link.target='_blank';link.rel='noopener';}
    return link;
  }
  const updateNotice=create('button','새 화면이 준비됐어요 · 업데이트');updateNotice.id='db-update-notice';updateNotice.className='db-install';updateNotice.hidden=true;updateNotice.style.cssText='position:fixed;right:12px;top:12px;z-index:30;box-shadow:0 3px 15px #223c3140';document.body.append(updateNotice);updateNotice.onclick=()=>{dialog.showModal();view();};
  function view(){
    updateNotice.hidden=!registration?.waiting;
    trigger.textContent=registration?.waiting?'↻ 새 버전 적용':standalone()?'▣ 앱 설치 정보':installedThisSession?'✓ 설치 완료':'▣ 홈 화면에 설치';
    if(!dialog.open)return;
    dialog.replaceChildren();
    const close=create('button','×','install-close');close.setAttribute('aria-label','닫기');close.onclick=()=>dialog.close();
    const heading=create('h2',standalone()?'주식회사 동백 앱':'홈 화면에서 바로 열기');dialog.append(close,heading);
    if(standalone()||installedThisSession){
      dialog.append(create('p',standalone()?'홈 화면에서 앱으로 실행 중입니다.':'브라우저가 앱 설치 완료를 확인했습니다. 홈 화면의 주식회사 동백 아이콘을 눌러 열 수 있습니다.'));
    } else if(fileLike){
      dialog.append(create('p','지금은 저장한 HTML 파일을 열고 있어 설치할 수 없습니다.'));
      dialog.append(create('p','설치용 폴더 전체를 휴대폰 내부 서버 또는 HTTPS 주소에서 연 다음, Chrome에서 이 버튼을 다시 눌러 주세요.'));
      dialog.append(create('p','HTML 한 파일만으로는 오프라인 설치 앱을 만들 수 없습니다. Acode의 미리보기 주소가 localhost라면 같은 주소를 Chrome에서 열어 설치할 수 있습니다.','install-note'));
    } else if(!secure){
      dialog.append(create('p','현재 주소에서는 홈 화면 앱 설치를 준비할 수 없습니다.'));
      dialog.append(create('p','HTTPS 주소 또는 같은 휴대폰의 localhost 주소로 열어 주세요. 다른 기기의 http://IP 주소는 설치용 연결로 사용할 수 없습니다.'));
    } else {
      dialog.append(create('p','처음 한 번 설치하면 홈 화면 아이콘으로 열 수 있습니다. 오프라인 준비가 끝난 뒤에는 서버가 꺼져도 저장된 사무실 화면이 실행됩니다.'));
      if(embedded)dialog.append(create('p','Acode 미리보기 안에서는 설치 창이 나오지 않을 수 있어요. 먼저 Chrome으로 열어 주세요.'));
      const steps=create('ol');
      for(const text of ['Chrome에서 이 페이지를 엽니다.','오프라인 준비 완료를 확인합니다.','아래 설치 버튼 또는 Chrome ⋮ 메뉴의 ‘앱 설치 / 홈 화면에 추가’를 누릅니다.'])steps.append(create('li',text));
      dialog.append(steps);
      if(embedded)dialog.append(chromeLink());
      if(promptEvent){const install=create('button','홈 화면에 설치');install.id='db-install-confirm';install.disabled=!ready;install.onclick=async()=>{
        const event=promptEvent;promptEvent=null;
        try{await event.prompt();const result=await event.userChoice;if(result.outcome==='dismissed')error='설치를 취소했습니다. Chrome 메뉴에서 다시 설치할 수 있습니다.';}catch{error='이 브라우저에서 설치 창을 열지 못했습니다. Chrome 메뉴에서 설치해 주세요.';}view();
      };dialog.append(install);}
      else if(!standalone()&&!installedThisSession)dialog.append(create('p','설치 버튼이 나타나지 않으면 Chrome 오른쪽 위 ⋮ 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. 브라우저에 따라 메뉴 이름이 다를 수 있습니다.','install-note'));
    }
    const status=create('p',fileLike?'설치용 주소 필요':!secure?'설치 가능한 연결 필요':ready?'✓ 오프라인 준비 완료':checking?'오프라인 실행 파일을 준비하고 있어요…':'오프라인 준비 안 됨','install-status');status.id='db-offline-status';status.setAttribute('role','status');dialog.append(status);
    if(error)dialog.append(create('p',error,'install-error'));
    if(registration?.waiting){const update=create('button','새 버전 적용');update.id='db-pwa-update';update.onclick=()=>{applyingUpdate=true;registration.waiting?.postMessage({type:'SKIP_WAITING'});};dialog.append(update);dialog.append(create('p','새 버전을 적용하면 현재 시뮬레이션이 초기화됩니다. 저장한 이름은 유지됩니다.','install-note'));}
    if(secure&&!ready&&!checking){const retry=create('button','설치 준비 다시 확인');retry.id='db-pwa-retry';retry.onclick=prepare;dialog.append(retry);}
  }
  async function verifyCache(){
    const root=new URL('./',location.href);
    const paths=['index.html','characters.js','pixel-mode.js','v3.js','radio.js','gym-music.js', 'ai-desk.js','pwa.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','assets/office-pixel.png','assets/office-background.png','assets/lobby-background.png','assets/gym-background.png','assets/characters-standing.png','assets/characters-working.png','assets/characters-gym.png','assets/characters-cleaner.png','assets/characters-coffee.png'];
    const prefix='dongbaek-pwa-'+encodeURIComponent(root.pathname)+'-';
    ready=false;
    for(const key of (await caches.keys()).filter(key=>key.startsWith(prefix))){
      const cache=await caches.open(key);
      if((await Promise.all(paths.map(path=>cache.match(new URL(path,root).href)))).every(Boolean)){ready=true;break;}
    }
  }
  async function prepare(){
    if(!secure||!('serviceWorker' in navigator)||checking)return;
    checking=true;error='';view();
    try{
      registration=await navigator.serviceWorker.register(new URL('sw.js',location.href),{scope:new URL('./',location.href).pathname,updateViaCache:'none'});
      const observe=worker=>{if(!worker)return;worker.addEventListener('statechange',async()=>{if(worker.state==='activated'||worker.state==='installed'){try{await verifyCache();}catch{}view();}});};
      observe(registration.installing);registration.addEventListener('updatefound',()=>observe(registration.installing));
      await new Promise((resolve,reject)=>{
        let timer;const finish=(err)=>{clearTimeout(timer);err?reject(err):resolve();};
        if(registration.active){finish();return;}
        timer=setTimeout(()=>finish(new Error('Offline preparation timed out')),15000);
        const worker=registration.installing||registration.waiting;
        if(!worker){finish(new Error('No active worker'));return;}
        worker.addEventListener('statechange',()=>{if(worker.state==='activated')finish();else if(worker.state==='redundant')finish(new Error('Offline preparation failed'));});
      });await verifyCache();
    }catch{error='오프라인 준비에 실패했습니다. 연결과 설치용 파일을 확인한 뒤 다시 시도해 주세요.';ready=false;}
    finally{checking=false;view();}
  }
  const artworkButton=create('button','▦ 사무실 이미지');artworkButton.className='db-install';artworkButton.id='db-artwork';artworkButton.style.background='#eee1bc';document.querySelector('.db-secondary').prepend(artworkButton);
  const artDialog=create('dialog');artDialog.className='db-install-panel';artDialog.style.maxWidth='1100px';artDialog.id='db-artwork-dialog';document.body.append(artDialog);
  artworkButton.onclick=()=>{artDialog.replaceChildren();const close=create('button','×','install-close');close.setAttribute('aria-label','닫기');close.onclick=()=>artDialog.close();const title=create('h2','주식회사 동백 · 픽셀 오피스');const image=create('img');image.alt='정원과 꽃·식물을 줄인 주식회사 동백 사무실 인테리어';image.src=window.DongbaekBackground||new URL('assets/office-background.png',location.href).href;image.style.cssText='display:block;width:100%;height:auto;image-rendering:pixelated';image.onerror=()=>{image.replaceWith(create('p','그림 파일을 열 수 없습니다. 설치용 폴더의 assets 파일을 확인해 주세요.'));};artDialog.append(close,title,image,create('p','사무실 인테리어 전체 보기입니다. 직원과 동백이는 움직이는 사무실 화면에서 확인하세요.','install-note'));artDialog.showModal();};
  trigger.onclick=()=>{dialog.showModal();view();};
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;view();});
  window.addEventListener('appinstalled',()=>{installedThisSession=true;promptEvent=null;view();});
  if(secure&&'serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applyingUpdate)location.reload();});
  window.addEventListener('online',()=>{if(!ready)prepare();});
  if(secure&&'serviceWorker' in navigator)prepare();
  else if(secure)error='이 브라우저는 오프라인 앱 설치를 지원하지 않습니다. 최신 Chrome에서 열어 주세요.';
  view();
})();
