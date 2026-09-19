import { describe, expect, it } from "vitest";
import { createDemoEnding, createDemoOpening, createDemoStory } from "../public/shared/demo-data.js";
import {
  combineStory,
  normalizeEnding,
  normalizeOpening,
  parseChildChoice,
  parseOpening
} from "../public/shared/story-normalize.js";

const meta = { nickname: "수민", age: 7, chapter: 1 };

describe("demo branching", () => {
  it.each([1, 2, 3, 4])("%i편 시작은 2페이지와 카드 3장을 준다", (chapter) => {
    const opening = createDemoOpening({ ...meta, chapter });
    expect(opening.pages).toHaveLength(2);
    expect(opening.choices).toHaveLength(3);
    expect(opening.questionKo).toContain("?");
    opening.choices.forEach((choice) => {
      expect(choice.emoji.length).toBeGreaterThan(0);
      expect(choice.ko.length).toBeLessThanOrEqual(12);
    });
  });

  it("첫 번째 카드는 원래 예제 이야기로 이어진다", () => {
    const opening = createDemoOpening(meta);
    const card = opening.choices[0];
    const ending = createDemoEnding({ ...meta, choice: { ko: card.ko, en: card.en, byVoice: false } });
    expect(ending.pages).toEqual(createDemoStory(meta).pages.slice(2));
  });

  it("다른 카드나 아이가 말한 생각은 3페이지에 그대로 반영된다", () => {
    const card = createDemoOpening(meta).choices[1];
    const byCard = createDemoEnding({ ...meta, choice: { ko: card.ko, en: card.en, byVoice: false } });
    expect(byCard.pages[0].ko).toContain(card.ko);
    expect(byCard.pages[0].en).toContain(card.en);

    const byVoice = createDemoEnding({ ...meta, choice: { ko: "조개랑 숨바꼭질", en: "", byVoice: true } });
    expect(byVoice.pages[0].ko).toContain("조개랑 숨바꼭질");
    expect(byVoice.pages[0].en).not.toContain("조개");
    expect(byVoice.summaryKo).toContain("조개랑 숨바꼭질");
  });

  it("시작과 끝을 합치면 4페이지 이야기와 아이 선택이 남는다", () => {
    const opening = createDemoOpening(meta);
    const choice = { ko: "조개랑 숨바꼭질", en: "", byVoice: true };
    const story = combineStory(opening, createDemoEnding({ ...meta, choice }), choice);
    expect(story.pages).toHaveLength(4);
    expect(story.choice).toEqual(choice);
    expect(story.titleKo).toBe(opening.titleKo);
  });
});

describe("normalize", () => {
  it("AI가 카드를 너무 많이 주면 3장으로 자르고, 모자라면 예제 카드로 바꾼다", () => {
    const many = normalizeOpening(
      { choices: [1, 2, 3, 4, 5].map((n) => ({ emoji: "⭐", ko: `선택${n}`, en: `Choice ${n}` })) },
      meta
    );
    expect(many.choices.map((choice) => choice.ko)).toEqual(["선택1", "선택2", "선택3"]);
    expect(many.pages).toHaveLength(2);

    const few = normalizeOpening({ choices: [{ emoji: "⭐", ko: "하나", en: "One" }] }, meta);
    expect(few.choices).toEqual(createDemoOpening(meta).choices);
  });

  it("뒷이야기 페이지가 모자라면 예제로 채운다", () => {
    const ending = normalizeEnding(
      { pages: [{ ko: "새 3페이지", en: "New page 3", words: [], focus: { x: 150, y: -5 } }] },
      { ...meta, choice: { ko: "조개 소리 들어보기", en: "Listen to the shell", byVoice: false } }
    );
    expect(ending.pages).toHaveLength(2);
    expect(ending.pages[0].ko).toBe("새 3페이지");
    expect(ending.pages[0].focus).toEqual({ x: 100, y: 0 });
  });

  it("요청 검증: 선택 문장이 비었거나 시작 페이지 수가 틀리면 거절한다", () => {
    expect(parseChildChoice({ ko: "  ", byVoice: true })).toBeNull();
    expect(parseChildChoice({ ko: "숨바꼭질", byVoice: "yes" })).toEqual({ ko: "숨바꼭질", en: "", byVoice: false });
    expect(parseOpening({ ...createDemoOpening(meta), pages: [] })).toBeNull();
    expect(parseOpening(createDemoOpening(meta))?.pages).toHaveLength(2);
  });
});
