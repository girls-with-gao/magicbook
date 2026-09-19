// 단계 전환 규칙.

/** @typedef {"upload"|"friends"|"review"|"language"|"story"|"offline"|"book"|"parent"} WizardStage */

/** @type {Record<WizardStage, WizardStage[]>} */
const transitions = {
  upload: ["review", "book", "friends"],
  friends: ["upload"],
  review: ["upload", "language"],
  language: ["review", "story"],
  story: ["language", "offline"],
  offline: ["upload", "book", "parent"],
  book: ["upload", "parent"],
  parent: ["book", "offline", "upload"]
};

/**
 * @param {WizardStage} current
 * @param {WizardStage} next
 * @returns {WizardStage}
 */
export function transitionStage(current, next) {
  return transitions[current].includes(next) ? next : current;
}
