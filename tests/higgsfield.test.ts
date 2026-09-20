import { describe, expect, it } from "vitest";
import { buildHiggsfieldPagePrompt, HIGGSFIELD_NEGATIVE_PROMPT } from "../lib/higgsfield.js";
import { compositionDefaults, getPageFraming } from "../public/shared/page-composition.js";

describe("Higgsfield storybook prompt", () => {
  it("uses the child's drawing as the character and style reference, not as a scene to copy", () => {
    const prompt = buildHiggsfieldPagePrompt({
      characters: ["트리케라톱스"],
      place: "공룡 박물관",
      objects: ["공룡 뼈"],
      mood: "신기하고 즐거운",
      visualDescription: "A child-drawn triceratops gently greets Sumin beside a dinosaur skeleton in a museum hall.",
      pageNumber: 2,
      framing: "wide"
    });

    expect(prompt).toContain("authoritative visual reference");
    expect(prompt).toContain("same silhouette and proportions");
    expect(prompt).toContain("exact main colors");
    expect(prompt).toContain("Follow the parent-confirmed character identity");
    expect(prompt).toContain("Ignore and replace its original background");
    expect(prompt).toContain("트리케라톱스");
    expect(prompt).toContain("공룡 박물관");
    expect(prompt).toContain("A child-drawn triceratops gently greets Sumin beside a dinosaur skeleton in a museum hall.");
    expect(prompt).toContain("The illustration contains no text of any kind and no comic devices");
    expect(prompt).toContain("lettering, words, numbers, logos");
    expect(prompt).toContain("noticeboards, exhibit plaques, diagrams, screens");
    expect(prompt).toContain("silent picture-book illustration");
    expect(prompt).toContain("no comic devices");
    expect(prompt).toContain("no speech bubbles, thought bubbles, dialogue balloons, callouts");
    expect(prompt).toContain("different story moment and camera shot");
    expect(prompt).not.toContain("area below the illustration");
    expect(prompt).not.toContain("유나");
    expect(prompt).not.toContain("유나의 박물관 모험");
    expect(prompt).not.toContain("큰 발자국을 발견했어요");
    expect(HIGGSFIELD_NEGATIVE_PROMPT).toContain("speech bubbles");
    expect(HIGGSFIELD_NEGATIVE_PROMPT).toContain("thought bubbles");
    expect(HIGGSFIELD_NEGATIVE_PROMPT).toContain("writing of any kind");
  });

  it("varies the four page shots from establishing view to action, detail, and resolution", () => {
    expect(compositionDefaults.map(({ framing }) => framing)).toEqual(["wide", "medium", "close", "wide"]);
    expect(getPageFraming(0).framing).toBe("wide");
    expect(getPageFraming(2).framing).toBe("close");
    expect(getPageFraming(4).framing).toBe("wide");
  });
});
