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
    expect(prompt).toContain("visualDescription");
    expect(prompt).toContain("exact action, characters, setting, and relevant objects");
    expect(prompt).toContain("Refer to characters by their visual appearance, not by writing their names");
    expect(prompt).toContain("never dialogue or conversation bubbles");
    expect(prompt).toContain("not a hard reset");
    expect(prompt).toContain("clear bridge the child can draw next on paper");
    expect(prompt).toContain("iconKey");
    expect(prompt).toContain("exact list only");
    expect(prompt).not.toContain("Previous chapters");
  });

  it("뒷이야기는 아이가 고른 카드를 전환점으로 쓰고 화면 밖 질문과 요약을 요청한다", () => {
    const prompt = buildEndingPrompt({
      ...base,
      opening: createDemoOpening({ nickname: "수민" }),
      choice: { ko: "차 안에서 노래하기", en: "Sing in the car", byVoice: false }
    });
    expect(prompt).toContain("exactly 2 pages: pages 3-4");
    expect(prompt).toContain("The child picked this card");
    expect(prompt).toContain("차 안에서 노래하기");
    expect(prompt).toContain("offline drawing prompt");
    expect(prompt).toContain("summaryKo");
    expect(prompt).toContain("parentNoteKo");
    expect(prompt).toContain("must carry the child's choice forward");
  });

  it("말로 한 선택은 음성 인식 오류 가능성을 알려준다", () => {
    const prompt = buildEndingPrompt({
      ...base,
      opening: createDemoOpening({ nickname: "수민" }),
      choice: { ko: "차 안에서 숨바꼭질", en: "", byVoice: true }
    });
    expect(prompt).toContain("said this idea out loud");
    expect(prompt).toContain("speech recognition may contain small errors");
    expect(prompt).toContain("gently turn it into a kind, safe version");
  });

  it("이어 쓰기에는 이전 편 요약과 편 번호를 넣는다", () => {
    const prompt = buildOpeningPrompt({
      ...base,
      previousChapters: [{ titleKo: "수민이와 신나는 여행", summaryKo: "파란 길을 지나며 다음 장소를 상상했다." }]
    });
    expect(prompt).toContain("chapter 2 of 4");
    expect(prompt).toContain("수민이와 신나는 여행 — 파란 길을 지나며 다음 장소를 상상했다.");
    expect(prompt).toContain("same characters");
    expect(prompt).toContain("the child's sketch of what happened next");
    expect(prompt).toContain("Begin this chapter by showing the result of the previous choice");
    expect(prompt).not.toContain("final chapter");
  });

  it("3편 끝에는 4편 예제 사진과 맞게 가족에게 돌아가 이야기하는 장면을 요청한다", () => {
    const previousChapters = [1, 2].map((n) => ({ titleKo: `${n}편`, summaryKo: "요약" }));
    const prompt = buildEndingPrompt({
      ...base,
      previousChapters,
      opening: createDemoOpening({ nickname: "수민", chapter: 3 }),
      choice: { ko: "빙글빙글 놀이기구 타기", en: "Ride the spinning ride", byVoice: false }
    });
    expect(prompt).toContain("chapter 3 of 4");
    expect(prompt).toContain("coming back home and telling a parent or family member");
    expect(prompt).toContain("Do not ask for another amusement-park action");
    expect(prompt).toContain("ride, or friends' expression");
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
