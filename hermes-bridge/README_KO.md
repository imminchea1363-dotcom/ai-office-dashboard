# 동백사무실 ↔ Hermes 상태 연결 (개발 브랜치 전용)

노트북의 기존 동백사무실과 휴대폰 1호 Hermes 승인 시스템은 수정하지 않습니다. 외부 게시, 자동 승인, 파일 업로드, 결제와 무관합니다.

## 현재 제공 기능
- `export_status.py`: 휴대폰의 기존 `~/.hermes/dongbaek-approval/workflow/workqueue.db`를 읽기 전용으로 조회. 직원별 승인 대기/재검토/과거 승인 기록 수만 집계합니다.
- `dashboard.js`: 노트북 사무실의 오른쪽 아래 **Hermes 실제 업무 상태** 버튼으로 표시. 데모 직원의 이동이나 업무 버튼은 건드리지 않습니다.
- `relay-worker.mjs`: 별도 Cloudflare Worker를 **향후 배포할 경우에만** HTTPS로 상태를 단방향 전달하는 인증 릴레이. 현재 미배포입니다.
- smartstore 및 선주직판점 관련 기록은 집계에서 제외됩니다.
- 승인 버튼 클릭, SNS 발행, Hermes DB 쓰기, 고객 파일 읽기 등의 기능은 없습니다.

## 1단계: 수동 데이터 전달 시험
Termux에 `hermes-bridge/export_status.py`를 준비한 경우 다음 명령으로 상태 JSON 생성:

```sh
python -B ~/hermes-bridge/export_status.py --output /sdcard/Download/dongbaeg_hermes_status.json
```

노트북의 **개발본 화면**에서 **Hermes 실제 업무 상태 → 휴대폰에서 내보낸 상태 JSON 선택**을 누르십시오. JSON을 공유/전달하는 작업은 직접 수행해야 합니다. 이 상태는 실시간 연동이 아니라 *수동 스냅샷*입니다.

## 2단계: 인증된 자동 동기화 (아직 활성화하지 않음)
Cloudflare에 별도 Worker, D1 DB 바인딩 `DB`, 서로 다른 32자 이상의 Secrets `HERMES_PUSH_TOKEN` 및 `HERMES_READ_TOKEN`을 구성해야 합니다. 기존 GPT Worker나 `OFFICE_ACCESS_TOKEN`을 재사용하지 마세요. 사용자 승인 후에만 서버를 배포/연결합니다.

Termux 환경변수 `DONGBAEG_HERMES_PUSH_TOKEN`은 **휴대폰에서만** 보관. 출력이나 GitHub에 토큰 기록 금지.
한 번 상태 전송은:

```sh
python -B ~/hermes-bridge/export_status.py --push-url https://YOUR-WORKER.workers.dev/api/hermes/push
```

노트북 패널에 `https://YOUR-WORKER.workers.dev/api/hermes/status` 와 읽기 전용 토큰을 입력하면 15초마다 상태를 조회합니다. 휴대폰 전송이 3분 중단되면 오래된 데이터로 표시합니다. **휴대폰에서 지속 전송하는 타이머/상주 프로그램은 아직 설정하지 않았습니다.** 실제 자동 갱신 검증 전에는 실시간 연결 성공이라 보고하지 않습니다.

## 필수 제약
- 고객의 이름·원본·비밀번호·텔레그램 ID·승인 토큰·업무 제목·파일 경로는 서버로 보내지 않습니다.
- 기존 승인 기록은 '현재 직원 작업 중' 상태와 같지 않습니다. 본 패널은 실제 승인 큐만 표현합니다.
- PR #22 동백사무실 개발본을 기반으로 하는 별도 브랜치이며, main 배포나 PR #22 자체에 대한 변경이 아닙니다.
- 변경 확인·실기기 검증 전에 병합하거나 정식판으로 자동 게시하지 않습니다.

## 화면 배포 누락 방지 (2026-10-31 점검)
노트북 개발 화면의 `index.html`뿐 아니라 `scripts/build-pwa.py`, `scripts/export-standalone.py`, `sw.js`에도 `hermes-bridge/dashboard.js`를 포함했습니다. 새 PWA 빌드는 내용 해시로 새 캐시를 사용합니다. **이 변경은 개발 브랜치에서만 반영했으며 정식 GitHub Pages에는 아직 게시되지 않았습니다.**

```sh
npm run check
npm run test:hermes-bridge
npm run build:pwa
npm run export
```

첫 2개 검사는 개발 환경의 Python/Node에서 실행합니다. 마지막 두 명령은 설치용·단일 HTML 사본을 **로컬에 생성**하며, 자동 배포하지 않습니다.

## 제한 횟수 자동 전송 시험 (미활성화)
실제 중계 서버를 만든 뒤 사용자 승인과 별도의 Cloudflare 설정이 필요합니다. 휴대폰에서 사용자 직접 시작할 경우에만 다음 명령을 실행합니다. 총 3회, 60초 간격의 **전경 프로세스**로 자동 종료하며 휴대폰이 잠들면 중단될 수 있습니다. 최초 설정 없이 자동 시작되거나 상주하는 서비스가 아닙니다.

```sh
# 토큰은 채팅이나 명령 이력에 직접 입력하지 마세요.
read -rsp "Hermes 전송 토큰: " DONGBAEG_HERMES_PUSH_TOKEN
echo
export DONGBAEG_HERMES_PUSH_TOKEN
python -B ~/hermes-bridge/auto_push.py --push-url "https://YOUR-WORKER.workers.dev/api/hermes/push" --interval 60 --max-runs 3
unset DONGBAEG_HERMES_PUSH_TOKEN
```

현재 실제 사용자가 제공한 `dongbaeg_hermes_status.json`은 10명 중 승인 기록 합계 5건, 과거 무효화 기록 5건, 승인 대기 0건입니다. 이 **숫자 자체를 코드·GitHub 공개 저장소에 기록하거나 업로드하지 않았습니다.** 사진·연락처·파일 제목 및 비밀번호 등은 전송 대상이 아닙니다. 무효 이력은 현재 작업 중이라는 뜻이 아닙니다.

자동화의 제약: GitHub Pages는 수신 서버가 아닙니다. 외부에서 휴대폰 데이터를 동기화하려면 별도 HTTPS 중계 서버 설정이 필요합니다. 서버 설정 및 요금제 확인 없이 임의로 Cloudflare 작업을 진행하지 않습니다.
