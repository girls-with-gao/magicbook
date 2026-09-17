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
};

export type StoryRequest = {
  nickname: string;
  age: number;
  analysis: DrawingAnalysis;
};
