import { MAX_CHAPTERS } from "./story-types.js";

/**
 * @param {unknown} value
 * @returns {import('./story-types.js').PreviousChapter[]}
 */
export function parsePreviousChapters(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => Boolean(item) && typeof item.titleKo === "string" && typeof item.summaryKo === "string")
    .slice(0, MAX_CHAPTERS - 1)
    .map((item) => ({ titleKo: item.titleKo.trim().slice(0, 80), summaryKo: item.summaryKo.trim().slice(0, 300) }));
}
