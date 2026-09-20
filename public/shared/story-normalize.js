import { createDemoEnding, createDemoOpening } from "./demo-data.js";
import { cleanChoiceIconKey } from "./design-copy.js";
import { CHOICE_COUNT, OPENING_PAGES, STORY_PAGES } from "./story-types.js";

/** @typedef {{nickname: string, age: number, chapter: number}} Meta */

/**
 * @param {unknown} value
 * @param {string} fallback
 * @param {number} [max]
 */
function text(value, fallback, max = 300) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

/**
 * @param {Partial<import('./story-types.js').StoryPage>|undefined} value
 * @param {import('./story-types.js').StoryPage} fallback
 * @returns {import('./story-types.js').StoryPage}
 */
export function cleanPage(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  const words = Array.isArray(value.words)
    ? value.words.filter((word) => word && typeof word.ko === "string" && typeof word.en === "string").slice(0, 2)
    : fallback.words;
  const focus =
    value.focus && typeof value.focus.x === "number" && typeof value.focus.y === "number"
      ? {
          x: Math.min(100, Math.max(0, value.focus.x)),
          y: Math.min(100, Math.max(0, value.focus.y))
        }
      : fallback.focus;
  return {
    ko: text(value.ko, fallback.ko),
    en: text(value.en, fallback.en),
    visualDescription: text(value.visualDescription, fallback.visualDescription || value.en || value.ko, 240),
    words,
    focus
  };
}

/**
 * @param {unknown} value
 * @param {import('./story-types.js').StoryPage[]} fallback
 * @param {number} count
 */
function cleanPages(value, fallback, count) {
  const pages = Array.isArray(value) ? value.slice(0, count).map((page, index) => cleanPage(page, fallback[index])) : [];
  while (pages.length < count) pages.push(fallback[pages.length]);
  return pages;
}

/**
 * @param {Partial<import('./story-types.js').StoryOpening>} value
 * @param {Meta} meta
 * @returns {import('./story-types.js').StoryOpening}
 */
export function normalizeOpening(value, meta) {
  const fallback = createDemoOpening(meta);
  const choices = Array.isArray(value.choices)
    ? value.choices
        .filter((choice) => choice && typeof choice.ko === "string" && choice.ko.trim())
        .slice(0, CHOICE_COUNT)
        .map((choice, index) => {
          const normalized = {
            emoji: text(choice.emoji, fallback.choices[index]?.emoji ?? "✨", 8),
            ko: text(choice.ko, "", 40),
            en: text(choice.en, choice.ko, 60)
          };
          if (typeof choice.iconKey === "string") normalized.iconKey = cleanChoiceIconKey(choice.iconKey);
          return normalized;
        })
    : [];
  // 카드가 모자라면 예제 카드로 채우지 않고, 있는 카드만 쓴다(최소 2장).
  const finalChoices = choices.length >= 2 ? choices : fallback.choices;
  return {
    titleKo: text(value.titleKo, fallback.titleKo, 80),
    titleEn: text(value.titleEn, fallback.titleEn, 80),
    pages: cleanPages(value.pages, fallback.pages, OPENING_PAGES),
    questionKo: text(value.questionKo, fallback.questionKo, 80),
    questionEn: text(value.questionEn, fallback.questionEn, 120),
    choices: finalChoices
  };
}

/**
 * @param {Partial<import('./story-types.js').StoryEnding>} value
 * @param {Meta & {choice: import('./story-types.js').ChildChoice}} meta
 * @returns {import('./story-types.js').StoryEnding}
 */
export function normalizeEnding(value, meta) {
  const fallback = createDemoEnding(meta);
  return {
    pages: cleanPages(value.pages, fallback.pages, STORY_PAGES - OPENING_PAGES),
    offlinePromptKo: text(value.offlinePromptKo, fallback.offlinePromptKo),
    offlinePromptEn: text(value.offlinePromptEn, fallback.offlinePromptEn),
    summaryKo: text(value.summaryKo, fallback.summaryKo),
    parentNoteKo: text(value.parentNoteKo, fallback.parentNoteKo)
  };
}

/**
 * @param {unknown} value
 * @returns {import('./story-types.js').StoryOpening | null}
 */
export function parseOpening(value) {
  if (!value || typeof value !== "object") return null;
  const opening = /** @type {Partial<import('./story-types.js').StoryOpening>} */ (value);
  if (
    typeof opening.titleKo !== "string" ||
    typeof opening.titleEn !== "string" ||
    typeof opening.questionKo !== "string" ||
    !Array.isArray(opening.pages) ||
    opening.pages.length !== OPENING_PAGES ||
    !opening.pages.every((page) => page && typeof page.ko === "string" && typeof page.en === "string")
  ) {
    return null;
  }
  return {
    titleKo: opening.titleKo.slice(0, 80),
    titleEn: opening.titleEn.slice(0, 80),
    questionKo: opening.questionKo.slice(0, 80),
    questionEn: typeof opening.questionEn === "string" ? opening.questionEn.slice(0, 120) : "",
    pages: opening.pages.map((page) => ({
      ko: page.ko.slice(0, 300),
      en: page.en.slice(0, 300),
      visualDescription: typeof page.visualDescription === "string" ? page.visualDescription.slice(0, 240) : page.en || page.ko,
      words: [],
      focus: { x: 50, y: 50 }
    })),
    choices: []
  };
}

/**
 * @param {unknown} value
 * @returns {import('./story-types.js').ChildChoice | null}
 */
export function parseChildChoice(value) {
  if (!value || typeof value !== "object") return null;
  const choice = /** @type {Partial<import('./story-types.js').ChildChoice>} */ (value);
  if (typeof choice.ko !== "string" || !choice.ko.trim()) return null;
  return {
    ko: choice.ko.trim().slice(0, 80),
    en: typeof choice.en === "string" ? choice.en.trim().slice(0, 120) : "",
    byVoice: choice.byVoice === true,
    iconKey: typeof choice.iconKey === "string" ? cleanChoiceIconKey(choice.iconKey) : undefined
  };
}

/**
 * @param {import('./story-types.js').StoryOpening} opening
 * @param {import('./story-types.js').StoryEnding} ending
 * @param {import('./story-types.js').ChildChoice} choice
 * @returns {import('./story-types.js').BilingualStory}
 */
export function combineStory(opening, ending, choice) {
  return {
    titleKo: opening.titleKo,
    titleEn: opening.titleEn,
    pages: [...opening.pages, ...ending.pages],
    offlinePromptKo: ending.offlinePromptKo,
    offlinePromptEn: ending.offlinePromptEn,
    summaryKo: ending.summaryKo,
    parentNoteKo: ending.parentNoteKo,
    choice
  };
}
