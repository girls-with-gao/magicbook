# 그림이야기 · DrawTale

아이의 그림일기를 AI가 한국어와 영어의 짧은 이야기로 확장하고, 마지막 질문을 통해 아이가 다시 종이 위에 다음 상상을 그리게 하는 이중언어 창작 서비스입니다.

## 핵심 흐름

1. 부모가 그림일기 사진과 아이 별명·나이를 입력합니다.
2. AI가 그림과 손글씨를 읽습니다.
3. 부모가 AI가 읽은 내용을 확인·수정합니다.
4. 한국어, 영어, 이중언어 보기 중 하나를 고릅니다.
5. 아이가 원본 그림으로 만든 4페이지 이야기를 보고 듣습니다.
6. 마지막 질문을 받고 화면을 끄며, 다음 장면을 종이에 그립니다.

## 바로 실행하기

준비물: Node.js 20.9 이상

```bash
npm install
npm run dev
```

인터넷 창에서 <http://localhost:3000>을 엽니다.

API 키가 없어도 `예제로 시작하기`를 누르면 5단계 전체를 시연할 수 있습니다.

## 실제 AI 연결

`.env.example`을 참고해 `.env.local`을 만든 뒤 다음을 넣습니다.

```env
OPENAI_API_KEY=본인의_키
```

API 키는 결제와 연결된 비밀 출입증입니다. GitHub, 카카오톡, 채팅방에 올리지 마세요.

## 자동 확인

```bash
npm test
npm run build
```

## 개인정보 원칙

- 실명 대신 별명만 받습니다.
- 그림과 이야기를 데이터베이스에 저장하지 않습니다.
- 얼굴, 학교명, 주소, 연락처가 보이는 그림은 올리지 않도록 안내합니다.
- 업로드 이미지는 현재 AI 요청에만 사용합니다.

## 프로젝트 문서

- [상세 설계서](docs/superpowers/specs/2026-09-16-drawtale-bilingual-mvp-design.md)
- [구현 계획](docs/superpowers/plans/2026-09-16-drawtale-bilingual-mvp.md)
- [집 컴퓨터 인수인계](HANDOFF_2026-09-16.md)
- [Vercel 배포 안내](VERCEL_DEPLOY_2026-09-16.md)

## 기술 구성

- Next.js 16.3.3 App Router
- React 19.3.0
- TypeScript
- OpenAI Responses API
- Vitest
- Vercel 배포 기준

`server.js` 및 `public/index.html`, `public/app.js`, `public/styles.css`는 최초 Node.js 프로토타입 참고용으로 보존했으며, 현재 실행 경로는 `app/`의 Next.js 웹앱입니다.
