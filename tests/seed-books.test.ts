import { describe, expect, it } from "vitest";
import { findSeedBook, seedBooks } from "../public/shared/seed-books.js";
import { MAX_CHAPTERS } from "../public/shared/story-types.js";

describe("친구 이야기 예시", () => {
  it("세 편이 서로 다른 아이디와 지은이를 가진다", () => {
    expect(seedBooks).toHaveLength(3);
    expect(new Set(seedBooks.map((seed) => seed.id)).size).toBe(3);
    expect(new Set(seedBooks.map((seed) => seed.authorName)).size).toBe(3);
  });

  it("모든 예시가 이어 쓸 수 있는 형태다", () => {
    seedBooks.forEach((seed) => {
    expect(seed.chapters.length).toBeGreaterThan(0);
    expect(seed.chapters.length).toBeLessThan(MAX_CHAPTERS);
    expect(seed.hook.length).toBeGreaterThan(0);
    seed.chapters.forEach((chapter) => {
      expect(chapter.imagePath).toMatch(/^\/seed-.*\.png$/);
      expect(chapter.story.pages).toHaveLength(4);
      expect(chapter.story.summaryKo.length).toBeGreaterThan(0);
      expect(chapter.analysis.characters.length).toBeGreaterThan(0);
      chapter.story.pages.forEach((page) => {
        expect(page.ko.length).toBeGreaterThan(0);
        expect(page.en.length).toBeGreaterThan(0);
        expect(page.words.length).toBeLessThanOrEqual(2);
        });
      });
    });
  });

  it("아이 이름을 지은이로 쓰는 이야기에는 그 이름이 실제로 나온다", () => {
    seedBooks.forEach((seed) => {
      expect(seed.chapters[0].story.pages.some((page) => page.ko.includes(seed.authorName))).toBe(true);
    });
  });

  it("없는 아이디를 찾으면 null을 준다", () => {
    expect(findSeedBook("space-rabbit")?.authorName).toBe("민준");
    expect(findSeedBook("nope")).toBeNull();
  });
});
