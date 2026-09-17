import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildStoryPrompt } from "../lib/ai-prompts";
import { demoAnalysis } from "../lib/demo-data";

describe("AI prompts", () => {
  it("그림 분석에 필요한 항목을 모두 요청한다", () => {
    const prompt = buildAnalysisPrompt({ nickname: "수민", age: 7 });
    ["characters", "place", "objects", "mood", "diaryText"].forEach((field) => {
      expect(prompt).toContain(field);
    });
  });

  it("이야기를 4페이지 이중언어와 화면 밖 질문으로 제한한다", () => {
    const prompt = buildStoryPrompt({
      nickname: "수민",
      age: 7,
      analysis: demoAnalysis
    });
    expect(prompt).toContain("exactly 4 pages");
    expect(prompt).toContain("Korean and English");
    expect(prompt).toContain("at most 2 vocabulary words");
    expect(prompt).toContain("offline drawing prompt");
  });

  it("첫 편에는 이어 쓰기 지시를 넣지 않고 요약 필드를 요청한다", () => {
    const prompt = buildStoryPrompt({ nickname: "수민", age: 7, analysis: demoAnalysis });
    expect(prompt).not.toContain("Previous chapters");
    expect(prompt).toContain("summaryKo");
  });

  it("이어 쓰기에는 이전 편 요약과 편 번호를 넣는다", () => {
    const prompt = buildStoryPrompt({
      nickname: "수민",
      age: 7,
      analysis: demoAnalysis,
      previousChapters: [{ titleKo: "수민이와 조개의 비밀", summaryKo: "노래하는 조개를 찾았다." }]
    });
    expect(prompt).toContain("chapter 2 of 4");
    expect(prompt).toContain("수민이와 조개의 비밀 — 노래하는 조개를 찾았다.");
    expect(prompt).toContain("same characters");
    expect(prompt).not.toContain("final chapter");
  });

  it("마지막 편은 이야기를 마무리하고 표지 그리기를 제안한다", () => {
    const previousChapters = [1, 2, 3].map((n) => ({ titleKo: `${n}편`, summaryKo: "요약" }));
    const prompt = buildStoryPrompt({ nickname: "수민", age: 7, analysis: demoAnalysis, previousChapters });
    expect(prompt).toContain("chapter 4 of 4");
    expect(prompt).toContain("final chapter");
    expect(prompt).toContain("cover");
  });
});
