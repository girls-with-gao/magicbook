import { MAX_CHAPTERS, type StoryBook, type StoryChapter } from "./story-types";

export const BOOK_STORAGE_KEY = "drawtale.book.v1";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SaveResult = { ok: true } | { ok: false; message: string };

function isBook(value: unknown): value is StoryBook {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<StoryBook>;
  return (
    typeof book.id === "string" &&
    typeof book.nickname === "string" &&
    typeof book.age === "number" &&
    Array.isArray(book.chapters)
  );
}

export function loadBook(storage: KeyValueStorage): StoryBook | null {
  try {
    const raw = storage.getItem(BOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBook(parsed) ? { ...parsed, chapters: parsed.chapters.slice(0, MAX_CHAPTERS) } : null;
  } catch {
    return null;
  }
}

export function saveBook(storage: KeyValueStorage, book: StoryBook): SaveResult {
  try {
    storage.setItem(BOOK_STORAGE_KEY, JSON.stringify(book));
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "브라우저 저장 공간이 가득 찼어요. 지금 책을 인쇄·PDF로 저장한 뒤 새 책을 시작해주세요."
    };
  }
}

export function clearBook(storage: KeyValueStorage) {
  try {
    storage.removeItem(BOOK_STORAGE_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 지울 것도 없다.
  }
}

export function isBookFull(book: StoryBook | null) {
  return Boolean(book && book.chapters.length >= MAX_CHAPTERS);
}

/** 이어 쓸 수 있는 책이면 그 책에, 아니면 새 책에 한 편을 더한다. */
export function appendChapter(
  book: StoryBook | null,
  chapter: StoryChapter,
  meta: Pick<StoryBook, "nickname" | "age" | "language">,
  now = new Date()
): StoryBook {
  if (book && !isBookFull(book)) {
    return { ...book, ...meta, chapters: [...book.chapters, chapter] };
  }
  return {
    id: `book-${now.getTime()}`,
    ...meta,
    chapters: [chapter],
    createdAt: now.toISOString()
  };
}
