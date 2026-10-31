# 동백사무실 Hermes 승인 상태 중계 서버 설정

> **상태: 개발 검토용 / 미배포.** 기존 `dongbaek-api`(GPT Worker), 정식 사무실 `main`, 휴대폰 Hermes 플러그인을 변경하지 않습니다. 대표 승인과 계정 화면 확인 없이 서버를 게시하거나 유료 요금제로 변경하지 않습니다.

## 시작 전에 확인

Cloudflare 무료 Workers는 하루 10만 건의 요청을 포함하며, D1 무료 요금제도 별도 사용 한도를 제공합니다. 무료 범위를 넘으면 기능이 중단될 수 있습니다. 현재 계정 요금제를 먼저 확인하고 결제 단계가 나타나면 중단하십시오.

현재 중계 코드는 **휴대폰에서 서버로 한 방향으로** 직원별 승인 상태 *숫자만* 전송합니다. 서버에서 휴대폰에 명령하거나 게시·승인할 수 없습니다. 사용자 이름, 작업 제목, 원본 파일, 텔레그램 ID, 비밀번호는 전송하지 않습니다.

## Cloudflare 화면에서 준비 — 대표 승인 후 진행

1. Cloudflare에서 **Workers & Pages**를 열어 별도 Worker `dongbaek-hermes-status`를 만듭니다. 기존 `dongbaek-api`는 절대 덮어쓰지 않습니다.
2. **D1 SQL database**에서 별도 DB `dongbaek-hermes-status`를 만듭니다. 기존 `dongbaek-gpt` DB는 사용하지 않습니다.
3. 새 Worker의 **Bindings → Add binding → D1 database**에서 변수 이름을 반드시 `DB`로 지정하고 `dongbaek-hermes-status`를 선택합니다.
4. 새 Worker에서 **Edit code**를 열고 `hermes-bridge/relay-worker.mjs`의 코드를 붙여넣습니다. **Preview/Save**로 구조 확인 후, 실제 Deploy는 대표 승인 후 수행합니다.
5. **Settings → Variables and Secrets**에서 아래 두 개를 각각 **Secret**으로 추가합니다. 둘은 서로 다른 무작위 값(각각 32자 이상)이어야 합니다.
    - `HERMES_PUSH_TOKEN`: 휴대폰 전송 전용
    - `HERMES_READ_TOKEN`: 노트북 상태 조회 전용
6. 토큰을 **GitHub, 채팅, 캡처, 다운로드 폴더에 쓰지 마세요.** 암호관리자에 저장하세요. 기존 GPT의 `OFFICE_ACCESS_TOKEN`과 `OPENAI_API_KEY`도 재사용하지 마세요.
7. 설정 완료 후 별도 Worker의 `https://<Worker-subdomain>/health`를 열어 `{"service":"hermes-status-relay","ready":true}`가 나오는지 확인합니다. 이것은 **서버 준비 검사**일 뿐 실제 휴대폰 연결 성공이 아닙니다.

Cloudflare 공식 참고:
- https://developers.cloudflare.com/workers/get-started/dashboard/
- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/

## 1회 실기기 전송 확인

설정이 끝난 뒤, 휴대폰 1호 Termux에는 `export_status.py`와 별도 토큰을 준비합니다. 아래 명령의 **주소 부분만 실제 새 Worker 주소**로 바꿉니다.

```sh
read -rsp "Hermes 전송 토큰: " DONGBAEG_HERMES_PUSH_TOKEN
echo
export DONGBAEG_HERMES_PUSH_TOKEN
python -B "$HOME/dongbaeg_export_status.py" --push-url "https://YOUR-NEW-WORKER.workers.dev/api/hermes/push"
unset DONGBAEG_HERMES_PUSH_TOKEN
```

`HTTP 200` 출력이 나와야 전송 성공입니다. 과거 JSON은 5분 시각 제한으로 거부되므로 **전송 시 매번 현재 DB에서 상태를 다시 추출해야 합니다.**

노트북 검토용 사무실 화면의 오른쪽 아래 **Hermes 실제 업무 상태** 버튼 → `https://YOUR-NEW-WORKER.workers.dev/api/hermes/status` → **조회 전용 토큰** 입력 → **자동 상태 조회** 순서로 확인합니다.

이 개발 화면은 **PR #24의 브랜치**에서만 준비되어 있습니다. 정식 GitHub Pages에는 아직 표시되지 않을 수 있습니다. 검사 결과만 보고 실제 동기화가 성공했다고 주장하지 않습니다.

## 제한된 자동 갱신 시험

서버 실기기 연결 확인 후에만 `auto_push.py`를 사용할 수 있습니다. 기본 60초 간격 / 총 3회 후 종료. 장시간 자동 실행은 아직 구현하지 않았고 Android 절전 정책 검증도 필요합니다. 3분 넘게 새 전송이 없으면 조회 화면에 오래된 데이터라고 표시합니다.

## 문제 진단

- `/health` ready:false: 별도 D1 바인딩 `DB` 또는 두 Secret 중 하나가 없거나, 값 길이 부족·같은 값입니다.
- HTTP 401: 잘못된 토큰. 채팅으로 보내지 말고 Secret 설정에서 값이 맞는지 확인합니다.
- HTTP 400: 데이터 형식 또는 5분 시각 제한. Termux에서 현재 스냅샷을 새로 생성합니다.
- HTTP 503: D1 바인딩·DB 또는 서버 처리 문제. 기존 GPT Worker는 건드리지 않습니다.
- 조회 화면 '오래된 데이터': 휴대폰이 전송 중단되었거나 잠든 상태입니다. 이전 기록을 실시간이라고 표시하지 않습니다.
- 계정이 유료 변경을 요구하면 **중단하고 대표 승인**이 필요합니다.
