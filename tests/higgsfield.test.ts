import { describe, expect, it } from "vitest";
import { buildHiggsfieldPagePrompt } from "../lib/higgsfield.js";
import { compositionDefaults, getPageFraming } from "../public/shared/page-composition.js";

describe("Higgsfield storybook prompt", () => {
  it("uses the child's drawing as the character and style reference, not as a scene to copy", () => {
    const prompt = buildHiggsfieldPagePrompt({
      nickname: "유나",
      characters: ["트리케라톱스"],
      place: "공룡 박물관",
      objects: ["공룡 뼈"],
      mood: "신기하고 즐거운",
      title: "유나의 박물관 모험",
      pageText: "트리케라톱스가 큰 발자국을 발견했어요.",
      pageNumber: 2,
      framing: "wide",
      textSide: "left"
    });

    expect(prompt).toContain("authoritative visual reference");
    expect(prompt).toContain("same silhouette and proportions");
    expect(prompt).toContain("exact main colors");
    expect(prompt).toContain("Follow the parent-confirmed character identity");
    expect(prompt).toContain("Ignore and replace its original background");
    expect(prompt).toContain("트리케라톱스");
    expect(prompt).toContain("공룡 박물관");
    expect(prompt).toContain("Page story for visual guidance only");
    expect(prompt).toContain("Absolutely no writing anywhere in the image");
    expect(prompt).toContain("pseudo text");
    expect(prompt).toContain("separate area below the illustration");
    expect(prompt).toContain("different story moment and camera shot");
  });

  it("varies the four page shots from establishing view to action, detail, and resolution", () => {
    expect(compositionDefaults.map(({ framing }) => framing)).toEqual(["wide", "medium", "close", "wide"]);
    expect(getPageFraming(0).framing).toBe("wide");
    expect(getPageFraming(2).framing).toBe("close");
    expect(getPageFraming(4).framing).toBe("wide");
  });
});
