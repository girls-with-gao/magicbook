# Child-First Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the child-facing screens so 그림이야기 feels like a paper-and-book creative playroom for children while keeping the parent record visually separate.

**Architecture:** Keep the existing vanilla JS `stage` architecture. Add a small shared design-copy contract so key child labels and journey labels are tested, then update `public/app.js` and `public/styles.css` screen by screen. Do not add a framework, router, persistence layer, or AI call.

**Tech Stack:** Node HTTP server, vanilla ESM JavaScript, CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-child-first-visual-direction.md`

## Global Constraints

- The child surface must communicate `그림 → 이야기 → 선택 → 다시 종이 그림`.
- Child-facing copy must be short, action-led, and avoid parent/product-management language.
- The child's drawing remains the primary artifact.
- Parent surface remains visually separate: white background, smaller type, less rounded corners, green emphasis only.
- No new AI calls.
- No score, level, streak, ranking, or endless recommendation.
- No purple-blue gradient hero, glassmorphism, decorative glow blobs, or generic SaaS card stacks.
- Existing demo mode must still complete the flow without an API key.

## Review Focus

- Existing saved book: Home must prioritize "내 책" without hiding "새 그림" and "친구 책".
- No saved book: Home must not show an empty "내 책" primary card.
- Friend relay: A child must read the friend story before reaching upload.
- Mobile width 375px: Home cards, friend cards, mission card, and story controls must not overflow or overlap.
- Parent surface: Parent record must not inherit child-scale card/button styling.

---

### Task 1: Add Tested Child Design Copy Contract

**Files:**
- Create: `public/shared/design-copy.js`
- Modify: `public/app.js`
- Test: `tests/design-copy.test.ts`

**Interfaces:**
- Consumes: existing `stage` strings from `public/shared/wizard.js`.
- Produces:
  - `childJourneySteps: Array<{ stage: string, icon: string, label: string }>`
  - `homeActions: { newDrawing: string, friendBook: string, myBook: string }`
  - `missionHints: string[]`

- [ ] **Step 1: Write the failing test**

Create `tests/design-copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { childJourneySteps, homeActions, missionHints } from "../public/shared/design-copy.js";

describe("child-first design copy", () => {
  it("uses short child-facing home action labels", () => {
    expect(homeActions).toEqual({
      newDrawing: "새 그림",
      friendBook: "친구 책",
      myBook: "내 책"
    });
  });

  it("keeps the journey as icon-sized child labels", () => {
    expect(childJourneySteps).toEqual([
      { stage: "upload", icon: "🎨", label: "그림" },
      { stage: "review", icon: "👀", label: "확인" },
      { stage: "story", icon: "📖", label: "읽기" },
      { stage: "choice", icon: "✋", label: "고르기" },
      { stage: "offline", icon: "✏️", label: "다시 그리기" }
    ]);
  });

  it("keeps mission hints concrete and short", () => {
    expect(missionHints).toEqual([
      "주인공을 크게 그려요.",
      "새 친구나 장소를 하나 넣어도 좋아요.",
      "다 그리면 사진을 올려요."
    ]);
    expect(missionHints.every((hint) => hint.length <= 24)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/design-copy.test.ts`

Expected: FAIL because `public/shared/design-copy.js` does not exist.

- [ ] **Step 3: Add minimal shared copy module**

Create `public/shared/design-copy.js`:

```js
export const homeActions = {
  newDrawing: "새 그림",
  friendBook: "친구 책",
  myBook: "내 책"
};

export const childJourneySteps = [
  { stage: "upload", icon: "🎨", label: "그림" },
  { stage: "review", icon: "👀", label: "확인" },
  { stage: "story", icon: "📖", label: "읽기" },
  { stage: "choice", icon: "✋", label: "고르기" },
  { stage: "offline", icon: "✏️", label: "다시 그리기" }
];

export const missionHints = [
  "주인공을 크게 그려요.",
  "새 친구나 장소를 하나 넣어도 좋아요.",
  "다 그리면 사진을 올려요."
];
```

- [ ] **Step 4: Import the module in `public/app.js`**

Add:

```js
import { childJourneySteps, homeActions, missionHints } from "./shared/design-copy.js";
```

Do not change rendering yet.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/design-copy.test.ts`

Expected: PASS.

- [ ] **Step 6: Run full suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/shared/design-copy.js public/app.js tests/design-copy.test.ts
git commit -m "Add child-first design copy contract"
```

---

### Task 2: Redesign Home as a Child Playroom Entrance

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/design-copy.test.ts`

**Interfaces:**
- Consumes: `homeActions` from `public/shared/design-copy.js`.
- Produces: Home screen with three object-like child paths: new drawing, friend book, my book when a book exists.

- [ ] **Step 1: Extend the copy test for action labels**

Append to `tests/design-copy.test.ts`:

```ts
it("does not use adult product language in home labels", () => {
  const labels = Object.values(homeActions);
  expect(labels.join(" ")).not.toMatch(/루프|선택|기록|생성기|업로드/);
  expect(labels.every((label) => label.length <= 5)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it passes before rendering changes**

Run: `npm test -- tests/design-copy.test.ts`

Expected: PASS. This pins the copy contract before UI wiring.

- [ ] **Step 3: Update `homeHtml()` copy and structure**

In `public/app.js`, change home title/copy to:

```js
<p class="eyebrow">그림 → 이야기 → 다시 그림</p>
<h2>오늘은 뭘 그릴까?</h2>
<p>종이에 그린 그림이 책이 되고, 다음 장면은 다시 종이에 그려요.</p>
```

Use `homeActions` in the three action cards:

```js
<b>${homeActions.myBook}</b>
<b>${homeActions.newDrawing}</b>
<b>${homeActions.friendBook}</b>
```

Keep the parent button only in `brandBarHtml()`.

- [ ] **Step 4: Restyle home cards as objects**

In `public/styles.css`, update `.home-card`:

```css
.home-card {
  min-height: 190px;
  border-radius: 24px;
  border: 2px solid #1f2937;
  background: #fffdf7;
  box-shadow: 0 8px 0 rgba(31, 41, 55, 0.08);
}

.home-card.featured {
  background: #fff6d8;
}

.home-card span {
  font-size: 44px;
}

.home-card b {
  font-size: clamp(24px, 4vw, 34px);
}
```

Do not use gradient or glass effects.

- [ ] **Step 5: Verify in browser**

Run: `PORT=3001 npm run demo`

Open: `http://localhost:3001`

Expected:
- No saved book: shows `새 그림`, `친구 책`; no empty `내 책` card.
- Saved book: shows `내 책`, `새 그림`, `친구 책`.
- Cards read as large visual choices, not dense product cards.

- [ ] **Step 6: Run verification**

Run:

```bash
npm test
node --check public/app.js
```

Expected: all tests pass and syntax check exits 0.

- [ ] **Step 7: Commit**

```bash
git add public/app.js public/styles.css tests/design-copy.test.ts
git commit -m "Redesign home as child playroom entrance"
```

---

### Task 3: Convert Progress and Child Copy to a Story Journey

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/design-copy.test.ts`

**Interfaces:**
- Consumes: `childJourneySteps` from `public/shared/design-copy.js`.
- Produces: A child-friendly journey indicator replacing adult workflow labels.

- [ ] **Step 1: Add test for unique journey stages**

Append to `tests/design-copy.test.ts`:

```ts
it("has a stable journey stage order without adult workflow labels", () => {
  expect(childJourneySteps.map((step) => step.stage)).toEqual([
    "upload",
    "review",
    "story",
    "choice",
    "offline"
  ]);
  expect(childJourneySteps.map((step) => step.label).join(" ")).not.toMatch(/부모|언어|단계|진행/);
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- tests/design-copy.test.ts`

Expected: PASS.

- [ ] **Step 3: Replace `stepperHtml()` internals**

Use `childJourneySteps` instead of `stageOrder`/`stageLabels` for display.

Mapping rule:

```js
const activeStage = state.choosing ? "choice" : state.stage;
const activeStep = childJourneySteps.findIndex((step) => step.stage === activeStage);
```

Render each step as:

```js
<div class="step-dot ${index <= activeStep ? "active" : ""}">
  <span>${step.icon}</span>
  <small>${step.label}</small>
</div>
```

Keep `stageOrder` only if other code still needs it; otherwise remove it.

- [ ] **Step 4: Tighten upload/review/language child copy**

Change child-facing headings in `public/app.js`:

```js
// upload
continuing() ? "다음 장면을 올려요" : "그림을 올려요"

// review
"그림 속 이야기가 맞나요?"

// language
"어떻게 읽을까요?"
```

Keep parent-help copy smaller below the main action.

- [ ] **Step 5: Update stepper CSS**

Change `.step-dot span` to support emoji, not numbers:

```css
.step-dot span {
  width: 42px;
  height: 42px;
  font-size: 22px;
  border-radius: 16px;
}
```

Use coral for active child action; do not introduce new colors.

- [ ] **Step 6: Browser verify**

Run: `PORT=3001 npm run demo`

Expected:
- Stepper reads `🎨 그림 → 👀 확인 → 📖 읽기 → ✋ 고르기 → ✏️ 다시 그리기`.
- On the choice screen, `✋ 고르기` is active.
- Text does not overflow at 375px width.

- [ ] **Step 7: Run verification**

Run:

```bash
npm test
node --check public/app.js
```

Expected: all tests pass and syntax check exits 0.

- [ ] **Step 8: Commit**

```bash
git add public/app.js public/styles.css tests/design-copy.test.ts
git commit -m "Turn progress into child story journey"
```

---

### Task 4: Make Friend Relay and Mission Feel Like Paper Play

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Test: `tests/design-copy.test.ts`

**Interfaces:**
- Consumes: `missionHints` from `public/shared/design-copy.js`.
- Produces: Friend relay cards and mission screen that prioritize book covers and paper drawing prompts.

- [ ] **Step 1: Add test for mission hint count**

Append to `tests/design-copy.test.ts`:

```ts
it("keeps paper mission hints scannable for children", () => {
  expect(missionHints).toHaveLength(3);
  expect(missionHints.every((hint) => hint.endsWith("요."))).toBe(true);
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- tests/design-copy.test.ts`

Expected: PASS.

- [ ] **Step 3: Update `friendsHtml()` copy**

Use child-facing names:

```js
<p class="eyebrow">친구 책</p>
<h2>어떤 책을 이어 그릴까?</h2>
```

Change CTA:

```js
앞 이야기 보기
```

Keep the team-example note, but make it small and outside primary card content.

- [ ] **Step 4: Update `relayReadHtml()` mission hints**

Replace hard-coded hints with:

```js
${missionHints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}
```

Keep the offline prompt as the mission headline.

- [ ] **Step 5: Update `offlineHtml()` mission shape**

Change the heading:

```js
<h2>다음 장면은 종이에 그려요</h2>
```

Show the same `missionHints` list below the prompt.

- [ ] **Step 6: CSS for paper mission**

In `public/styles.css`, update `.mission-card`, `.offline-question`, and `.paper-prompt`:

```css
.mission-card,
.paper-prompt {
  border: 2px dashed #d9cabb;
  background: #fffdf7;
  box-shadow: 0 8px 0 rgba(31, 41, 55, 0.06);
}

.mission-card li,
.paper-prompt li {
  font-weight: 800;
}
```

Do not nest cards inside these mission surfaces.

- [ ] **Step 7: Browser verify**

Run: `PORT=3001 npm run demo`

Expected:
- Friend shelf reads as book covers, not product cards.
- Relay reader requires reading before upload.
- Mission screen clearly sends the child to paper.

- [ ] **Step 8: Run verification**

Run:

```bash
npm test
node --check public/app.js
```

Expected: all tests pass and syntax check exits 0.

- [ ] **Step 9: Commit**

```bash
git add public/app.js public/styles.css tests/design-copy.test.ts
git commit -m "Make relay and mission feel like paper play"
```

---

### Task 5: Apply Visual Tokens and Guard Parent Surface Separation

**Files:**
- Modify: `public/styles.css`
- Test: manual browser verification

**Interfaces:**
- Consumes: existing class names in `public/app.js`.
- Produces: stable CSS token language for child and parent surfaces.

- [ ] **Step 1: Update root design tokens**

In `public/styles.css`, make token roles explicit:

```css
:root {
  --ink: #202124;
  --muted: #667085;
  --line: #d8dee8;
  --paper: #fffaf0;
  --paper-soft: #fffdf7;
  --green: #1d7d6b;
  --green-dark: #0f594c;
  --green-soft: #e8f6f1;
  --coral: #f27a5e;
  --coral-dark: #c9532e;
  --sky: #dff3ff;
  --yellow: #f7c948;
  --bg: #f6f1e8;
}
```

Do not add a purple/blue gradient token.

- [ ] **Step 2: Remove leftover generic/SaaS-feeling styles**

Search:

```bash
rg -n "gradient|glass|blur|box-shadow|border-radius: 999px|hero|card" public/styles.css
```

Keep only styles that support paper, book, sticker, or parent-record roles.

- [ ] **Step 3: Parent surface audit**

Verify `.studio-shell.stage-parent`:

```css
.studio-shell.stage-parent .studio-card {
  border-radius: 12px;
  background: #fffefc;
  box-shadow: none;
}
```

Ensure parent buttons do not use coral primary styling.

- [ ] **Step 4: Browser verify desktop and mobile**

Run: `PORT=3001 npm run demo`

Check:
- `http://localhost:3001`
- `#parent` with an existing saved book.
- 375px width.

Expected:
- Child screens look like a playroom/book surface.
- Parent screen looks like a record sheet.
- No visible text overlaps.
- No button label overflows.

- [ ] **Step 5: Run verification**

Run:

```bash
npm test
node --check public/app.js
node --check public/shared/design-copy.js
```

Expected: all tests pass and syntax checks exit 0.

- [ ] **Step 6: Commit**

```bash
git add public/styles.css
git commit -m "Apply child-first visual tokens"
```

---

### Task 6: Final Visual QA and Documentation Note

**Files:**
- Modify: `docs/superpowers/specs/2026-09-20-child-first-visual-direction.md`
- Test: full suite and browser verification

**Interfaces:**
- Consumes: implemented visual behavior from Tasks 1-5.
- Produces: documented final design decisions and verified behavior.

- [ ] **Step 1: Add implementation notes to spec**

Append:

```markdown
## Implemented Decisions

- Home uses short object labels: 새 그림, 친구 책, 내 책.
- Journey uses child labels: 그림, 확인, 읽기, 고르기, 다시 그리기.
- Friend relay requires 앞 이야기 보기 before upload.
- Mission cards use paper drawing prompts instead of completion-screen copy.
- Parent record remains visually separate from child surfaces.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
node --check public/app.js
node --check public/shared/wizard.js
node --check public/shared/design-copy.js
```

Expected:
- 11 test files pass if `tests/design-copy.test.ts` was added.
- All syntax checks exit 0.

- [ ] **Step 3: Browser QA**

Run: `PORT=3001 npm run demo`

Manually verify:
- Home with no saved book.
- Home with saved book.
- Friend shelf → relay reader → upload.
- Upload → review → language → story.
- Choice screen activates `고르기`.
- Offline mission.
- Book shelf.
- Parent record.
- Print preview does not show brand bar.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-20-child-first-visual-direction.md
git commit -m "Document child-first visual decisions"
```

---

## Self-Review

- Spec coverage: The plan covers child/parent split, home, friend relay, mission, story journey, visual tokens, motion/copy constraints, and verification.
- Placeholder scan: No task uses TBD/TODO/fill-in placeholders.
- Type consistency: `homeActions`, `childJourneySteps`, and `missionHints` are defined in Task 1 and consumed by later tasks.
- Review focus coverage: Existing saved book, no saved book, friend relay, mobile width, and parent surface separation are all assigned browser verification steps.
