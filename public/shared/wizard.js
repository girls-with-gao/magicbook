// 단계 전환 규칙.

/** @typedef {"home"|"upload"|"friends"|"relayRead"|"review"|"language"|"story"|"offline"|"shelf"|"book"|"parent"} WizardStage */

/** @type {Record<WizardStage, WizardStage[]>} */
const transitions = {
  home: ["upload", "friends", "shelf"],
  upload: ["home", "review", "book", "parent"],
  friends: ["home", "relayRead", "parent"],
  relayRead: ["friends", "upload", "parent"],
  review: ["upload", "language", "parent"],
  language: ["review", "story", "parent"],
  story: ["language", "offline", "parent"],
  offline: ["upload", "shelf", "book", "parent"],
  shelf: ["home", "upload", "book", "parent"],
  book: ["upload", "shelf", "parent"],
  parent: ["book", "offline", "shelf", "home", "upload"]
};

/**
 * @param {WizardStage} current
 * @param {WizardStage} next
 * @returns {WizardStage}
 */
export function transitionStage(current, next) {
  return transitions[current]?.includes(next) ? next : current;
}
