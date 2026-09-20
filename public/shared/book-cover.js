import { MAX_CHAPTERS } from "./story-types.js";

/**
 * @param {string | undefined} value
 */
export function formatCoverDate(value) {
  if (!value) return "날짜 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 없음";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

/**
 * @param {import('./story-types.js').StoryBook} book
 */
export function buildBookCover(book) {
  const first = book.chapters[0];
  const latest = book.chapters.at(-1);
  const count = book.chapters.length;
  return {
    title: first?.story.titleKo || "그림책",
    imageDataUrl: latest?.imageDataUrl || first?.imageDataUrl || "",
    dateLabel: formatCoverDate(book.updatedAt || book.createdAt),
    progressLabel: `${count}/${MAX_CHAPTERS}편`,
    statusLabel: count >= MAX_CHAPTERS ? "완성" : "진행 중",
    ownerLabel: `${book.nickname}의 그림책`
  };
}
