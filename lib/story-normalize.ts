import { createDemoEnding, createDemoOpening } from "./demo-data";
import {
  CHOICE_COUNT,
  OPENING_PAGES,
  STORY_PAGES,
  type BilingualStory,
  type ChildChoice,
  type StoryChoice,
  type StoryEnding,
  type StoryOpening,
  type StoryPage
} from "./story-types";

type Meta = { nickname: string; age: number; chapter: number };

function text(value: unknown, fallback: string, max = 300) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export function cleanPage(value: Partial<StoryPage> | undefined, fallback: StoryPage): StoryPage {
  if (!value || typeof value !== "object") return fallback;
  const words = Array.isArray(value.words)
    ? value.words
        .filter((word) => word && typeof word.ko === "string" && typeof word.en === "string")
        .slice(0, 2)
    : fallback.words;
  const focus =
    value.focus && typeof value.focus.x === "number" && typeof value.focus.y === "number"
      ? {
          x: Math.min(100, Math.max(0, value.focus.x)),
          y: Math.min(100, Math.max(0, value.focus.y))
        }
      : fallback.focus;
  return { ko: text(value.ko, fallback.ko), en: text(value.en, fallback.en), words, focus };
}

function cleanPages(value: unknown, fallback: StoryPage[], count: number) {
  const pages = Array.isArray(value)
    ? value.slice(0, count).map((page, index) => cleanPage(page, fallback[index]))
    : [];
  while (pages.length < count) pages.push(fallback[pages.length]);
  return pages;
}

export function normalizeOpening(value: Partial<StoryOpening>, meta: Meta): StoryOpening {
  const fallback = createDemoOpening(meta);
  const choices: StoryChoice[] = Array.isArray(value.choices)
    ? value.choices
        .filter((choice) => choice && typeof choice.ko === "string" && choice.ko.trim())
        .slice(0, CHOICE_COUNT)
        .map((choice, index) => ({
          emoji: text(choice.emoji, fallback.choices[index]?.emoji ?? "✨", 8),
          ko: text(choice.ko, "", 40),
          en: text(choice.en, choice.ko, 60)
        }))
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

export function normalizeEnding(value: Partial<StoryEnding>, meta: Meta & { choice: ChildChoice }): StoryEnding {
  const fallback = createDemoEnding(meta);
  return {
    pages: cleanPages(value.pages, fallback.pages, STORY_PAGES - OPENING_PAGES),
    offlinePromptKo: text(value.offlinePromptKo, fallback.offlinePromptKo),
    offlinePromptEn: text(value.offlinePromptEn, fallback.offlinePromptEn),
    summaryKo: text(value.summaryKo, fallback.summaryKo)
  };
}

export function parseOpening(value: unknown): StoryOpening | null {
  if (!value || typeof value !== "object") return null;
  const opening = value as Partial<StoryOpening>;
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
      words: [],
      focus: { x: 50, y: 50 }
    })),
    choices: []
  };
}

export function parseChildChoice(value: unknown): ChildChoice | null {
  if (!value || typeof value !== "object") return null;
  const choice = value as Partial<ChildChoice>;
  if (typeof choice.ko !== "string" || !choice.ko.trim()) return null;
  return {
    ko: choice.ko.trim().slice(0, 80),
    en: typeof choice.en === "string" ? choice.en.trim().slice(0, 120) : "",
    byVoice: choice.byVoice === true
  };
}

export function combineStory(opening: StoryOpening, ending: StoryEnding, choice: ChildChoice): BilingualStory {
  return {
    titleKo: opening.titleKo,
    titleEn: opening.titleEn,
    pages: [...opening.pages, ...ending.pages],
    offlinePromptKo: ending.offlinePromptKo,
    offlinePromptEn: ending.offlinePromptEn,
    summaryKo: ending.summaryKo,
    choice
  };
}
