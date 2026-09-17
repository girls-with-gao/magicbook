import { MAX_CHAPTERS, type PreviousChapter } from "./story-types";

export function parsePreviousChapters(value: unknown): PreviousChapter[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is PreviousChapter =>
        Boolean(item) && typeof item.titleKo === "string" && typeof item.summaryKo === "string"
    )
    .slice(0, MAX_CHAPTERS - 1)
    .map((item) => ({ titleKo: item.titleKo.trim().slice(0, 80), summaryKo: item.summaryKo.trim().slice(0, 300) }));
}
