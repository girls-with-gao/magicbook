import { describe, expect, it } from "vitest";
import { transitionStage, type WizardStage } from "../public/shared/wizard.js";

describe("transitionStage", () => {
  it.each<[WizardStage, WizardStage]>([
    ["upload", "review"],
    ["review", "language"],
    ["language", "story"],
    ["story", "offline"],
    ["review", "upload"],
    ["language", "review"],
    ["story", "language"],
    ["offline", "upload"],
    ["offline", "book"],
    ["upload", "book"],
    ["book", "upload"],
    ["upload", "friends"],
    ["friends", "upload"]
  ])("%s에서 %s(으)로 이동한다", (from, to) => {
    expect(transitionStage(from, to)).toBe(to);
  });

  it.each<[WizardStage, WizardStage]>([
    ["upload", "story"],
    ["upload", "offline"],
    ["review", "offline"],
    ["offline", "story"],
    ["book", "story"],
    ["friends", "review"],
    ["review", "friends"]
  ])("허용되지 않은 %s→%s 이동은 현재 단계를 유지한다", (from, to) => {
    expect(transitionStage(from, to)).toBe(from);
  });
});
