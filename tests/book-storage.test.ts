import { describe, expect, it } from "vitest";
import { appendChapter, BOOK_STORAGE_KEY, clearBook, isBookFull, loadBook, saveBook } from "../lib/book-storage";
import { createDemoStory, demoAnalysis } from "../lib/demo-data";
import { parsePreviousChapters } from "../lib/previous-chapters";
import type { StoryChapter } from "../lib/story-types";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key)
  };
}

const chapter = (n: number): StoryChapter => ({
  imageDataUrl: "data:image/jpeg;base64,AAAA",
  analysis: demoAnalysis,
  story: createDemoStory({ nickname: "수민", chapter: n })
});
const meta = { nickname: "수민", age: 7, language: "both" as const };

describe("book storage", () => {
  it("편을 차례로 더하고 4편이 차면 새 책을 시작한다", () => {
    let book = appendChapter(null, chapter(1), meta);
    [2, 3, 4].forEach((n) => (book = appendChapter(book, chapter(n), meta)));
    expect(book.chapters).toHaveLength(4);
    expect(isBookFull(book)).toBe(true);

    const next = appendChapter(book, chapter(1), meta, new Date(Date.now() + 1000));
    expect(next.chapters).toHaveLength(1);
    expect(next.id).not.toBe(book.id);
  });

  it("저장한 책을 다시 읽고 지울 수 있다", () => {
    const storage = memoryStorage();
    const book = appendChapter(null, chapter(1), meta);
    expect(saveBook(storage, book)).toEqual({ ok: true });
    expect(loadBook(storage)?.chapters[0].story.titleKo).toBe(book.chapters[0].story.titleKo);
    clearBook(storage);
    expect(loadBook(storage)).toBeNull();
  });

  it("저장 공간이 가득 차면 안내 메시지를 돌려준다", () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      }
    };
    const result = saveBook(storage, appendChapter(null, chapter(1), meta));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("PDF");
  });

  it("깨진 저장값은 무시한다", () => {
    const storage = memoryStorage();
    storage.setItem(BOOK_STORAGE_KEY, "{not json");
    expect(loadBook(storage)).toBeNull();
  });
});

describe("parsePreviousChapters", () => {
  it("형식이 맞는 항목만 최대 3개까지 받고 길이를 자른다", () => {
    const parsed = parsePreviousChapters([
      { titleKo: "1편", summaryKo: "가".repeat(500) },
      { titleKo: 3 },
      null,
      { titleKo: "2편", summaryKo: "요약" },
      { titleKo: "3편", summaryKo: "요약" },
      { titleKo: "4편", summaryKo: "요약" }
    ]);
    expect(parsed.map((item) => item.titleKo)).toEqual(["1편", "2편", "3편"]);
    expect(parsed[0].summaryKo).toHaveLength(300);
    expect(parsePreviousChapters("nope")).toEqual([]);
  });
});
