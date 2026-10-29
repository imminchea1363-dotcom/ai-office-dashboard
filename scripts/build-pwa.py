"""Create a reproducible, offline-installable static PWA folder and ZIP; never publish."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'dongbaek-pwa'
files = ['index.html', 'characters.js', 'pixel-mode.js', 'v3.js', 'radio.js','gym-music.js', 'docx-export.js', 'ai-desk.js', 'poster-studio.js', 'office-manual.js', 'gpt-desk.js', 'pwa.js', 'manifest.webmanifest',
         'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
         'assets/office-pixel.png','assets/office-background.png','assets/lobby-background.png','assets/gym-background.png','assets/characters-standing.png','assets/characters-working.png','assets/characters-gym.png','assets/characters-cleaner.png','assets/characters-coffee.png']
output.mkdir(parents=True, exist_ok=True)
digest = hashlib.sha256()
for name in files:
    data = (root / name).read_bytes()
    digest.update(name.encode('utf-8') + b'\0' + data)
    target = output / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
worker = (root / 'sw.js').read_text(encoding='utf-8')
digest.update(worker.encode('utf-8'))
build_id = digest.hexdigest()[:16]
(output / 'sw.js').write_text(worker.replace("PREFIX + 'source-v2'", "PREFIX + '" + build_id + "'"), encoding='utf-8')
# An immutable release path cannot be served from a previous root worker's asset cache.
release = output / 'releases' / build_id
release.mkdir(parents=True, exist_ok=True)
for name in files + ['sw.js']:
    target = release / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(output / name, target)
latest = '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>동백 최신 사무실 열기</title><meta http-equiv="refresh" content="0;url=./releases/' + build_id + '/"><p><a href="./releases/' + build_id + '/">최신 사무실 열기</a></p></html>'
(output / 'latest.html').write_text(latest, encoding='utf-8')
install = '''주식회사 동백 · 픽셀 오피스 설치용 파일

이 ZIP은 APK가 아닙니다. 파일을 풀어 설치용 폴더 전체를 사용하세요.
HTML 파일 하나를 직접 열어서는 홈 화면 앱을 설치할 수 없습니다.

[휴대폰 내부 주소로 설치]
1. 같은 휴대폰의 로컬 웹서버에서 폴더 전체를 제공합니다.
2. Chrome에서 해당 localhost 또는 127.0.0.1 주소를 엽니다.
3. ‘홈 화면에 설치’ → ‘오프라인 준비 완료’를 확인합니다.
4. 앱의 설치 버튼 또는 Chrome ⋮ 메뉴의 앱 설치를 선택합니다.
5. 홈 화면의 주식회사 동백 아이콘으로 실행합니다.

[HTTPS 주소로 설치]
외부 게시가 허용된 경우에만 이 폴더를 정적 HTTPS 호스팅에 올립니다.
Chrome에서 주소를 열고 위 3~5번을 진행합니다.

설치와 오프라인 저장을 완료한 뒤에는 서버가 중단되어도 캐시된 화면을 열 수 있습니다.
브라우저 데이터 삭제, 앱 제거, 저장공간 자동 정리 시 캐시와 저장한 이름이 지워질 수 있습니다.
이름은 브라우저에 저장됩니다. 시뮬레이션 상태는 실행마다 새로 시작합니다.

공개 사이트는 GitHub Pages로 제공됩니다. 이 ZIP은 별도의 로컬 설치용 파일입니다.
'''
(output / '설치방법.txt').write_text(install, encoding='utf-8')
archive = root / 'dist' / '주식회사동백-설치용.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for name in files + ['sw.js', '설치방법.txt']:
        bundle.write(output / name, name)
print(json.dumps({'folder': str(output), 'zip': str(archive), 'build': build_id}, ensure_ascii=False))
