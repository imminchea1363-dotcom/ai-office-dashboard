"""Build a standalone copy helper with public server source only, never secrets."""
from pathlib import Path
import hashlib
import html

root = Path(__file__).resolve().parents[1]
source = (root / 'server/worker.mjs').read_text(encoding='utf-8')
digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
page = '''<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="worker-sha256" content="DIGEST">
<title>동백 GPT 서버 코드 복사</title>
<style>body{font-family:system-ui,sans-serif;background:#f7f6ef;color:#253d30;line-height:1.7;margin:0;padding:24px}main{max-width:740px;margin:auto}h1{font-size:25px}button,a{font:inherit}button{padding:16px 24px;background:#285740;color:white;border:0;border-radius:9px;cursor:pointer}li{margin:12px 0}textarea{box-sizing:border-box;width:100%;min-height:260px;font:12px monospace;margin-top:12px}#status{padding:14px 0;font-weight:600}small{overflow-wrap:anywhere}a{color:#285740}</style>
<main><h1>동백 GPT 서버 코드 복사</h1><p>아래 버튼은 공개된 서버 코드만 복사합니다. API 키나 접속 암호를 입력할 필요가 없습니다.</p>
<button id="copy" type="button">서버 코드 전체 복사</button><p id="status" role="status" aria-live="polite">버튼을 누른 뒤 Cloudflare 코드 편집 탭으로 돌아가세요.</p>
<ol><li>Cloudflare 편집기의 <b>worker.js</b> 코드 영역을 누르세요.</li><li><b>전체 선택 → 붙여넣기</b>로 기본 Hello World 코드를 교체하세요. 노트북에서는 코드 영역 클릭 후 Ctrl+A, Ctrl+V를 사용하세요.</li><li>오른쪽 위 <b>Deploy</b>를 누르고 완료될 때까지 기다리세요.</li><li><a href="https://dongbaek-api.imminchea1363.workers.dev/health" target="_blank" rel="noopener">서버 설정 확인 열기</a>에서 <b>ready: true</b>를 확인하세요. 이 확인은 GPT 생성 요금을 발생시키지 않습니다.</li></ol>
<p>ready가 false이면 OPENAI_API_KEY·OFFICE_ACCESS_TOKEN Secret과 DB 바인딩을 확인하세요. 이 단계는 서버 준비 확인이며 실제 GPT 작업 성공 확인은 아닙니다.</p>
<details id="details"><summary>복사가 안 될 때 코드 직접 선택</summary><textarea id="source" readonly aria-label="서버 코드">SOURCE</textarea></details>
<p><small>코드 SHA-256: DIGEST</small></p></main>
<script>
'use strict';
const field=document.getElementById('source'),status=document.getElementById('status');
document.getElementById('copy').onclick=async()=>{
 try{
  if(!navigator.clipboard?.writeText)throw Error('manual');
  await navigator.clipboard.writeText(field.value);
  status.textContent='서버 코드 전체를 복사했습니다. Cloudflare 편집기로 돌아가 전체 선택 후 붙여넣으세요.';
 }catch{
  document.getElementById('details').open=true;field.focus();field.select();field.setSelectionRange(0,field.value.length);
  let copied=false;try{copied=document.execCommand('copy');}catch{}
  status.textContent=copied?'서버 코드 전체를 복사했습니다. Cloudflare 편집기로 돌아가세요.':'코드를 전체 선택했습니다. 선택 메뉴의 복사를 누른 뒤 Cloudflare로 돌아가세요.';
 }
};
</script></html>'''
page = page.replace('SOURCE', html.escape(source, quote=False)).replace('DIGEST', digest)
target = root / ('dist/gpt-setup-' + digest[:8] + '.html')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(page, encoding='utf-8')
print(target)
