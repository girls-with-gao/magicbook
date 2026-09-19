// 단계 전환 규칙.

/** @typedef {"upload"|"friends"|"review"|"language"|"story"|"offline"|"book"|"parent"} WizardStage */

/** @type {Record<WizardStage, WizardStage[]>} */
const transitions = {
  upload: ["review", "book", "friends", "parent"],
  friends: ["upload", "parent"],
  review: ["upload", "language", "parent"],
  language: ["review", "story", "parent"],
  story: ["language", "offline", "parent"],
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
