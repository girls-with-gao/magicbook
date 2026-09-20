import { describe, expect, it } from "vitest";
import { buildOpenAIPagePrompt, OPENAI_IMAGE_NEGATIVE_PROMPT } from "../lib/openai-image.js";
import { compositionDefaults, getPageFraming } from "../public/shared/page-composition.js";

describe("OpenAI storybook image prompt", () => {
  it("uses the child's drawing as the character and style reference, not as a scene to copy", () => {
    const prompt = buildOpenAIPagePrompt({
      characters: ["트리케라톱스"],
      place: "공룡 박물관",
      objects: ["공룡 뼈"],
      mood: "신기하고 즐거운",
      visualDescription: "A child-drawn triceratops gently greets Sumin beside a dinosaur skeleton in a museum hall.",
      pageNumber: 2,
      framing: "wide"
    });

    expect(prompt).toContain("authoritative visual reference");
    expect(prompt).toContain("same simple silhouette");
    expect(prompt).toContain("main colors");
    expect(prompt).toContain("Ignore paper edges");
    expect(prompt).toContain("speech bubbles, thought bubbles, labels, captions");
    expect(prompt).toContain("remove them completely instead of preserving");
    expect(prompt).toContain("Do not add empty bubbles");
    expect(prompt).toContain("bubble tails, cloud outlines, thought circles");
    expect(prompt).toContain("트리케라톱스");
    expect(prompt).toContain("공룡 박물관");
    expect(prompt).toContain("A child-drawn triceratops gently greets Sumin beside a dinosaur skeleton in a museum hall.");
    expect(prompt).toContain("No speech bubbles");
    expect(prompt).toContain("no text");
    expect(prompt).toContain("no signs");
    expect(prompt).toContain("full-bleed, silent picture-book illustration");
    expect(prompt).toContain("different story moment");
    expect(prompt).not.toContain("area below the illustration");
    expect(prompt).not.toContain("유나");
    expect(prompt).not.toContain("유나의 박물관 모험");
    expect(prompt).not.toContain("큰 발자국을 발견했어요");
    expect(OPENAI_IMAGE_NEGATIVE_PROMPT).toContain("No speech bubbles");
    expect(OPENAI_IMAGE_NEGATIVE_PROMPT).toContain("no thought bubbles");
    expect(OPENAI_IMAGE_NEGATIVE_PROMPT).toContain("no text");
  });

  it("varies the four page shots from establishing view to action, detail, and resolution", () => {
    expect(compositionDefaults.map(({ framing }) => framing)).toEqual(["wide", "medium", "close", "wide"]);
    expect(getPageFraming(0).framing).toBe("wide");
    expect(getPageFraming(2).framing).toBe("close");
    expect(getPageFraming(4).framing).toBe("wide");
  });
});
