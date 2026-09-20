import { describe, expect, it } from "vitest";
import { childJourneySteps, choiceIconForText, homeActions, icons, missionHints } from "../public/shared/design-copy.js";

describe("child-first design copy", () => {
  it("uses short child-facing home action labels", () => {
    expect(homeActions).toEqual({
      newDrawing: "새 그림",
      friendBook: "친구 책",
      myBook: "내 책"
    });
  });

  it("does not use adult product language in home labels", () => {
    const labels = Object.values(homeActions);
    expect(labels.join(" ")).not.toMatch(/루프|선택|기록|생성기|업로드/);
    expect(labels.every((label) => label.length <= 5)).toBe(true);
  });

  it("keeps the journey as icon-sized child labels", () => {
    expect(childJourneySteps).toEqual([
      { stage: "upload", icon: "newDrawing", label: "그림" },
      { stage: "review", icon: "review", label: "확인" },
      { stage: "story", icon: "read", label: "읽기" },
      { stage: "choice", icon: "choice", label: "고르기" },
      { stage: "offline", icon: "paperMission", label: "다시 그리기" }
    ]);
  });

  it("has a stable journey stage order without adult workflow labels", () => {
    expect(childJourneySteps.map((step) => step.stage)).toEqual(["upload", "review", "story", "choice", "offline"]);
    expect(childJourneySteps.map((step) => step.label).join(" ")).not.toMatch(/부모|언어|단계|진행/);
  });

  it("keeps mission hints concrete and short", () => {
    expect(missionHints).toEqual([
      "주인공을 크게 그려요.",
      "새 친구나 장소를 하나 넣어도 좋아요.",
      "다 그리면 사진을 올려요."
    ]);
    expect(missionHints.every((hint) => hint.length <= 24)).toBe(true);
  });

  it("keeps paper mission hints scannable for children", () => {
    expect(missionHints).toHaveLength(3);
    expect(missionHints.every((hint) => hint.endsWith("요."))).toBe(true);
  });

  it("uses product icon assets instead of emoji for UI symbols", () => {
    expect(icons.brand).toBe("/assets/icons/icon-final-home.png");
    for (const step of childJourneySteps) {
      expect(icons[step.icon]).toMatch(/^\/assets\/icons\/icon-(final-)?[a-z-]+\.png$/);
      expect(icons[step.icon]).not.toContain("emoji");
    }
  });

  it("maps common story choices to action icons", () => {
    expect(choiceIconForText("조개 소리 들어보기 Listen to the shell")).toBe("actionListen");
    expect(choiceIconForText("조개에게 노래 불러주기 Sing to the shell")).toBe("actionSing");
    expect(choiceIconForText("조개에게 인사하기 Say hello to the shell")).toBe("actionHello");
    expect(choiceIconForText("다 같이 춤추기 Dance together")).toBe("actionDance");
    expect(choiceIconForText("선물 주고 인사하기 Give a gift and say bye")).toBe("actionGift");
    expect(choiceIconForText("다 같이 잠들기 Fall asleep together")).toBe("actionSleep");
    expect(choiceIconForText("마을 구경하기 Look around the village")).toBe("actionLookAround");
    expect(choiceIconForText("방울이 소개하기 Introduce Bubbles")).toBe("actionIntroduce");
    expect(choiceIconForText("친구 하자고 하기 Ask to be friends")).toBe("actionFriend");
    expect(choiceIconForText("쿠키 나눠 먹기 Share cookies")).toBe("actionShare");
    expect(choiceIconForText("고마워 하기 Say thank you")).toBe("actionThanks");
    expect(choiceIconForText("숨바꼭질하기 Hide and seek")).toBe("actionHide");
    expect(choiceIconForText("응원하기 Cheer up")).toBe("actionCheer");
  });
});
