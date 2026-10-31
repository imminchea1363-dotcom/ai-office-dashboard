# 동백사무실 ↔ Hermes 업무 전달 (시험 구현)

이 코드는 아직 운영 중인 Cloudflare 서버나 휴대폰에 배포하지 않았습니다. GitHub PR 검토용입니다. 실제 연결하려면 기존 Cloudflare 배포·D1 테이블 설정을 확인하고 대표 승인 후 적용해야 합니다.

## 이 구현이 하는 일

- 동백사무실 웹 화면에서 10명 중 담당자를 골라 **초안 작성 업무만** 서버 D1 대기함에 넣습니다.
- 서버는 최대 25개 진행/대기 업무, 최대 200개 누적 기록을 허용합니다. 같은 ID/같은 내용은 한 번만 접수됩니다.
- 휴대폰에서 별도 비밀키로 작업 한 건을 **수신**합니다. 한 번 가져간 업무는 자동 재수신하지 않습니다. 수신 후 중단되면 상태는 'claimed'로 남아 관리자가 직접 확인해야 합니다.
- 수신 결과는 텍스트와 상태(completed/failed)로만 반환합니다. 수신/반환에 외부 게시, 계정 로그인, 결제 기능은 없습니다.
- 화면의 'completed'는 **결과 수신**이지 대표 검수·SNS 게시 완료를 뜻하지 않습니다.

## 적용할 때 꼭 필요한 설정 (아직 미적용)

Cloudflare Worker 환경에 기존 `OFFICE_ACCESS_TOKEN`(20~256자), 별도의 `HERMES_AGENT_TOKEN`(32~256자), D1 바인딩 `DB`를 설정합니다. 각 토큰은 다른 값이어야 합니다. OpenAI API 키는 Hermes 대기함 기능에 필요하지 않으며, 기존 GPT 기능은 별도 설정입니다.

- `OFFICE_ACCESS_TOKEN`: 사무실 브라우저 인증에만 사용합니다. 입력한 값은 페이지 메모리에만 보관하며 새로고침 시 다시 입력합니다.
- `HERMES_AGENT_TOKEN`: Termux의 수신 프로그램 전용입니다. 브라우저나 GitHub 공개 저장소에 넣지 않습니다.
- HTTPS 호스트: `https://dongbaek-api.imminchea1363.workers.dev`. 커스텀 호스트나 HTTP로 토큰을 전달하지 않습니다.
- 기존 Telegram 봇, Hermes Agent 설정, 사용 중인 모델 파일은 이 코드에서 수정하지 않습니다.

## API 계약

| 호출 주체 | 경로 | 동작 |
|---|---|---|
| 웹 사무실 | `POST /api/hermes/tasks` | `{id,staffId,title,brief,output}` 접수. Bearer 사무실 토큰, 지정된 Origin 필수 |
| 웹 사무실 | `GET /api/hermes/tasks?id=...` | 저장된 상태·결과 확인 |
| Hermes 전용 클라이언트 | `GET /api/hermes/agent/next` | 대기 업무 한 건만 원자적으로 점유하고 claimToken 반환 |
| Hermes 전용 클라이언트 | `POST /api/hermes/agent/result` | `{id,claimToken,status,result}` 기록. 중복 제출 차단 |

서버의 에이전트 전용 경로는 `Origin`이 설정된 브라우저 요청을 거절합니다. **무작위 32자 이상의 별도 비밀키**를 사용해야 합니다.

## Termux에서 시험하는 방법

이 부분은 실제 Cloudflare 배포 및 대표 승인이 끝난 뒤에만 실행합니다. 먼저 Hermes가 기존 Telegram과 정상 동작하는지 확인하고, 그 설정은 그대로 둡니다.

1. Python 3가 설치된 Termux 세션에 `HERMES_AGENT_TOKEN` 환경변수를 설정합니다. 토큰을 채팅이나 GitHub에 올리지 않습니다.
2. `python3 server/hermes_mailbox_client.py claim` — 한 건만 수신하고 암호화하지 않은 로컬 작업파일을 권한 0600으로 저장합니다. Hermes 자체는 실행하지 않습니다.
3. `python3 server/hermes_mailbox_client.py show` — 업무 지시와 제한 조건을 읽고 기존 Hermes에서 별도로 초안을 작성합니다. 파일 변경이나 외부 발송·게시 권한은 허용하지 않습니다.
4. 검토한 답변 텍스트를 UTF-8 파일에 담고 `python3 server/hermes_mailbox_client.py submit --file result.txt`로 서버에 반환합니다.
5. 웹 사무실에서 상태 확인을 누르면 결과가 보이지만, 검수 전 자동 게시되지 않습니다.

이 수동 수신 클라이언트는 **상시 폴링/자동 Hermes 실행이 아닙니다.** 자동 Hermes 실행을 하려면 현재 Termux Hermes 버전과 모델 권한 및 도구 실행 범위를 확인한 뒤, 별도 승인 게이트가 있는 실행기를 추가해야 합니다. 공식 문서에 없는 CLI 옵션을 임의로 설치하거나 사용하지 않습니다.

## 실패·복구 원칙

- 신규 업무 접수 중 연결이 끊기면 임의로 새 업무를 보내지 않고, 같은 ID로 상태를 조회합니다.
- Agent가 업무를 수신한 뒤 앱이 중지되면 서버의 상태는 `claimed`로 유지됩니다. **자동 재실행하지 않습니다.**
- 결과 반환 도중 통신이 끊기면 클라이언트의 `~/.hermes/dongbaek-mailbox-claim.json` 기록을 보존합니다. 중복 실행하지 않고 서버 상태를 확인해 처리합니다.
- 보고함 결과는 브라우저 저장소에 별도 보존됩니다. 기기 간 자동 동기화하지 않습니다.
- 삭제, SNS 게시, 업로드, 메시지 발송, 예약, 결제 또는 새로운 구독은 이 연결에서 수행하지 않습니다.

## 검증

`node --test tests/gpt-worker.test.mjs tests/hermes-queue.test.mjs`

`python3 -m unittest discover -s tests -p 'hermes_mailbox_client_test.py'`

GitHub PR 브라우저 테스트: `tests/hermes-bridge-ui.cjs`. Cloudflare 실제 Workerd 테스트: `tests/gpt-workerd.cjs`.
