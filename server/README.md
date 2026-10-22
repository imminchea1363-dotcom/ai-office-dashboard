# 동백대리 GPT 시험 서버

기존 GitHub Pages 사무실을 유지하고, API 키는 Cloudflare Worker에서만 사용합니다.
이 서버는 일반 ChatGPT 계정, Plus 대화 기록, 파일, 다른 AI 계정에 접근하지 않습니다.
기본 모델은 `gpt-4.1-mini`, API는 `/v1/responses`입니다. OpenAI 프로젝트에서 이 모델 사용이 허용되어 있어야 합니다.

## 현재 단계와 준비물

코드와 모의 API 검사를 준비한 단계입니다. Cloudflare의 Hello World 배포와 API 키 저장만으로는 GPT가 연결되지 않습니다.
실제 모델 호출 검증은 아래 설정 후 대표님이 실행 버튼을 눌렀을 때 이루어집니다.

Cloudflare Worker 이름: `dongbaek-api`
예정 주소: `https://dongbaek-api.imminchea1363.workers.dev`
기존 사무실: `https://imminchea1363-dotcom.github.io/ai-office-dashboard/latest.html`

## 대시보드로 설치

1. Worker의 Settings → Runtime variables and secrets에 `OPENAI_API_KEY`를 **Secret**으로 저장합니다. OpenAI 키 권한은 Restricted → Model capabilities → Responses → Write만 필요합니다.
2. 같은 곳에 `OFFICE_ACCESS_TOKEN`을 **Secret**으로 추가합니다. 비밀번호 관리자로 만든 24자 이상의 무작위 암호를 권장합니다. OpenAI 키나 기존 계정 비밀번호를 재사용하지 마세요. 이 암호는 사무실에서 GPT 연결을 열 때 입력합니다. 채팅, 소스, 공개 URL에 남기지 않습니다. 서버는 최소 20자~최대 256자를 허용합니다.
3. Cloudflare의 Storage & databases → D1에서 `dongbaek-gpt` 데이터베이스를 생성합니다.
4. Worker → Settings → Bindings → Add binding에서 D1 database를 선택하고 변수 이름은 **`DB`**, 데이터베이스는 **`dongbaek-gpt`**로 연결합니다. 바인딩 변경사항을 배포합니다.
5. Worker의 Edit code에서 기본 Hello World 코드를 `worker.mjs` 전체 내용으로 교체하고 Deploy합니다. 별도 라이브러리 설치는 필요 없습니다. 테이블은 첫 인증 접속 때 자동 생성됩니다.
6. Worker 주소 뒤 `/health`에 접속하여 `ready: true`를 확인합니다. 이것은 설정 준비 확인이며 OpenAI 키의 유효성 검사나 유료 생성 호출은 아닙니다.
7. 새 사무실 버전에서 총괄 직원과 ChatGPT를 선택하고 GPT 연결 설정에 **사무실 접속 암호**를 입력합니다. OpenAI 키를 입력하는 곳이 아닙니다.
8. 연결 확인 후 짧은 업무 하나를 입력하고 `GPT로 실행 · 사용료 발생`을 누릅니다. 실제 결과가 보고함에 나타나면 연동 성공입니다.

모바일 코드 편집이 어려우면 같은 Cloudflare 계정으로 노트북에 로그인해 5번을 진행할 수 있습니다.

## 비용과 기록

- 사무실 접속 암호가 맞아야 호출할 수 있습니다. CORS는 기존 GitHub Pages 출처 하나만 허용합니다. CORS만으로 인증을 대신하지 않습니다.
- 한국시간 기준 하루 20회, 이 DB에 기록된 전체 시험 실행 200회까지만 API를 호출합니다. 한 번에 한 업무만 접수합니다.
- 입력 지시는 최대 6,000자, 출력은 최대 1,200토큰입니다. 장문은 짧게 나누어 주세요.
- SQLite의 한 원자적 INSERT 문으로 슬롯을 예약합니다. 오류가 난 요청도 횟수에 포함하며, DB가 없거나 사용할 수 없으면 OpenAI를 호출하지 않습니다.
- 한도는 이 앱을 통한 호출만 제어합니다. API 계정 전체의 금액 상한을 보장하지 않습니다. 다른 키나 프로그램의 사용량은 별도입니다. 자동 충전 설정은 OpenAI에서 관리합니다.
- 같은 업무 식별자를 다시 보내면 저장한 결과를 돌려줍니다. 통신 오류 후 `GPT 결과 확인`은 저장된 결과만 조회하며 생성 요청을 다시 보내지 않습니다.
- 결과가 불확실한 업무를 종료하더라도 이미 발생한 요금은 취소되지 않습니다.
- API 키는 서버 Secret, 접속 암호는 서버 Secret과 현재 열린 페이지의 메모리에만 보관합니다. 접속 암호는 브라우저 저장소·백업 파일에 넣지 않습니다.
- 업무 지시는 OpenAI로 전송됩니다. `store: false`를 사용하지만 OpenAI의 별도 보관 정책을 무효화하는 뜻은 아닙니다.
- 결과, 토큰 사용량, 요청 식별자, 날짜와 지시문의 SHA-256 해시는 D1에 저장합니다. 원본 지시문은 D1에 저장하지 않습니다. 원본 지시문과 결과는 기존 사무실과 같이 사용한 브라우저에도 저장됩니다.
- D1과 브라우저 기록은 자동 삭제하지 않습니다. 보관·삭제는 대표님이 관리합니다. API 키 만료 전에 새 키를 Secret으로 교체해야 합니다.
- 초기 버전은 생성·기록·검토·보고만 수행하며 게시, 메일 발송, 결제, 무인 반복 실행은 포함하지 않습니다.

## 개발자 검증

`npm run test:gpt-server`: 외부 API를 모의 응답으로 바꾼 실제 SQLite 검사입니다. 인증 실패 시 무호출, 허용 출처, 입력·출력 제한, 일·전체 한도, 동시 요청, 중복 호출, 오류 처리와 결과 조회를 검사합니다.

`npm run test:gpt-browser`: 모의 연결 서버로 UI의 암호 입력, 실행, 텍스트 표시, 저장, 새로고침, 통신 오류 복구, 한도 오류와 모바일 폭을 검사합니다. 실제 API 키나 크레딧을 사용하지 않습니다.

CLI를 이용할 경우 `wrangler.jsonc`의 D1 ID를 실제 데이터베이스 ID로 바꾸고 배포합니다. Secret 값은 설정 파일에 넣지 않습니다.
