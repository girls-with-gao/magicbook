import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildEndingPrompt, buildOpeningPrompt } from "../public/shared/ai-prompts.js";
import { createDemoOpening, demoAnalysis } from "../public/shared/demo-data.js";

const base = { nickname: "수민", age: 7, analysis: demoAnalysis };

describe("AI prompts", () => {
  it("그림 분석에 필요한 항목을 모두 요청한다", () => {
    const prompt = buildAnalysisPrompt({ nickname: "수민", age: 7 });
    ["characters", "place", "objects", "mood", "diaryText"].forEach((field) => {
      expect(prompt).toContain(field);
    });
  });

  it("이야기 시작은 2페이지와 갈림길 질문, 카드 3장을 요청한다", () => {
    const prompt = buildOpeningPrompt(base);
    expect(prompt).toContain("exactly 2 pages");
    expect(prompt).toContain("exactly 3 choices");
    expect(prompt).toContain("questionKo");
    expect(prompt).toContain("Korean and English");
    expect(prompt).toContain("at most 2 vocabulary words");
    expect(prompt).not.toContain("Previous chapters");
  });

  it("뒷이야기는 아이가 고른 카드를 전환점으로 쓰고 화면 밖 질문과 요약을 요청한다", () => {
    const prompt = buildEndingPrompt({
      ...base,
      opening: createDemoOpening({ nickname: "수민" }),
      choice: { ko: "조개에게 노래 불러주기", en: "Sing to the shell", byVoice: false }
    });
    expect(prompt).toContain("exactly 2 pages: pages 3-4");
    expect(prompt).toContain("The child picked this card");
    expect(prompt).toContain("조개에게 노래 불러주기");
    expect(prompt).toContain("offline drawing prompt");
    expect(prompt).toContain("summaryKo");
  });

  it("말로 한 선택은 음성 인식 오류 가능성을 알려준다", () => {
    const prompt = buildEndingPrompt({
      ...base,
      opening: createDemoOpening({ nickname: "수민" }),
      choice: { ko: "조개랑 숨바꼭질", en: "", byVoice: true }
    });
    expect(prompt).toContain("said this idea out loud");
    expect(prompt).toContain("speech recognition may contain small errors");
    expect(prompt).toContain("gently turn it into a kind, safe version");
  });

  it("이어 쓰기에는 이전 편 요약과 편 번호를 넣는다", () => {
    const prompt = buildOpeningPrompt({
      ...base,
      previousChapters: [{ titleKo: "수민이와 조개의 비밀", summaryKo: "노래하는 조개를 찾았다." }]
    });
    expect(prompt).toContain("chapter 2 of 4");
    expect(prompt).toContain("수민이와 조개의 비밀 — 노래하는 조개를 찾았다.");
    expect(prompt).toContain("same characters");
    expect(prompt).not.toContain("final chapter");
  });

  it("마지막 편은 이야기를 마무리하고 표지 그리기를 제안한다", () => {
    const previousChapters = [1, 2, 3].map((n) => ({ titleKo: `${n}편`, summaryKo: "요약" }));
    const prompt = buildEndingPrompt({
      ...base,
      previousChapters,
      opening: createDemoOpening({ nickname: "수민", chapter: 4 }),
      choice: { ko: "다 같이 춤추기", en: "Dance together", byVoice: false }
    });
    expect(prompt).toContain("chapter 4 of 4");
    expect(prompt).toContain("final chapter");
    expect(prompt).toContain("cover");
  });

  it("마지막 편의 갈림길은 결말을 묻는 카드로 만든다", () => {
    const previousChapters = [1, 2, 3].map((n) => ({ titleKo: `${n}편`, summaryKo: "요약" }));
    const last = buildOpeningPrompt({ ...base, previousChapters });
    expect(last).toContain("how to END the story");
    expect(last).toContain("close the adventure");

    const middle = buildOpeningPrompt({ ...base, previousChapters: previousChapters.slice(0, 1) });
    expect(middle).not.toContain("how to END the story");
    expect(middle).toContain("without ending it");
  });
});
