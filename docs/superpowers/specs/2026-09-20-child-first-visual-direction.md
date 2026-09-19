# Child-First Visual Direction Spec

## Goal

Make 그림이야기 feel like a child-facing creative playroom, not an AI SaaS form or parent-facing product page.

## Product Position

그림이야기는 "AI 그림책 생성기"가 아니라 "아이 그림이 책으로 이어지는 종이 기반 창작 놀이"다.

The child surface must make this loop visible:

```text
그림 → 이야기 → 선택 → 다시 종이 그림
```

## Audience Split

### Child Surface

- Large visual objects before text.
- Short action copy.
- One main job per screen.
- Warm paper, sticker, crayon, book, and mission-card metaphors.
- No score, level, streak, ranking, or endless recommendation.
- AI should feel invisible. The visible hero is the child's drawing.

### Parent Surface

- Separate, quieter record surface.
- White background, smaller type, less rounded corners.
- Green emphasis only.
- Record, print, privacy, and conversation guidance before vocabulary.
- No playful mascot-heavy treatment.

## Design Principles

1. Do not explain; invite.
   - Prefer "오늘은 뭘 그릴까?" over "아이의 그림책 루프를 고르세요".

2. One screen, one job.
   - Home chooses a path.
   - Upload collects a drawing.
   - Review lets the parent confirm.
   - Story reads the book.
   - Choice asks what happens next.
   - Mission sends the child back to paper.
   - Shelf resumes the book.
   - Parent records the creative trace.

3. Cards are objects, not SaaS cards.
   - Home cards should read as paper/book/friend-story objects.
   - Avoid dense title-description-button cards when a label and large visual can carry the job.

4. The child's drawing is the primary artifact.
   - Book pages should give the largest visual weight to the uploaded drawing or its framed version.
   - Generated backgrounds must support, not compete with, the child's drawing.

5. Ban generic AI visual tropes.
   - No purple-blue gradient hero.
   - No glassmorphism panels.
   - No decorative glow blobs.
   - No stacked generic cards inside cards.
   - No gratuitous sparkle loops.

6. Use a fixed color language.
   - Paper background: warm off-white.
   - Primary child action: coral.
   - Parent/safety/records: green.
   - Secondary read/listen support: sky blue.
   - Completion/stamp: yellow.
   - Ink text: near black.

7. Motion is toy-like but brief.
   - Pressed buttons may depress slightly.
   - Cards may lift 2-4px.
   - Page and state transitions should be 150-220ms.
   - Success stamps animate once.
   - No constant attention-grabbing motion.

8. Child copy is short.
   - Child-facing headings should be one short sentence.
   - Child-facing primary buttons should be 2-5 Korean words where possible.
   - Parent-only explanations belong on the parent surface or below the main child action.

## Target Screen Shape

```text
Home
├─ 새 그림
├─ 친구 책
└─ 내 책

New Drawing
└─ 사진 고르기 / 예제로 해보기

Friend Story
└─ 책 표지 카드 → 앞 이야기 읽기 → 종이 미션

Story
└─ child drawing/book page first, text and buttons second

Choice
└─ 3 large choice cards + big mic affordance

Mission
└─ next drawing question + 2-3 concrete drawing hints

Shelf
└─ cover/progress/next prompt + continue/read/parent

Parent
└─ creative record + repeated materials + next question + print/privacy
```

## Out of Scope

- Real online sharing.
- Public child profiles.
- Multi-book library persistence beyond the existing saved book.
- AI style-transfer of the child's full drawing.
- New AI calls.

## Implemented Decisions

- Home uses short object labels: 새 그림, 친구 책, 내 책.
- Journey uses child labels: 그림, 확인, 읽기, 고르기, 다시 그리기.
- Friend relay requires 앞 이야기 보기 before upload.
- Mission cards use paper drawing prompts instead of completion-screen copy.
- Parent record remains visually separate from child surfaces.
