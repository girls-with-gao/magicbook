import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt, buildStoryPrompt } from "../lib/ai-prompts";
import { demoAnalysis } from "../lib/demo-data";
import { findTheme } from "../lib/themes";

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

  it("아이가 고른 테마를 이야기 지시문에 담는다", () => {
    const prompt = buildStoryPrompt({
      nickname: "수민",
      age: 7,
      analysis: demoAnalysis,
      themeId: "ocean"
    });
    expect(prompt).toContain("바닷속 여행");
    expect(prompt).toContain(findTheme("ocean").hint);
  });

  it("목록에 없는 테마는 기본 테마로 되돌린다", () => {
    const prompt = buildStoryPrompt({
      nickname: "수민",
      age: 7,
      analysis: demoAnalysis,
      // 값이 망가져 들어와도 프롬프트가 깨지면 안 됨
      themeId: "해킹시도" as never
    });
    expect(prompt).toContain("자유롭게");
  });

  it("테마가 아이 그림을 덮어쓰지 않도록 못 박는다", () => {
    const prompt = buildStoryPrompt({
      nickname: "수민",
      age: 7,
      analysis: demoAnalysis,
      themeId: "magic"
    });
    expect(prompt).toContain("never replace what the child actually drew");
  });
});
