export type WizardStage = "upload" | "friends" | "review" | "language" | "story" | "offline" | "book";

const transitions: Record<WizardStage, WizardStage[]> = {
  upload: ["review", "book", "friends"],
  friends: ["upload"],
  review: ["upload", "language"],
  language: ["review", "story"],
  story: ["language", "offline"],
  offline: ["upload", "book"],
  book: ["upload"]
};

export function transitionStage(current: WizardStage, next: WizardStage): WizardStage {
  return transitions[current].includes(next) ? next : current;
}
