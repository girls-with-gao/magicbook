export type WizardStage = "upload" | "review" | "language" | "story" | "offline";

const transitions: Record<WizardStage, WizardStage[]> = {
  upload: ["review"],
  review: ["upload", "language"],
  language: ["review", "story"],
  story: ["language", "offline"],
  offline: []
};

export function transitionStage(current: WizardStage, next: WizardStage): WizardStage {
  return transitions[current].includes(next) ? next : current;
}
