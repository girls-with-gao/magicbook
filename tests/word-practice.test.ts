import { describe, expect, it } from "vitest";
import {
  getRecurringWords,
  isCloseMatch,
  isPracticed,
  markPracticed,
  normalizeForMatch
} from "../public/shared/word-practice.js";
import { createDemoStory, demoAnalysisFor } from "../public/shared/demo-data.js";
import type { StoryBook, StoryChapter, StoryPage } from "../public/shared/story-types.js";

function page(ko: string, en: string, words: StoryPage["words"]): StoryPage {
  return { ko, en, words, focus: { x: 50, y: 50 } };
}

function chapter(opts: {
  characters?: string[];
  objects?: string[];
  words: Array<[string, string]>;
}): StoryChapter {
  const words = opts.words.map(([ko, en]) => ({ ko, en }));
  return {
    imageDataUrl: "data:image/jpeg;base64,AAAA",
    analysis: {
      characters: opts.characters || [],
      place: "",
      objects: opts.objects || [],
      mood: "",
      diaryText: ""
    },
    story: {
      titleKo: "제목",
      titleEn: "Title",
      pages: [page("문장", "sentence", words)],
      offlinePromptKo: "질문",
      offlinePromptEn: "question",
      summaryKo: "요약"
    }
  };
}

function bookOf(chapters: StoryChapter[]): StoryBook {
  return {
    id: "book-1",
    nickname: "수민",
    age: 7,
    language: "both",
    chapters,
    createdAt: new Date().toISOString()
  };
}

describe("getRecurringWords", () => {
  it("편이 하나뿐이면 단골 단어가 없다", () => {
    const book = bookOf([chapter({ words: [["토끼", "rabbit"], ["숲", "forest"]] })]);
    expect(getRecurringWords(book)).toEqual([]);
  });

  it("같은 단어(포함 관계 포함)가 서로 다른 두 편에 나오면 단골 단어로 뽑는다", () => {
    const book = bookOf([
      chapter({ words: [["토끼", "rabbit"], ["숲", "forest"]] }),
      // 두 번째 편은 "하얀 토끼"라는 인물로 다시 등장 — 부분 일치도 같은 단어로 본다.
      chapter({ characters: ["하얀 토끼"], words: [["당근", "carrot"]] })
    ]);
    const words = getRecurringWords(book);
    expect(words).toEqual([{ ko: "토끼", en: "rabbit" }]);
  });

  it("등장인물·사물 목록에 있는 단어를 우선하고, 같은 횟수면 먼저 나온 순으로 정렬한다", () => {
    const book = bookOf([
      chapter({
        characters: ["여우"],
        objects: ["작은 열쇠"],
        words: [
          ["여우", "fox"],
          ["열쇠", "key"],
          ["바람", "wind"]
        ]
      }),
      chapter({
        characters: ["여우"],
        objects: ["열쇠"],
        words: [["바람", "wind"]]
      })
    ]);
    const words = getRecurringWords(book);
    // "여우"·"열쇠"는 인물·사물 목록에도 있으니 먼저, 순서는 먼저 나온 여우 → 열쇠 → 바람(목록엔 없음) 순.
    expect(words).toEqual([
      { ko: "여우", en: "fox" },
      { ko: "열쇠", en: "key" },
      { ko: "바람", en: "wind" }
    ]);
  });

  it("많이 나온(반복 편 수가 많은) 단어를 먼저 둔다", () => {
    const book = bookOf([
      chapter({ words: [["별", "star"], ["달", "moon"]] }),
      chapter({ words: [["별", "star"]] }),
      chapter({ words: [["별", "star"], ["달", "moon"]] })
    ]);
    const words = getRecurringWords(book);
    // "별"은 세 편, "달"은 두 편 — 별이 먼저.
    expect(words.map((w) => w.en)).toEqual(["star", "moon"]);
  });

  it("최대 5개까지만 뽑는다", () => {
    const words: Array<[string, string]> = [
      ["가", "a1"],
      ["나", "a2"],
      ["다", "a3"],
      ["라", "a4"],
      ["마", "a5"],
      ["바", "a6"]
    ];
    const book = bookOf([chapter({ words }), chapter({ words })]);
    expect(getRecurringWords(book)).toHaveLength(5);
  });

  it("실제 예제 이야기 3편을 이어 붙이면 반복된 friend가 뽑힌다", () => {
    const chapters = [1, 2, 3].map((n) => ({
      imageDataUrl: "data:image/jpeg;base64,AAAA",
      analysis: demoAnalysisFor(n),
      story: createDemoStory({ nickname: "수민", chapter: n })
    }));
    const words = getRecurringWords(bookOf(chapters));
    expect(words.some((w) => w.en === "friend")).toBe(true);
  });
});

describe("isCloseMatch / normalizeForMatch", () => {
  it("대소문자와 문장부호 차이는 무시한다", () => {
    expect(normalizeForMatch("Fish!")).toBe("fish");
    expect(isCloseMatch("fish", "Fish!")).toBe(true);
  });

  it("한쪽이 다른 쪽을 포함하면 성공으로 본다", () => {
    expect(isCloseMatch("fish", "a fish")).toBe(true);
    expect(isCloseMatch("thank you", "thank")).toBe(true);
  });

  it("글자 차이가 2 이하면 성공, 그보다 크면 실패로 본다", () => {
    expect(isCloseMatch("shell", "shel")).toBe(true); // 1글자 차이
    expect(isCloseMatch("shell", "shall")).toBe(true); // 1글자 차이
    expect(isCloseMatch("shell", "shoe")).toBe(false); // 전혀 다른 말
    expect(isCloseMatch("shell", "banana")).toBe(false);
  });

  it("빈 문자열은 실패로 본다", () => {
    expect(isCloseMatch("fish", "")).toBe(false);
    expect(isCloseMatch("", "fish")).toBe(false);
  });
});

describe("markPracticed / isPracticed", () => {
  it("영어 단어를 소문자로 중복 없이 저장한다", () => {
    const book = bookOf([chapter({ words: [["물고기", "fish"]] })]);
    const next = markPracticed(book, "Fish");
    expect(next.practiced).toEqual(["fish"]);
    expect(isPracticed(next, "FISH")).toBe(true);
    expect(isPracticed(next, "shell")).toBe(false);

    const again = markPracticed(next, "fish");
    expect(again.practiced).toEqual(["fish"]); // 중복으로 늘지 않는다
  });

  it("도장이 없는 책은 항상 isPracticed가 false다", () => {
    const book = bookOf([chapter({ words: [["물고기", "fish"]] })]);
    expect(isPracticed(book, "fish")).toBe(false);
  });
});
