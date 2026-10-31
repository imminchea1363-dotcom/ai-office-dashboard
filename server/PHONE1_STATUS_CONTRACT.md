# 1호 휴대폰 Hermes 실제 업무 상태 → 노트북 동백사무실

상태: 개발 브랜치 시험 기능. **실제 Cloudflare 배포와 Termux 설치는 하지 않았습니다.** 1호 휴대폰의 기존 Hermes/Telegram 설정을 수정하지 않습니다.

## 통신 계약

- 보고 주소: `POST https://dongbaek-api.imminchea1363.workers.dev/api/phone1/agent/heartbeat`
- 노트북 조회 주소: `GET https://dongbaek-api.imminchea1363.workers.dev/api/phone1/presence`
- 인증: 보고자는 별도 `HERMES_AGENT_TOKEN`(32자 이상), 사무실은 기존 `OFFICE_ACCESS_TOKEN`. 모두 HTTPS Bearer 암호이며 채팅·GitHub·화면에 남기지 않습니다.
- 보고 예: `{"state":"working","source":"hermes_runtime","taskTitle":"실제 수행 중인 업무 제목"}`.
- 대기: `{"state":"idle","source":"hermes_runtime"}`. 일시정지 `paused`, 실행 오류 `error`.
- 상태 출처가 사람의 수동 확인일 때는 `source:"manual"`. **실제 Hermes 이벤트 없이 `source:"hermes_runtime"`이라고 전송하지 않습니다.**
- 서버는 마지막 보고 시간을 기록합니다. 새 보고가 **120초** 이상 없으면 노트북은 `연결 상태 확인 필요`를 표시하고 기존 `working`을 무효화합니다. 노트북은 연결 인증 후 **30초마다** 조회합니다.
- **실제 업무 결과/완료/승인**은 이 API가 판단하지 않습니다. 이 경로는 실시간 상태 통지만 담당하며 별도 업무 지시·결과 저장 API는 구분됩니다.
- 개인정보, 텔레그램 메시지 전문, API 키, 파일 내용은 상태 신호에 넣지 않습니다. 업무 제목은 선택사항이며 최대 120자입니다.

## 1호 Hermes 채팅에서 개발할 연결부

1호의 현재 Hermes 버전과 실제 실행 이벤트를 확인해야 합니다. 지원하지 않는 CLI 명령어나 존재하지 않는 이벤트 훅은 추측하지 않습니다.

- Hermes가 **실제로 실행한 작업의 시작**을 관측할 때 `working` 보고
- 실제 실행 종료 후 작업이 없음을 확인했을 때 `idle` 보고
- 실행기가 실제 오류를 보고했을 때 `error` 보고
- 사용자가 실제로 중단하거나 일시정지했을 때 `paused` 보고
- 실행 중에도 **실제 프로세스/작업 상태를 확인할 수 있는 경우에만** 30~45초 간격으로 현재 상태 재보고
- 프로세스가 종료됐으면 성공했다는 가상 상태 신호를 보내지 않습니다. 노트북 서버의 신호 만료에 맡깁니다.

검증용 수동 송신 프로그램은 [phone1_presence_sender.py](phone1_presence_sender.py)입니다. 이는 한 번 상태를 보내는 프로그램으로, Hermes를 자동 감지하거나 실행하지 않습니다. 자동 감지 연결은 1호 휴대폰 개발 담당과 연동 검증이 필요합니다.

## 노트북 표시

사무실 첫 화면의 `1호 휴대폰 · Hermes 실제 상태` 항목에서 접속 암호로 연결합니다. 정상 신호가 없으면 상태를 미확인으로 표시하며, 브라우저 저장소에는 암호를 보관하지 않습니다.

검증: `node --test tests/phone1-presence.test.mjs`, `node tests/phone1-presence-ui.cjs`, `node tests/gpt-workerd.cjs`. 테스트의 휴대폰 신호와 외부 모델 응답은 **모의 값**이며 실제 1호 연결 검증을 뜻하지 않습니다.

정식 배포·시크릿 등록·휴대폰에 자동 실행기 추가는 별도 승인 후 진행합니다.
