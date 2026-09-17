# Two-Choice Story Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine the richer legacy landing composition with the current five-stage wizard, then add two full-screen child choices that produce four possible four-page story paths in a 3–4 minute experience.

**Architecture:** Generate every story branch in one `/api/story` request so choice transitions never wait on AI. Keep branch selection in browser memory, resolve the six story beats with pure functions, and render page beats and choice beats as focused components inside the existing `story` wizard stage.

**Tech Stack:** Next.js 16.3.3 App Router, React 19.3.0, TypeScript 5.9, Vitest 3.2, OpenAI Responses API, CSS in `app/globals.css`.

## Global Constraints

- Preserve the five top-level stages: upload, review, language, story, offline.
- The child sees exactly four story pages and exactly two full-screen choices.
- Each choice has exactly two options; the two choices produce four possible endings.
- Generate all branches in one request; do not call AI after a child selects an option.
- Support `ko`, `en`, and `both` modes for story text, choice questions, and choice labels.
- Keep the complete experience at approximately 3–4 minutes.
- Preserve the child’s original uploaded drawing; do not generate replacement artwork.
- Store no uploaded image, story, or choice history in a database.
- End with an offline drawing prompt; do not add regenerate, streak, scoring, or infinite-content controls.
- Continue to work without `OPENAI_API_KEY` by using the complete branching demo story.
- Read relevant local Next.js 16 documentation in `node_modules/next/dist/docs/` before changing App Router or client component code.

---

## File Structure

- `lib/story-types.ts`: branching story types shared by API, demo, resolver, and UI.
- `lib/story-journey.ts`: pure beat resolver and branch lookup; no React dependency.
- `lib/demo-data.ts`: complete deterministic two-choice demo story.
- `lib/ai-prompts.ts`: JSON instructions for generating all branches safely in one response.
- `lib/story-normalization.ts`: validate and repair generated branch JSON with demo fallbacks.
- `app/api/story/route.ts`: request validation and delegation to generation/normalization.
- `components/story-choice-page.tsx`: one focused child choice screen.
- `components/story-reader.tsx`: six-beat story navigation and local choice history.
- `components/story-studio.tsx`: five-stage orchestration and richer upload landing composition.
- `app/globals.css`: merged landing, story progress, and choice-card responsive styling.
- `tests/story-journey.test.ts`: all four branch paths and beat behavior.
- `tests/story-normalization.test.ts`: malformed model output fallback behavior.
- Existing `tests/demo-data.test.ts` and `tests/ai-prompts.test.ts`: updated story contract tests.

---

### Task 1: Define the Branching Story Contract and Beat Resolver

**Files:**
- Modify: `lib/story-types.ts`
- Create: `lib/story-journey.ts`
- Create: `tests/story-journey.test.ts`

**Interfaces:**
- Produces: `StoryChoice`, `StoryEnding`, `StoryBranch`, updated `BilingualStory`, `StorySelection`, `StoryBeat`.
- Produces: `resolveStoryBeat(story: BilingualStory, beatIndex: number, selection: StorySelection): StoryBeat | null`.
- Produces: `STORY_BEAT_COUNT = 6` for page 1, choice 1, pages 2–3, choice 2, and page 4.

- [ ] **Step 1: Write the failing resolver tests**

Create `tests/story-journey.test.ts` with a small typed fixture and these assertions:

```ts
import { describe, expect, it } from "vitest";
import { resolveStoryBeat, STORY_BEAT_COUNT } from "../lib/story-journey";
import type { BilingualStory, StoryBranch } from "../lib/story-types";

const page = (ko: string) => ({
  ko,
  en: `${ko}-en`,
  words: [],
  focus: { x: 50, y: 50 }
});

const branch = (id: string, endingIds: [string, string]): StoryBranch => ({
  choice: { id, emoji: id === "sea" ? "🌊" : "☁️", labelKo: id, labelEn: id },
  middlePages: [page(`${id}-2`), page(`${id}-3`)],
  secondQuestionKo: "어떻게 할까?",
  secondQuestionEn: "What should we do?",
  endings: endingIds.map((endingId) => ({
    choice: { id: `${id}-${endingId}`, emoji: "✨", labelKo: endingId, labelEn: endingId },
    page: page(`${id}-${endingId}-4`)
  })) as StoryBranch["endings"]
});

const story: BilingualStory = {
  titleKo: "제목",
  titleEn: "Title",
  openingPage: page("공통 1쪽"),
  firstQuestionKo: "어디로 갈까?",
  firstQuestionEn: "Where should we go?",
  branches: [branch("sea", ["help", "brave"]), branch("sky", ["friend", "song"])],
  offlinePromptKo: "종이에 그려보세요.",
  offlinePromptEn: "Draw it on paper."
};

describe("resolveStoryBeat", () => {
  it("여섯 개의 이야기 비트를 사용한다", () => {
    expect(STORY_BEAT_COUNT).toBe(6);
  });

  it("첫 선택 전에는 1쪽과 첫 선택만 연다", () => {
    expect(resolveStoryBeat(story, 0, {})?.kind).toBe("page");
    expect(resolveStoryBeat(story, 1, {})?.kind).toBe("choice");
    expect(resolveStoryBeat(story, 2, {})).toBeNull();
  });

  it.each([
    ["sea", "sea-help", "sea-help-4"],
    ["sea", "sea-brave", "sea-brave-4"],
    ["sky", "sky-friend", "sky-friend-4"],
    ["sky", "sky-song", "sky-song-4"]
  ])("%s와 %s 선택이 결말 %s로 이어진다", (firstChoiceId, secondChoiceId, endingText) => {
    const beat = resolveStoryBeat(story, 5, { firstChoiceId, secondChoiceId });
    expect(beat?.kind).toBe("page");
    if (beat?.kind === "page") expect(beat.page.ko).toBe(endingText);
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npm test -- --run tests/story-journey.test.ts`

Expected: FAIL because `lib/story-journey.ts` and the new types do not exist.

- [ ] **Step 3: Add the exact branching types**

Replace the flat `pages` contract in `lib/story-types.ts` with:

```ts
export type StoryChoice = {
  id: string;
  emoji: string;
  labelKo: string;
  labelEn: string;
};

export type StoryEnding = {
  choice: StoryChoice;
  page: StoryPage;
};

export type StoryBranch = {
  choice: StoryChoice;
  middlePages: [StoryPage, StoryPage];
  secondQuestionKo: string;
  secondQuestionEn: string;
  endings: [StoryEnding, StoryEnding];
};

export type BilingualStory = {
  titleKo: string;
  titleEn: string;
  openingPage: StoryPage;
  firstQuestionKo: string;
  firstQuestionEn: string;
  branches: [StoryBranch, StoryBranch];
  offlinePromptKo: string;
  offlinePromptEn: string;
};

export type StorySelection = {
  firstChoiceId?: string;
  secondChoiceId?: string;
};

export type StoryBeat =
  | { kind: "page"; pageNumber: 1 | 2 | 3 | 4; page: StoryPage }
  | { kind: "choice"; choiceNumber: 1 | 2; questionKo: string; questionEn: string; options: [StoryChoice, StoryChoice] };
```

Keep `LanguageMode`, `DrawingAnalysis`, `StoryWord`, `StoryPage`, and `StoryRequest` unchanged.

- [ ] **Step 4: Implement the pure resolver**

Create `lib/story-journey.ts`:

```ts
import type { BilingualStory, StoryBeat, StorySelection } from "./story-types";

export const STORY_BEAT_COUNT = 6;

export function resolveStoryBeat(
  story: BilingualStory,
  beatIndex: number,
  selection: StorySelection
): StoryBeat | null {
  if (beatIndex === 0) return { kind: "page", pageNumber: 1, page: story.openingPage };
  if (beatIndex === 1) {
    return {
      kind: "choice",
      choiceNumber: 1,
      questionKo: story.firstQuestionKo,
      questionEn: story.firstQuestionEn,
      options: [story.branches[0].choice, story.branches[1].choice]
    };
  }

  const branch = story.branches.find((item) => item.choice.id === selection.firstChoiceId);
  if (!branch) return null;
  if (beatIndex === 2) return { kind: "page", pageNumber: 2, page: branch.middlePages[0] };
  if (beatIndex === 3) return { kind: "page", pageNumber: 3, page: branch.middlePages[1] };
  if (beatIndex === 4) {
    return {
      kind: "choice",
      choiceNumber: 2,
      questionKo: branch.secondQuestionKo,
      questionEn: branch.secondQuestionEn,
      options: [branch.endings[0].choice, branch.endings[1].choice]
    };
  }

  const ending = branch.endings.find((item) => item.choice.id === selection.secondChoiceId);
  return beatIndex === 5 && ending
    ? { kind: "page", pageNumber: 4, page: ending.page }
    : null;
}
```

- [ ] **Step 5: Run the resolver tests**

Run: `npm test -- --run tests/story-journey.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the domain contract**

```bash
git add lib/story-types.ts lib/story-journey.ts tests/story-journey.test.ts
git commit -m "feat: define branching story journey"
```

---

### Task 2: Generate and Normalize Every Branch Up Front

**Files:**
- Modify: `lib/demo-data.ts`
- Modify: `lib/ai-prompts.ts`
- Create: `lib/story-normalization.ts`
- Modify: `app/api/story/route.ts`
- Modify: `tests/demo-data.test.ts`
- Modify: `tests/ai-prompts.test.ts`
- Create: `tests/story-normalization.test.ts`

**Interfaces:**
- Consumes: branching types from Task 1.
- Produces: `createDemoStory()` returning two first branches and two endings per branch.
- Produces: `normalizeStory(value: Partial<BilingualStory>, nickname: string, age: number): BilingualStory`.
- `/api/story` continues returning `{ story: BilingualStory, demoMode: boolean }`.

- [ ] **Step 1: Update demo tests before implementation**

Replace flat-page expectations in `tests/demo-data.test.ts` with:

```ts
it("두 번의 선택과 네 가지 결말을 만든다", () => {
  expect(story.branches).toHaveLength(2);
  story.branches.forEach((branch) => {
    expect(branch.middlePages).toHaveLength(2);
    expect(branch.endings).toHaveLength(2);
  });
});

it("모든 경로에서 아이가 읽는 페이지는 네 쪽이다", () => {
  story.branches.forEach((branch) => {
    branch.endings.forEach((ending) => {
      expect([story.openingPage, ...branch.middlePages, ending.page]).toHaveLength(4);
    });
  });
});

it("선택지와 페이지가 모두 한글과 영어를 가진다", () => {
  story.branches.forEach((branch) => {
    expect(branch.choice.labelKo).not.toBe("");
    expect(branch.choice.labelEn).not.toBe("");
    branch.endings.forEach((ending) => {
      expect(ending.choice.labelKo).not.toBe("");
      expect(ending.choice.labelEn).not.toBe("");
      expect(ending.page.ko).not.toBe("");
      expect(ending.page.en).not.toBe("");
    });
  });
});
```

- [ ] **Step 2: Update prompt tests before implementation**

In `tests/ai-prompts.test.ts`, replace the flat four-page assertions with:

```ts
expect(prompt).toContain("exactly 2 first-choice branches");
expect(prompt).toContain("exactly 2 second-choice endings");
expect(prompt).toContain("openingPage");
expect(prompt).toContain("middlePages");
expect(prompt).toContain("Korean and English");
expect(prompt).toContain("offline drawing prompt");
```

- [ ] **Step 3: Add failing normalization tests**

Create `tests/story-normalization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeStory } from "../lib/story-normalization";

describe("normalizeStory", () => {
  it("비어 있는 응답을 완전한 예제 분기로 복구한다", () => {
    const story = normalizeStory({}, "수민", 7);
    expect(story.branches).toHaveLength(2);
    story.branches.forEach((branch) => expect(branch.endings).toHaveLength(2));
  });

  it("단어를 페이지당 두 개로 제한하고 초점 좌표를 0~100으로 제한한다", () => {
    const story = normalizeStory({
      openingPage: {
        ko: "시작",
        en: "Start",
        words: [{ ko: "하나", en: "one" }, { ko: "둘", en: "two" }, { ko: "셋", en: "three" }],
        focus: { x: 130, y: -20 }
      }
    }, "수민", 7);
    expect(story.openingPage.words).toHaveLength(2);
    expect(story.openingPage.focus).toEqual({ x: 100, y: 0 });
  });
});
```

- [ ] **Step 4: Run the three focused test files and verify failure**

Run: `npm test -- --run tests/demo-data.test.ts tests/ai-prompts.test.ts tests/story-normalization.test.ts`

Expected: FAIL because the demo and prompt are still flat and the normalizer does not exist.

- [ ] **Step 5: Build the complete deterministic demo tree**

Update `createDemoStory()` in `lib/demo-data.ts` to return:

- `openingPage`: beach arrival.
- `firstQuestionKo/En`: choose sea path or cloud path.
- `branches[0]`: `sea`, with two underwater middle pages and `sea-help` / `sea-brave` endings.
- `branches[1]`: `sky`, with two cloud middle pages and `sky-friend` / `sky-song` endings.
- Every choice has a stable lowercase ASCII `id`, one emoji, Korean label, and English label.
- Every visible path has exactly four pages, matching bilingual sentences, no more than two words per page, and safe focus coordinates.
- Keep the existing Korean name-particle helper for natural demo copy.

- [ ] **Step 6: Replace the flat generation prompt with the nested JSON contract**

Update `buildStoryPrompt()` in `lib/ai-prompts.ts` to require:

```json
{
  "titleKo": "string",
  "titleEn": "string",
  "openingPage": { "ko": "string", "en": "string", "words": [], "focus": { "x": 50, "y": 50 } },
  "firstQuestionKo": "string",
  "firstQuestionEn": "string",
  "branches": [
    {
      "choice": { "id": "safe-ascii-id", "emoji": "string", "labelKo": "string", "labelEn": "string" },
      "middlePages": [{}, {}],
      "secondQuestionKo": "string",
      "secondQuestionEn": "string",
      "endings": [
        { "choice": {}, "page": {} },
        { "choice": {}, "page": {} }
      ]
    }
  ],
  "offlinePromptKo": "string",
  "offlinePromptEn": "string"
}
```

The prompt must explicitly say: exactly two first branches, exactly two endings inside each branch, no right/wrong option, no frightening or punitive outcome, matching Korean/English, four visible pages per path, and one offline drawing prompt.

- [ ] **Step 7: Move normalization into a tested library**

Create `lib/story-normalization.ts` by moving the current page cleanup logic out of the route and adding:

```ts
export function normalizeStory(
  value: Partial<BilingualStory>,
  nickname: string,
  age: number
): BilingualStory;
```

Use `createDemoStory({ nickname, age })` as the structural fallback. Normalize the opening page, both branches, both middle pages per branch, both endings per branch, questions, and choice labels. Slice arrays to two and fill missing entries from the matching fallback position. Clamp focus coordinates to `0..100` and vocabulary to two items.

- [ ] **Step 8: Simplify the story route**

In `app/api/story/route.ts`:

- Remove local `cleanPage()` and `normalizeStory()`.
- Import `normalizeStory` from `@/lib/story-normalization`.
- Keep request validation, age clamping, no-store headers, demo-mode return, and retryable Korean error unchanged.

- [ ] **Step 9: Run focused and full tests**

Run: `npm test -- --run tests/demo-data.test.ts tests/ai-prompts.test.ts tests/story-normalization.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 10: Commit generation and safety fallback**

```bash
git add lib/demo-data.ts lib/ai-prompts.ts lib/story-normalization.ts app/api/story/route.ts tests/demo-data.test.ts tests/ai-prompts.test.ts tests/story-normalization.test.ts
git commit -m "feat: generate two-choice story branches"
```

---

### Task 3: Merge the Rich Landing Composition into the Upload Stage

**Files:**
- Modify: `components/story-studio.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing upload state and `analyzeDrawing()` behavior.
- Produces: `.upload-hero`, `.upload-hero-copy`, `.book-preview`, and `.upload-form-grid` responsive layout classes.
- Does not change `/api/analyze` or upload validation.

- [ ] **Step 1: Read the relevant local Next.js client component and Image guides**

Run:

```bash
sed -n '1,220p' node_modules/next/dist/docs/01-app/03-building-your-application/03-rendering/02-client-components.md
sed -n '1,220p' node_modules/next/dist/docs/01-app/03-building-your-application/06-optimizing/01-images.md
```

Expected: confirm that the existing `"use client"` boundary and `next/image` data URL usage remain supported.

- [ ] **Step 2: Restructure only the upload-stage markup**

In the `stage === "upload"` branch of `components/story-studio.tsx`, keep the same inputs and handlers but render:

```tsx
<form className="stage-panel upload-stage" onSubmit={analyzeDrawing}>
  <div className="upload-hero">
    <div className="upload-hero-copy">
      <p className="eyebrow">아이의 그림이 이야기의 시작</p>
      <h2>아이 그림이<br />동화가 되는 순간</h2>
      <p>그림일기를 올리면 아이가 직접 선택하며 완성하는 한글·영어 이야기가 열려요.</p>
      <a className="hero-jump" href="#drawing-upload">그림 올리고 시작하기 ↓</a>
    </div>
    <div className="book-preview" aria-label="완성될 그림책 미리보기">
      <div className="book-preview-art">🖍️🐚🌊</div>
      <strong>{nickname || "아이"}의 그림이야기</strong>
      <small>내 그림으로 만드는 네 쪽의 모험</small>
    </div>
  </div>
  <div className="upload-form-grid" id="drawing-upload">
    {/* Existing upload box, sample button, nickname, age, privacy copy, and submit button */}
  </div>
</form>
```

Do not add the legacy theme, character-name, or character-detail fields. They duplicate AI analysis and would make the first stage longer.

- [ ] **Step 3: Add responsive landing styles**

In `app/globals.css`:

- Desktop `.upload-hero`: two columns, copy `1.1fr`, preview `.9fr`, 24–32px gap.
- `.book-preview`: warm paper background, rounded book shape, subtle rotated shadow, readable preview title.
- `.hero-jump`: visually secondary to the final submit button.
- Mobile at the existing `max-width: 720px` breakpoint: one column in copy → preview → form order.
- Preserve 48px minimum button height, visible focus styles, and no horizontal overflow at 320px width.

- [ ] **Step 4: Verify the upload behavior did not change**

Run: `npm test`

Expected: all existing tests PASS.

Run: `npm run build`

Expected: production build PASS with `/`, `/api/analyze`, and `/api/story` routes.

- [ ] **Step 5: Manually inspect the first screen**

Run: `npm run dev`

Check at `http://localhost:3000`:

- At desktop width, copy and book preview appear side by side.
- At 390px width, copy, preview, upload, fields, privacy, and submit stack without horizontal scrolling.
- `예제로 시작하기` still loads the sample image.
- The privacy checkbox still gates `이야기 시작하기`.

- [ ] **Step 6: Commit the merged landing screen**

```bash
git add components/story-studio.tsx app/globals.css
git commit -m "feat: merge rich landing into upload flow"
```

---

### Task 4: Render Six Beats with Two Full-Screen Choices

**Files:**
- Create: `components/story-choice-page.tsx`
- Create: `components/story-reader.tsx`
- Modify: `components/story-studio.tsx`
- Modify: `app/globals.css`
- Modify: `tests/story-journey.test.ts`

**Interfaces:**
- Consumes: `resolveStoryBeat()`, `BilingualStory`, `LanguageMode`, and uploaded image data URL.
- Produces: `StoryChoicePage` with `questionKo`, `questionEn`, `options`, `language`, `choiceNumber`, and `onChoose(id)` props.
- Produces: `StoryReader` with `story`, `imageDataUrl`, `language`, `nickname`, and `onComplete()` props.
- `StoryStudio` delegates the entire `stage === "story"` branch to `StoryReader`.

- [ ] **Step 1: Extend resolver tests for locked and changing paths**

Add to `tests/story-journey.test.ts`:

```ts
it("첫 선택 뒤에는 해당 분기의 두 번째 선택만 보여준다", () => {
  const beat = resolveStoryBeat(story, 4, { firstChoiceId: "sea" });
  expect(beat?.kind).toBe("choice");
  if (beat?.kind === "choice") {
    expect(beat.choiceNumber).toBe(2);
    expect(beat.options.map((option) => option.id)).toEqual(["sea-help", "sea-brave"]);
  }
});

it("범위를 벗어난 비트는 열지 않는다", () => {
  expect(resolveStoryBeat(story, -1, {})).toBeNull();
  expect(resolveStoryBeat(story, STORY_BEAT_COUNT, { firstChoiceId: "sea", secondChoiceId: "sea-help" })).toBeNull();
});
```

- [ ] **Step 2: Run the resolver tests**

Run: `npm test -- --run tests/story-journey.test.ts`

Expected: PASS; if the out-of-range assertion exposes a resolver gap, add an early `beatIndex < 0 || beatIndex >= STORY_BEAT_COUNT` return.

- [ ] **Step 3: Create the focused choice component**

Create `components/story-choice-page.tsx` with:

```tsx
import type { LanguageMode, StoryChoice } from "@/lib/story-types";

type Props = {
  nickname: string;
  choiceNumber: 1 | 2;
  questionKo: string;
  questionEn: string;
  options: [StoryChoice, StoryChoice];
  language: LanguageMode;
  onChoose: (id: string) => void;
};

export function StoryChoicePage(props: Props) {
  const { nickname, choiceNumber, questionKo, questionEn, options, language, onChoose } = props;
  return (
    <div className="choice-stage">
      <p className="eyebrow">선택 {choiceNumber} / 2 · {nickname}가 결정할 차례!</p>
      <span className="choice-spark" aria-hidden="true">✨</span>
      {language !== "en" ? <h2>{questionKo}</h2> : null}
      {language !== "ko" ? <p className="english-line choice-question-en">{questionEn}</p> : null}
      <div className="choice-options">
        {options.map((option) => (
          <button type="button" key={option.id} onClick={() => onChoose(option.id)}>
            <span aria-hidden="true">{option.emoji}</span>
            <b>{language === "en" ? option.labelEn : option.labelKo}</b>
            {language === "both" ? <small>{option.labelEn}</small> : null}
          </button>
        ))}
      </div>
      <p className="helper-copy">선택에 따라 다음 장면과 결말이 달라져요.</p>
    </div>
  );
}
```

- [ ] **Step 4: Create the story reader state machine**

Create `components/story-reader.tsx` as a client component. It must:

- Start at `beatIndex = 0` and empty `StorySelection`.
- Call `resolveStoryBeat(story, beatIndex, selection)` on every render.
- On first choice, set `{ firstChoiceId: id, secondChoiceId: undefined }` and advance.
- On second choice, set `secondChoiceId` and advance.
- Keep selections when moving backward.
- Render `StoryChoicePage` for `choice` beats.
- Render the existing image, bilingual copy, listen buttons, word chips, and page count for `page` beats.
- Show `pageNumber / 4`, not beat position.
- On the last page, call `onComplete()` instead of incrementing.
- Disable the previous button only at beat 0.
- Use the resolved page focus for original-image positioning.

The core state and choice transition must be:

```tsx
const [beatIndex, setBeatIndex] = useState(0);
const [selection, setSelection] = useState<StorySelection>({});
const beat = resolveStoryBeat(story, beatIndex, selection);

function choose(id: string) {
  if (beat?.kind !== "choice") return;
  setSelection((current) => beat.choiceNumber === 1
    ? { firstChoiceId: id }
    : { ...current, secondChoiceId: id });
  setBeatIndex((current) => Math.min(STORY_BEAT_COUNT - 1, current + 1));
}
```

Move the browser speech helper from `StoryStudio` into `StoryReader`. Report unsupported speech with a local `role="alert"` message so it does not alter the outer wizard state.

- [ ] **Step 5: Delegate the story stage from the studio**

In `components/story-studio.tsx`:

- Remove `pageIndex`, `currentPage`, and the local `speak()` function.
- Remove `setPageIndex(0)` from `generateStory()`.
- Replace the current story markup with:

```tsx
{stage === "story" && story ? (
  <StoryReader
    story={story}
    imageDataUrl={imageDataUrl}
    language={language}
    nickname={nickname}
    onComplete={() => go("offline")}
  />
) : null}
```

- Keep the outer back button from story to language; its selection state resets naturally when a newly generated `StoryReader` mounts after regeneration.

- [ ] **Step 6: Style the independent choice screens and story progress**

In `app/globals.css`, add:

- `.choice-stage`: centered, generous vertical spacing, no unrelated controls.
- `.choice-spark`: large visual anchor.
- `.choice-options`: two equal columns on desktop and mobile down to 360px; at 320px stack to one column.
- `.choice-options button`: minimum 96px height, clear border, emoji at least 32px, hover/focus/active states.
- `.choice-question-en`: visually secondary but at least 16px.
- Preserve current story image and text styling.
- Ensure choice screens fit without horizontal scrolling at 320px.

- [ ] **Step 7: Run tests and build**

Run: `npm test`

Expected: all tests PASS, including all four endings.

Run: `npm run build`

Expected: production build PASS.

- [ ] **Step 8: Commit the interactive reader**

```bash
git add components/story-choice-page.tsx components/story-reader.tsx components/story-studio.tsx app/globals.css tests/story-journey.test.ts
git commit -m "feat: add two child story choices"
```

---

### Task 5: Verify Every Path and Update the Home Handoff

**Files:**
- Modify: `README.md`
- Modify: `HANDOFF_2026-09-16.md`
- Modify: `VERCEL_DEPLOY_2026-09-16.md`

**Interfaces:**
- Consumes: completed landing and branching reader.
- Produces: accurate nontechnical run, test, and deployment instructions.

- [ ] **Step 1: Update project documentation**

Document these exact product changes:

- Rich first screen with storybook preview.
- Two independent child choice screens.
- Four possible endings while each run still shows four pages.
- All branches are generated at the initial story request, so choices open instantly.
- API-key-free demo mode covers the complete choice journey.
- Images and choice history remain unsaved.

In the home handoff, make the next recommended action “test one real drawing in all three language modes,” not “implement choices.”

- [ ] **Step 2: Run final automated verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all tests PASS, production build PASS, and no whitespace errors.

- [ ] **Step 3: Exercise all four endings in the browser**

At `http://localhost:3000`, use `예제로 시작하기` and verify:

1. Sea → help ending.
2. Sea → brave ending.
3. Sky → friend ending.
4. Sky → song ending.

For each path confirm: visible page count is 1–4, both choice screens are separate, selected content appears immediately, and the final action reaches the paper-drawing screen.

- [ ] **Step 4: Verify language and responsive behavior**

Confirm:

- Korean mode hides English story and choice text.
- English mode hides Korean story and choice text.
- Both mode shows matching text and bilingual choice labels.
- At 390px and 320px widths, the hero, upload controls, story pages, and choices do not overflow.
- Browser console has no errors during the complete demo path.

- [ ] **Step 5: Commit documentation and verification updates**

```bash
git add README.md HANDOFF_2026-09-16.md VERCEL_DEPLOY_2026-09-16.md
git commit -m "docs: update branching story handoff"
```

- [ ] **Step 6: Prepare integration without overwriting remote work**

Run:

```bash
git fetch origin main
git status --short --branch
git log --oneline --left-right main...origin/main
```

If remote `main` moved, rebase only after confirming the working tree is clean, then rerun `npm test` and `npm run build`. Never force-push. Follow the user’s integration choice before pushing.
