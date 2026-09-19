# 그림이야기 작업 안내

이 저장소는 **빌드 단계가 없는 순수 Node + 바닐라 자바스크립트** 프로젝트다.
예전에 있던 Next.js 앱(`app/`, `components/`, `lib/`)은 2026-09-19에 제거했다.

## 구조

- `server.js` — Node 기본 http 서버. 정적 파일 제공 + API
  - `POST /api/analyze` 그림·손글씨 읽기
  - `POST /api/story` 이야기 생성 (`phase: "opening" | "ending"`)
  - `POST /api/page-art` 쪽마다 삽화 생성
- `public/index.html`, `public/app.js` — 5단계 화면 (ESM 모듈)
- `public/shared/*.js` — 서버와 브라우저가 함께 쓰는 순수 로직. 테스트 대상
- `tests/*.test.ts` — vitest. `public/shared`를 검사한다
- `scripts/` — 예시 그림 생성·합성 도구
- `docs/superpowers/` — 설계서와 계획서

## 실행

```bash
npm run dev    # .env가 있으면 읽어서 실제 AI로 실행
npm run demo   # 키 없이 예제 모드로 실행
npm test
```

## 지켜야 할 원칙

- 아이는 타이핑하지 않는다. 고르기·말하기·그리기로만 진행한다.
- 아이 그림이 주인공이다. AI는 배경만 그리고 주인공은 원본에서 오려 쓴다.
- 아이 그림과 이야기를 서버에 저장하지 않는다. 책은 브라우저에만 둔다.
- 점수·순위·무한 추천을 넣지 않는다.
- API 키가 없어도 예제 모드로 5단계가 끝까지 돌아간다.
- 친구 이야기는 팀이 만든 예시라고 화면에 밝힌다.
