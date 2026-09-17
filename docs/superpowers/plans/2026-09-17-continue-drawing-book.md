# 이어 그리기 → 동화책 완성 계획

작성일: 2026-09-17

## 목표

지금 흐름은 "그림 1장 → 이야기 1편"에서 끝난다. 마지막 화면의 "다음 장면을 종이에 그려보세요"를 실제 기능으로 이어서, 아이가 그린 다음 장면을 다시 올리면 **앞 이야기를 이어 쓴 다음 편**이 나오게 한다. 이렇게 최대 4편이 모이면 **나만의 동화책 한 권**이 완성된다.

원칙은 그대로 지킨다.
- 서버나 DB에 저장하지 않는다. 책은 브라우저(`localStorage`)에만 보관한다.
- 회원가입을 붙이지 않는다.
- 아이 그림이 주인공이다. AI 그림을 새로 생성하지 않는다.

## 사용자 흐름

1. 1편은 지금과 같다. 업로드 → 부모 확인 → 언어 → 이야기 → 다시 그리기.
2. 마지막 화면 버튼을 둘로 나눈다.
   - **"다음 장면 그림 올리기"**: 1단계로 돌아가되 "2편 이어 쓰기" 모드로 들어간다. 별명·나이·언어는 유지한다.
   - **"오늘은 여기까지"**: 지금 동작 그대로.
3. 2편부터는 부모 확인 화면에 "이전 이야기 요약"이 함께 보인다.
4. 4편이 모이거나 부모가 "책 완성하기"를 누르면 **책 보기 화면**으로 간다.
   - 표지: 책 제목, "지은이: {별명}", 1편 그림
   - 각 편의 그림 + 문장을 페이지 넘김으로 보기
   - 책 끝: 모은 영어 단어 카드, 부모용 한 장 요약
   - 인쇄 / PDF 저장 버튼

## 데이터 구조 (`lib/story-types.ts`)

```ts
export type StoryChapter = {
  imageDataUrl: string;      // 원본 그림 (브라우저 보관용으로 긴 변 1280px로 줄여 저장)
  analysis: DrawingAnalysis;
  story: BilingualStory;
};

export type StoryBook = {
  id: string;
  nickname: string;
  age: number;
  language: LanguageMode;
  chapters: StoryChapter[];  // 최대 4
  createdAt: string;
};

export type StoryRequest = {
  nickname: string;
  age: number;
  analysis: DrawingAnalysis;
  previousChapters?: { titleKo: string; summaryKo: string }[]; // 새로 추가
};

// BilingualStory에 추가
summaryKo: string; // 다음 편 프롬프트에 넣을 2문장 요약
```

## 작업 단위

| # | 작업 | 파일 | 크기 |
|---|---|---|---|
| 1 | 타입 추가 (`StoryChapter`, `StoryBook`, `summaryKo`, `previousChapters`) | `lib/story-types.ts` | 작음 |
| 2 | 이어 쓰기 프롬프트: 이전 편 요약을 넣고 "같은 인물과 세계관을 이어서, 새 그림 내용을 반영"하도록 지시. 마지막 편(4편)은 따뜻하게 마무리 | `lib/ai-prompts.ts` | 작음 |
| 3 | API가 `previousChapters`를 받아 검증(최대 3개, 문자열 길이 제한)하고 `summaryKo`를 정규화 | `app/api/story/route.ts` | 작음 |
| 4 | 데모 모드용 2~4편 예제 이야기 | `lib/demo-data.ts`, `public/` 예제 그림 2장 | 중간 |
| 5 | 책 보관: `localStorage` 읽기·쓰기, 용량 초과 시 안내, "책 지우기" | `lib/book-storage.ts` (신규) | 작음 |
| 6 | 단계 흐름: `offline → upload` 전환 허용, 이어 쓰기 모드 상태 | `lib/wizard.ts`, `components/story-studio.tsx` | 중간 |
| 7 | 책 보기 화면: 표지, 페이지 넘김, 단어 카드, 부모 요약 | `components/story-book.tsx` (신규), `app/globals.css` | 중간 |
| 8 | 인쇄용 CSS (`@media print`로 한 편당 한 장) | `app/globals.css` | 작음 |
| 9 | 테스트: 이어 쓰기 프롬프트에 요약 포함, 요청 검증, 저장소 용량 초과 처리, 단계 전환 | `tests/` | 작음 |

순서: 1 → 2 → 3 → 9(프롬프트·API 테스트) → 5 → 6 → 4 → 7 → 8 → 9(나머지)

## 위험과 대응

- **`localStorage` 용량(약 5MB)**: 그림 4장을 원본으로 넣으면 넘친다. 저장 전에 캔버스로 줄이고(JPEG 0.8), 넘치면 "책을 PDF로 저장하고 새 책을 시작해주세요"라고 안내한다.
- **이야기 흐름이 끊김**: 이전 편 전체가 아니라 `summaryKo`만 넘겨 프롬프트를 짧게 유지하고, 등장인물 이름은 1편 분석값을 고정으로 넘긴다.
- **시연 사고**: 데모 모드에서 4편까지 끝까지 돌아가야 한다. 발표 전 이 흐름을 최우선으로 확인한다.

## 완료 기준

- 데모 모드로 1편 → 2편 이어 쓰기 → 책 보기까지 끝까지 진행된다.
- 2편 이야기에 1편 인물이 이어서 나온다 (실제 API 키로 3회 확인).
- 새로고침해도 만들던 책이 남아 있고, "책 지우기"로 지울 수 있다.
- 휴대폰 폭에서 책 보기와 인쇄가 깨지지 않는다.
- `npm test`, `npm run build` 통과.
