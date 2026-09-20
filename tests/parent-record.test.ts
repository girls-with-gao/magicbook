import { describe, expect, it } from "vitest";
import { buildParentRecord } from "../public/shared/parent-record.js";
import type { StoryBook } from "../public/shared/story-types.js";

const book: StoryBook = {
  id: "book-1",
  nickname: "수민",
  age: 7,
  language: "both",
  createdAt: "2026-09-20T00:00:00.000Z",
  practiced: ["shell", "fish"],
  chapters: [
    {
      imageDataUrl: "data:image/png;base64,AAAA",
      analysis: {
        characters: ["수민", "조개"],
        place: "바닷가",
        objects: ["조개", "파도"],
        mood: "궁금한 분위기",
        diaryText: "조개를 찾았다."
      },
      story: {
        titleKo: "수민이와 조개의 비밀",
        titleEn: "The Secret Shell",
        pages: [
          { ko: "수민이는 조개를 찾았어요.", en: "Sumin found a shell.", words: [{ ko: "조개", en: "shell" }], focus: { x: 50, y: 50 } },
          { ko: "조개가 노래했어요.", en: "The shell sang.", words: [{ ko: "노래", en: "song" }], focus: { x: 50, y: 50 } }
        ],
        offlinePromptKo: "조개에게 어떤 말을 해볼까요?",
        offlinePromptEn: "What would you say to the shell?",
        summaryKo: "수민이는 조개를 만났다.",
        choice: { ko: "조개에게 인사하기", en: "Say hello to the shell", byVoice: false }
      }
    },
    {
      imageDataUrl: "data:image/png;base64,BBBB",
      analysis: {
        characters: ["수민", "노란 물고기"],
        place: "조개 속 바다 마을",
        objects: ["등불", "작은 집"],
        mood: "걱정되는 분위기",
        diaryText: "바다 마을에 갔다."
      },
      story: {
        titleKo: "조개 속 바다 마을",
        titleEn: "Sea Village",
        pages: [
          { ko: "물고기를 만났어요.", en: "Sumin met a fish.", words: [{ ko: "물고기", en: "fish" }], focus: { x: 50, y: 50 } },
          { ko: "마을이 밝아졌어요.", en: "The village became bright.", words: [{ ko: "조개", en: "shell" }], focus: { x: 50, y: 50 } }
        ],
        offlinePromptKo: "마을의 빛은 어디에 숨어 있을까요?",
        offlinePromptEn: "Where is the light hiding?",
        summaryKo: "수민이는 바다 마을을 도왔다.",
        choice: { ko: "선물 주고 인사하기", en: "Give a gift and say bye", byVoice: true }
      }
    }
  ]
};

describe("parent record summary", () => {
  it("summarizes observed choices without claiming to know the child's mind", () => {
    const record = buildParentRecord(book);

    expect(record.disclaimer).toContain("마음을 단정하지 않고");
    expect(record.observation).toBe("수민이는 “선물 주고 인사하기”를 말로 남기며 이야기를 이어갔어요.");
    expect(record.observation).not.toMatch(/심리|성향|진단|마음속/);
  });

  it("keeps the parent top summary to three practical cards", () => {
    const record = buildParentRecord(book);

    expect(record.statCards).toEqual([
      { label: "함께 만든 이야기", value: "2편" },
      { label: "아이의 선택", value: "2번" },
      { label: "말해본 단어", value: "2개" }
    ]);
  });

  it("moves mood into story atmosphere and gives parents one follow-up question", () => {
    const record = buildParentRecord(book);

    expect(record.atmosphere).toEqual(["궁금한 분위기", "걱정되는 분위기"]);
    expect(record.followUpQuestion).toBe("마을의 빛은 어디에 숨어 있을까요?");
    expect(record.focusItems).toEqual(["조개", "바닷가", "파도", "노란 물고기", "조개 속 바다 마을", "등불"]);
  });
});
