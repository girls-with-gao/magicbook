import { describe, expect, it } from "vitest";
import { withPreferredDiaryText } from "../public/shared/analysis-defaults.js";

describe("withPreferredDiaryText", () => {
  it("예제 사진에는 스토리 흐름에 맞는 짧은 그림일기 글을 우선 채운다", () => {
    const analysis = {
      characters: ["수민"],
      place: "놀이공원",
      objects: ["놀이기구"],
      mood: "신남",
      diaryText: "4명의 사람"
    };

    expect(withPreferredDiaryText(analysis, "놀이공원에서 돌아와 오늘 이야기를 들려주었다.")).toEqual({
      ...analysis,
      diaryText: "놀이공원에서 돌아와 오늘 이야기를 들려주었다."
    });
  });

  it("예제 문장이 없으면 직접 업로드 분석 결과를 건드리지 않는다", () => {
    const analysis = {
      characters: ["아이"],
      place: "집",
      objects: ["강아지"],
      mood: "편안함",
      diaryText: "강아지와 놀았다."
    };

    expect(withPreferredDiaryText(analysis, "")).toBe(analysis);
  });
});
