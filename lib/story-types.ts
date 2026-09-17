export type LanguageMode = "ko" | "en" | "both";

export type DrawingAnalysis = {
  characters: string[];
  place: string;
  objects: string[];
  mood: string;
  diaryText: string;
};

export type StoryWord = {
  ko: string;
  en: string;
};

export type StoryPage = {
  ko: string;
  en: string;
  words: StoryWord[];
  focus: { x: number; y: number };
};

export const OPENING_PAGES = 2;
export const STORY_PAGES = 4;
export const CHOICE_COUNT = 3;

/** 이야기 중간에 아이가 고르는 갈림길 카드 */
export type StoryChoice = {
  emoji: string;
  ko: string;
  en: string;
};

/** 아이가 실제로 고른(또는 말한) 다음 장면 */
export type ChildChoice = {
  ko: string;
  en: string;
  byVoice: boolean;
};

/** 1단계 생성 결과: 앞 2페이지 + 갈림길 질문 */
export type StoryOpening = {
  titleKo: string;
  titleEn: string;
  pages: StoryPage[];
  questionKo: string;
  questionEn: string;
  choices: StoryChoice[];
};

/** 2단계 생성 결과: 아이 선택을 반영한 뒤 2페이지 */
export type StoryEnding = {
  pages: StoryPage[];
  offlinePromptKo: string;
  offlinePromptEn: string;
  summaryKo: string;
};

export type BilingualStory = {
  titleKo: string;
  titleEn: string;
  pages: StoryPage[];
  offlinePromptKo: string;
  offlinePromptEn: string;
  /** 다음 편을 이어 쓸 때 프롬프트에 넣는 한국어 2문장 요약 */
  summaryKo: string;
  /** 아이가 고른 갈림길. 갈림길 도입 전에 만든 책에는 없다. */
  choice?: ChildChoice;
};

export const MAX_CHAPTERS = 4;

export type PreviousChapter = {
  titleKo: string;
  summaryKo: string;
};

export type StoryChapter = {
  imageDataUrl: string;
  analysis: DrawingAnalysis;
  story: BilingualStory;
};

export type StoryBook = {
  id: string;
  nickname: string;
  age: number;
  language: LanguageMode;
  chapters: StoryChapter[];
  createdAt: string;
};

export type StoryRequest = {
  nickname: string;
  age: number;
  analysis: DrawingAnalysis;
  previousChapters?: PreviousChapter[];
};

export type EndingRequest = StoryRequest & {
  opening: StoryOpening;
  choice: ChildChoice;
};
