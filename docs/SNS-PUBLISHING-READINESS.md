# 동백 AI 사무실 v10 — SNS 연동 전 확인표
확인일: 2026-10-30. 공식 개발사 문서/공식 API 컬렉션을 근거로 함.

## 이미 작동하는 부분
- 직원 업무 결과 → SNS 게시 초안으로 제목·본문 전달
- 연관 업무의 로컬 PNG 내려받기
- 콘텐츠별 플랫폼·예정일·대표 승인·실제 게시 확인(수동)
- 업무 기록과 SNS 초안 전체 백업
- 아직 외부 계정 OAuth 연결, 원격 파일 호스팅, 자동 발행, 성과 조회는 없음
- 현재 브라우저 저장(localStorage·IndexedDB)은 다른 기기에 자동 동기화되지 않음

## 공식 게시 API의 전제 조건
| 서비스 | 공식 요구 조건/제약 | 현재 단계 |
| --- | --- | --- |
| Instagram | Meta 앱, Instagram 프로페셔널 계정(Business/Creator), 적절한 publish scope와 계정 권한 필요. 미디어 게시용으로 공개 접근 가능한 미디어 URL 등 지원되는 전송 방식 필요. Facebook Login / Instagram Login 권한 모델은 다름 | 계정·OAuth·미디어 호스팅 미연결 |
| Threads | Meta Threads 앱, 계정별 인증 및 게시 권한. 일반적으로 컨테이너 생성/게시 절차가 있음 | 계정 인증 미연결 |
| TikTok | 개발자 앱 등록, Content Posting API 설정, 권한 및 사용자 동의. 심사 전 클라이언트 게시물 공개 제한. 동영상 직접 업로드와 사진 URL 게시 방식의 차이 주의 | 앱 심사·OAuth·업로드 미연결 |
| YouTube | YouTube Data API videos.insert와 youtube.upload OAuth 권한 필요. 영상 미디어 파일과 게시 설정 확인 필요 | OAuth·영상 업로드 미연결 |
| 네이버 블로그 | 네이버 로그인 방식 블로그 글쓰기 오픈 API는 2020-05-06 종료 공지. 일반 공개 블로그 글쓰기 API가 살아 있는 것으로 가정하지 말 것 | 수동 원고 전달 우선; 새 공식 지원 확인 전 자동 게시 금지 |

## 안전한 연동 순서
1. 인스타그램 계정이 프로페셔널 계정인지 확인하고, Meta 개발자 앱/적절한 권한 유형을 결정한다.
2. 게시 승인과 실제 API 발행 승인을 분리한다. 현재 '대표 승인'은 **문안 승인만** 의미한다.
3. 공개 업로드 매체용 호스팅/영상 파일 전송을 설계하되, 로컬 저장 사진을 무단 공개하지 않는다.
4. 서버 측 토큰 저장·갱신, 최소 권한, OAuth 상태/CSRF 검증, 중복 게시 방지 및 발행 결과 확인을 갖춘다.
5. 모의 엔드포인트로 검증한 다음 승인받은 계정으로 제한된 실제 테스트를 수행한다.
6. 플랫폼 정책 변경에 따라 공식 문서와 실제 인증 결과를 다시 확인한다.

## 확인한 공식 문서
- Meta Instagram API 공식 Postman 문서: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- Meta Threads API 공식 Postman: https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api
- TikTok Direct Post: https://developers.tiktok.com/docs/en/content-posting-api-get-started
- TikTok Photo Publishing: https://developers.tiktok.com/docs/en/content-posting-api-reference-photo-post
- YouTube videos.insert: https://developers.google.com/youtube/data/reference/rest/v3/videos/insert
- 네이버 블로그 글쓰기 API 종료 공지: https://developers.naver.com/notice/article/7527
