# 1호 Hermes → 동백사무실 업무 지시 · 결과 회신 계약

현재 이 코드는 **GitHub 개발 브랜치의 시험 구현**입니다. 아직 실제 Cloudflare Worker에 배포하지 않았고 1호 휴대폰 Termux에 실행기를 설치하지 않았습니다. 이 문서는 양쪽 작업이 서로 어긋나지 않도록 동일한 요청 형식을 정리한 것입니다.

## 역할과 흐름

1호 휴대폰의 Hermes 동백대리가 업무 내용과 담당 직원(1~10번)을 결정해 서버에 등록합니다. 노트북 동백사무실은 접속 암호로 인증한 뒤 지시함을 30초마다 읽습니다. 담당 직원의 10인 현황판에는 `1호 업무 지시 접수 · 실행 전`으로 표시됩니다. 실제 작성·검수 가능한 초안이 입력되면 노트북에서 결과를 반환하고, 1호에서는 상태·초안을 조회합니다.

서버에 업무가 등록되었다는 뜻은 **작업을 시작했다는 의미가 아닙니다.** 현재 수신 화면은 수동 초안 회신 방식이며, 자동 모델 실행·영상 제작·외부 게시를 수행하지 않습니다.

## 요청 형식

**1호 휴대폰 전용(Agent):**

`POST /api/phone1/agent/dispatch`

```json
{
  "id": "f0c7f9aa-8c64-4a88-afdb-a384913e0c90",
  "staffId": 3,
  "title": "동백팬션 릴스 컷 구성안",
  "brief": "대표가 제공한 실사 원본만 기준으로 컷 구성을 정리. 확인할 수 없는 장면은 사용하지 말 것.",
  "output": "대표 검수용 초안"
}
```

1호는 **HERMES_AGENT_TOKEN**을 HTTPS Bearer 헤더로 전송합니다. Origin 헤더를 설정하는 브라우저에서 Agent API를 호출하지 않습니다. 각 업무에는 새로운 UUID가 필요하고, 같은 UUID의 같은 내용은 재사용 가능하나 다른 내용으로 변경할 수 없습니다.

`GET /api/phone1/agent/status?id=UUID`

1호에서 결과를 확인합니다. `queued`는 아직 업무가 실행되지 않았거나 결과 입력 전 상태, `draft_ready`는 사무실에서 초안이 반환된 상태, `failed`는 실패 보고입니다. `draft_ready`의 `reviewStatus: "pending"`은 대표 승인 전임을 뜻합니다. 연결 오류가 있으면 새 UUID로 중복 제출하지 말고 기존 UUID를 조회합니다.

**노트북 사무실 전용(Office):**

- `GET /api/phone1/inbox` — 최근 업무 목록 20건
- `GET /api/phone1/inbox?id=UUID` — 단일 업무 세부 내용
- `POST /api/phone1/inbox/result` — 수동 검토한 결과 기록

```json
{
  "id": "f0c7f9aa-8c64-4a88-afdb-a384913e0c90",
  "status": "draft_ready",
  "result": "사실관계를 확인한 초안 내용"
}
```

노트북은 별도 **OFFICE_ACCESS_TOKEN**으로 HTTPS Bearer 인증하고, 허용된 사무실 Origin에서만 요청합니다. 브라우저 세션에서만 암호를 보관하며 로컬 저장소에 저장하지 않습니다. 결과 불확실 시 새 작업을 실행하거나 중복 업로드하지 않고 업무를 다시 조회합니다.

## 별도의 실제 Hermes 실행 상태

`POST /api/phone1/agent/heartbeat`는 **업무 지시 API와 다른 경로**입니다. 실제 Hermes 실행기의 시작·대기·오류·일시정지 이벤트를 관측해 보고할 때만 `source: "hermes_runtime"`을 사용합니다. 단순히 지시를 접수했다고 `working`을 보내면 안 됩니다.

기기 상태가 120초 넘게 갱신되지 않으면 노트북에서는 연결 확인 필요로 표시합니다. 자세한 내용은 [PHONE1_STATUS_CONTRACT.md](PHONE1_STATUS_CONTRACT.md)에 있습니다.

## 설치·비용·게시에 관한 제한

GitHub 소스에는 두 비밀키를 저장하지 않습니다. 현재 휴대폰 Hermes의 명령·Telegram 설정·스킬 목록을 이 문서나 웹 사무실에서 변경하지 않습니다. 테스트는 모의 AI 응답과 임시 데이터베이스를 사용하며 유료 GPT 실행이나 외부 SNS 게시를 시작하지 않습니다. **정식 배포와 휴대폰 자동 실행기 활성화는 대표 승인 후 진행합니다.**
