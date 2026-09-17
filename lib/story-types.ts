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

export type BilingualStory = {
  titleKo: string;
  titleEn: string;
  pages: StoryPage[];
  offlinePromptKo: string;
  offlinePromptEn: string;
  /** 다음 편을 이어 쓸 때 프롬프트에 넣는 한국어 2문장 요약 */
  summaryKo: string;
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
