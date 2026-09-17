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
});
