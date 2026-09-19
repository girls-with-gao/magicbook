// 쪽마다 배경 삽화 프레이밍(구도)과 글 위치를 정하는 규칙.
// AI가 만드는 이야기 쪽에는 framing/textSide가 없으므로(포커스 좌표만 있음),
// 쪽 번호를 순환하는 고정 패턴으로 정해 서버(삽화 생성 프롬프트)와
// 브라우저(레이아웃 CSS)가 같은 구도를 쓰게 한다.

/** @typedef {"close"|"medium"|"wide"} Framing */
/** @typedef {"left"|"right"} TextSide */

/** @type {{framing: Framing, textSide: TextSide}[]} */
export const compositionDefaults = [
  { framing: "close", textSide: "right" },
  { framing: "wide", textSide: "right" },
  { framing: "medium", textSide: "left" },
  { framing: "wide", textSide: "left" }
];

/**
 * @param {number} index
 * @returns {{framing: Framing, textSide: TextSide}}
 */
export function getPageFraming(index) {
  return compositionDefaults[((index % compositionDefaults.length) + compositionDefaults.length) % compositionDefaults.length];
}

/** 주인공 오려낸 그림을 배치할 위치/크기(%) 값. app.js의 캐릭터 배치 CSS 변수와 짝을 이룬다.
 * @param {Framing} framing
 * @param {TextSide} textSide
 */
export function getCharacterBox(framing, textSide) {
  const byFraming = {
    close: { left: textSide === "left" ? "68%" : "30%", bottom: "5%", width: "58%", height: "78%" },
    medium: { left: textSide === "left" ? "60%" : "32%", bottom: "7%", width: "44%", height: "60%" },
    wide: { left: textSide === "left" ? "70%" : "17%", bottom: "5%", width: "29%", height: "45%" }
  };
  return byFraming[framing] || byFraming.medium;
}
