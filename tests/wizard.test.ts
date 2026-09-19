import { describe, expect, it } from "vitest";
import { transitionStage, type WizardStage } from "../public/shared/wizard.js";

describe("transitionStage", () => {
  it.each<[WizardStage, WizardStage]>([
    ["home", "upload"],
    ["home", "friends"],
    ["home", "shelf"],
    ["upload", "review"],
    ["review", "language"],
    ["language", "story"],
    ["story", "offline"],
    ["upload", "home"],
    ["review", "upload"],
    ["language", "review"],
    ["story", "language"],
    ["offline", "upload"],
    ["offline", "book"],
    ["offline", "shelf"],
    ["upload", "book"],
    ["book", "upload"],
    ["book", "shelf"],
    ["shelf", "home"],
    ["shelf", "upload"],
    ["shelf", "book"],
    ["friends", "home"],
    ["friends", "relayRead"],
    ["relayRead", "friends"],
    ["relayRead", "upload"],
    ["offline", "parent"],
    ["book", "parent"],
    ["shelf", "parent"],
    ["parent", "book"],
    ["parent", "shelf"],
    ["parent", "home"]
  ])("%s에서 %s(으)로 이동한다", (from, to) => {
    expect(transitionStage(from, to)).toBe(to);
  });

  it.each<[WizardStage, WizardStage]>([
    ["upload", "story"],
    ["upload", "offline"],
    ["home", "story"],
    ["home", "parent"],
    ["review", "offline"],
    ["offline", "story"],
    ["book", "story"],
    ["friends", "review"],
    ["friends", "upload"],
    ["relayRead", "review"],
    ["review", "friends"],
    ["shelf", "story"]
  ])("허용되지 않은 %s→%s 이동은 현재 단계를 유지한다", (from, to) => {
    expect(transitionStage(from, to)).toBe(from);
  });
});
