import { describe, expect, it } from "vitest";
import { createDemoStory } from "../lib/demo-data";

describe("createDemoStory", () => {
  const story = createDemoStory({ nickname: "수민", age: 7 });

  it("정확히 4페이지의 이야기를 만든다", () => {
    expect(story.pages).toHaveLength(4);
  });

  it("모든 페이지에 한국어와 영어 문장을 넣는다", () => {
    story.pages.forEach((page) => {
      expect(page.ko.length).toBeGreaterThan(0);
      expect(page.en.length).toBeGreaterThan(0);
    });
  });

  it("페이지당 핵심 단어를 2개 이하로 제한한다", () => {
    story.pages.forEach((page) => {
      expect(page.words.length).toBeLessThanOrEqual(2);
    });
  });

  it("마지막에 화면 밖 그리기 질문을 제공한다", () => {
    expect(story.offlinePromptKo).toContain("그려");
    expect(story.offlinePromptEn.length).toBeGreaterThan(0);
  });

  it("아이 이름의 받침에 맞는 한국어 조사를 사용한다", () => {
    expect(story.titleKo).toBe("수민이와 조개의 비밀");
    expect(story.pages[0].ko).toContain("수민이는 엄마와");

    const vowelNameStory = createDemoStory({ nickname: "지우", age: 7 });
    expect(vowelNameStory.titleKo).toBe("지우와 조개의 비밀");
    expect(vowelNameStory.pages[0].ko).toContain("지우는 엄마와");
  });
});
