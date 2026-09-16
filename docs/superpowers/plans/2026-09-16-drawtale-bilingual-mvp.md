# DrawTale Bilingual MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy-ready a mobile-first five-step web app that turns one drawing-diary image into a four-page Korean/English story and ends with an offline drawing prompt.

**Architecture:** Migrate the existing prototype to Next.js 16.3.3 App Router while preserving the legacy files as references. A client-side wizard owns temporary image and story state; two server Route Handlers analyze the uploaded drawing and generate the bilingual story. No user image or story is persisted.

**Tech Stack:** Next.js 16.3.3, React 19.3.0, TypeScript, CSS, Vitest, OpenAI Responses API through server-only `fetch`

## Global Constraints

- The story is always exactly four pages and should be readable in about three minutes.
- Support three display modes: Korean, English, and Korean + English.
- Preserve the uploaded drawing as the visual source; do not generate replacement artwork.
- End with an offline drawing prompt, not an automatic regeneration feed.
- Accept only image data URLs for JPEG, PNG, or WebP and reject payloads larger than 8 MB.
- Do not persist images, names, analysis, or stories.
- Use a nickname rather than a real name and warn against uploading faces, school names, addresses, or contact details.
- Keep `OPENAI_API_KEY` server-side only.
- Keep the existing `server.js` and `public/` prototype files unchanged as legacy reference material during this migration.

---

### Task 1: Next.js foundation and typed story domain

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `lib/story-types.ts`
- Create: `lib/demo-data.ts`
- Create: `tests/demo-data.test.ts`

**Interfaces:**
- Produces: `DrawingAnalysis`, `StoryPage`, `BilingualStory`, `LanguageMode`, `demoAnalysis`, and `createDemoStory(input)` for later tasks.

- [ ] **Step 1: Replace the development scripts and add framework dependencies**

Set `next` to `16.3.3`, `react` and `react-dom` to `19.3.0`, and add TypeScript, React type packages, and Vitest as development dependencies. Define `dev`, `build`, `start`, and `test` scripts.

- [ ] **Step 2: Write the failing demo-story tests**

Create tests that assert the demo story has exactly four pages, every page has Korean and English text, every page has no more than two vocabulary words, and the final page has an offline prompt.

- [ ] **Step 3: Run the tests to verify failure**

Run: `npm test`

Expected: FAIL because `lib/demo-data.ts` does not exist.

- [ ] **Step 4: Implement the domain types and demo story**

Define the following stable shape:

```ts
export type LanguageMode = "ko" | "en" | "both";

export type DrawingAnalysis = {
  characters: string[];
  place: string;
  objects: string[];
  mood: string;
  diaryText: string;
};

export type StoryPage = {
  ko: string;
  en: string;
  words: Array<{ ko: string; en: string }>;
  focus: { x: number; y: number };
};

export type BilingualStory = {
  titleKo: string;
  titleEn: string;
  pages: StoryPage[];
  offlinePromptKo: string;
  offlinePromptEn: string;
};
```

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and Next.js production build exits with code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts app/layout.tsx app/globals.css lib/story-types.ts lib/demo-data.ts tests/demo-data.test.ts
git commit -m "feat: add Next.js story foundation"
```

### Task 2: Input validation and server AI routes

**Files:**
- Create: `lib/image-validation.ts`
- Create: `lib/ai-prompts.ts`
- Create: `lib/openai.ts`
- Create: `app/api/analyze/route.ts`
- Create: `app/api/story/route.ts`
- Create: `tests/image-validation.test.ts`
- Create: `tests/ai-prompts.test.ts`

**Interfaces:**
- Consumes: `DrawingAnalysis`, `BilingualStory`, and `createDemoStory(input)` from Task 1.
- Produces: `validateImageDataUrl(value)`, `buildAnalysisPrompt(input)`, `buildStoryPrompt(input)`, `POST /api/analyze`, and `POST /api/story`.

- [ ] **Step 1: Write failing validation and prompt tests**

Cover these cases:

- JPEG, PNG, and WebP data URLs are accepted.
- Non-image data URLs are rejected.
- Payloads over 8 MB are rejected.
- The analysis prompt requires characters, place, objects, mood, and handwriting.
- The story prompt requires exactly four bilingual pages, at most two words per page, age-appropriate language, and an offline prompt.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because validation and prompt modules do not exist.

- [ ] **Step 3: Implement validation and prompt builders**

`validateImageDataUrl` returns `{ ok: true }` or `{ ok: false, message: string }`. Prompt builders return plain strings and contain no secret values.

- [ ] **Step 4: Implement the server-only OpenAI helper**

Use `process.env.OPENAI_API_KEY` only inside `lib/openai.ts`. Call `https://api.openai.com/v1/responses` with `gpt-4.1-mini`, extract the text response, remove optional Markdown code fences, and parse JSON. If no key exists, Route Handlers return deterministic demo analysis/story data.

- [ ] **Step 5: Implement the two Route Handlers**

`POST /api/analyze` consumes `{ imageDataUrl, nickname, age }` and returns `{ analysis, demoMode }`.

`POST /api/story` consumes `{ analysis, nickname, age }` and returns `{ story, demoMode }`.

Both routes validate required fields, return Korean user-facing errors, and set `Cache-Control: no-store`.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and production build exits with code 0.

- [ ] **Step 7: Commit**

```bash
git add lib/image-validation.ts lib/ai-prompts.ts lib/openai.ts app/api/analyze/route.ts app/api/story/route.ts tests/image-validation.test.ts tests/ai-prompts.test.ts
git commit -m "feat: add private drawing analysis routes"
```

### Task 3: Five-step bilingual story wizard

**Files:**
- Create: `lib/wizard.ts`
- Create: `tests/wizard.test.ts`
- Create: `components/story-studio.tsx`
- Create: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `/api/analyze`, `/api/story`, `DrawingAnalysis`, `BilingualStory`, and `LanguageMode`.
- Produces: `StoryStudio` and reducer transitions for `upload`, `review`, `language`, `story`, and `offline` stages.

- [ ] **Step 1: Write failing wizard-transition tests**

Assert these permitted transitions:

```text
upload -> review -> language -> story -> offline
review -> upload
language -> review
story -> language
```

Assert invalid direct transitions, such as `upload -> story`, keep the current stage unchanged.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because `lib/wizard.ts` does not exist.

- [ ] **Step 3: Implement the reducer**

Export `WizardStage`, `WizardState`, `WizardAction`, `initialWizardState`, and `wizardReducer`. Keep image data in client memory only.

- [ ] **Step 4: Implement the five visible stages**

- Upload: image preview, nickname, age, privacy notice, and one primary action.
- Review: editable diary text plus editable character, place, object, and mood fields.
- Language: Korean, English, or bilingual mode cards.
- Story: uploaded image with per-page object positioning, one or both language lines, up to two word chips, previous/next controls, and a speech button using browser `speechSynthesis` when available.
- Offline: one open-ended question and a strong `오늘은 여기까지` completion action. Do not show a regenerate button.

- [ ] **Step 5: Implement mobile-first visual styling**

Use a calm cream background, coral primary action, sky/mint supporting colors, large touch targets, always-visible back/home controls, and one primary task per screen. Prevent story text from requiring vertical scrolling on a typical mobile viewport.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests pass and production build exits with code 0.

- [ ] **Step 7: Commit**

```bash
git add lib/wizard.ts tests/wizard.test.ts components/story-studio.tsx app/page.tsx app/globals.css
git commit -m "feat: build bilingual story journey"
```

### Task 4: Documentation, safety copy, and release verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `HANDOFF_2026-09-16.md`
- Create: `VERCEL_DEPLOY_2026-09-16.md`

**Interfaces:**
- Consumes: completed Next.js app and its `OPENAI_API_KEY` environment variable.
- Produces: reproducible local and Vercel setup instructions.

- [ ] **Step 1: Update environment and run instructions**

Document Node.js 20+, `npm install`, `npm run dev`, `npm test`, and `npm run build`. Explain that no API key is required for demo mode and the secret key must only be stored in `.env.local` or Vercel Environment Variables.

- [ ] **Step 2: Add the Vercel deployment checklist**

Include repository import, `OPENAI_API_KEY` configuration, deployment, mobile verification, and the requirement to keep the public URL available during judging.

- [ ] **Step 3: Run the complete automated verification**

Run: `npm test && npm run build`

Expected: all tests pass and production build exits with code 0.

- [ ] **Step 4: Run a browser smoke test**

Start the production server, open the home page in a mobile-sized browser, complete all five steps in demo mode, switch all three language modes, use previous/next controls, verify the final offline prompt, and confirm there is no regeneration feed.

- [ ] **Step 5: Inspect version-control output**

Run: `git status --short`, `git diff --check`, and `git diff --stat origin/main...HEAD`.

Expected: no whitespace errors, only intended project files changed, and no `.env.local` file tracked.

- [ ] **Step 6: Commit**

```bash
git add .env.example README.md HANDOFF_2026-09-16.md VERCEL_DEPLOY_2026-09-16.md docs/superpowers/plans/2026-09-16-drawtale-bilingual-mvp.md
git commit -m "docs: add DrawTale release handoff"
```

- [ ] **Step 7: Push**

Run: `git push origin main`

Expected: remote `main` advances to the final verified commit.
