/**
 * @param {import("./story-types.js").DrawingAnalysis} analysis
 * @param {string} preferredDiaryText
 * @returns {import("./story-types.js").DrawingAnalysis}
 */
export function withPreferredDiaryText(analysis, preferredDiaryText) {
  const diaryText = String(preferredDiaryText || "").trim();
  if (!diaryText) return analysis;
  return { ...analysis, diaryText };
}
