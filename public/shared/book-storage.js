import { MAX_CHAPTERS } from "./story-types.js";

export const BOOK_STORAGE_KEY = "drawtale.book.v1";
export const BOOK_LIBRARY_STORAGE_KEY = "drawtale.book-library.v1";

/** @typedef {Pick<Storage, "getItem"|"setItem"|"removeItem">} KeyValueStorage */
/** @typedef {{ok: true} | {ok: false, message: string}} SaveResult */

/**
 * @param {unknown} value
 * @returns {value is import('./story-types.js').StoryBook}
 */
function isBook(value) {
  if (!value || typeof value !== "object") return false;
  const book = /** @type {Partial<import('./story-types.js').StoryBook>} */ (value);
  return (
    typeof book.id === "string" &&
    typeof book.nickname === "string" &&
    typeof book.age === "number" &&
    Array.isArray(book.chapters)
  );
}

/**
 * @param {KeyValueStorage} storage
 * @returns {import('./story-types.js').StoryBook | null}
 */
export function loadBook(storage) {
  try {
    const raw = storage.getItem(BOOK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isBook(parsed) ? { ...parsed, chapters: parsed.chapters.slice(0, MAX_CHAPTERS) } : null;
  } catch {
    return null;
  }
}

/**
 * @param {KeyValueStorage} storage
 * @returns {import('./story-types.js').StoryBook[]}
 */
export function loadBookLibrary(storage) {
  try {
    const raw = storage.getItem(BOOK_LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isBook)
      .map((book) => ({ ...book, chapters: book.chapters.slice(0, MAX_CHAPTERS) }))
      .sort((a, b) => bookTime(b) - bookTime(a));
  } catch {
    return [];
  }
}

/**
 * @param {import('./story-types.js').StoryBook} book
 */
function bookTime(book) {
  const value = Date.parse(book.updatedAt || book.createdAt);
  return Number.isFinite(value) ? value : 0;
}

/**
 * @param {KeyValueStorage} storage
 * @param {import('./story-types.js').StoryBook} book
 */
function saveBookToLibrary(storage, book) {
  const library = loadBookLibrary(storage);
  const nextBook = { ...book, updatedAt: book.updatedAt || new Date().toISOString() };
  const next = [nextBook, ...library.filter((item) => item.id !== book.id)]
    .sort((a, b) => bookTime(b) - bookTime(a))
    .slice(0, 24);
  storage.setItem(BOOK_LIBRARY_STORAGE_KEY, JSON.stringify(next));
}

/**
 * @param {KeyValueStorage} storage
 * @param {import('./story-types.js').StoryBook} book
 * @returns {SaveResult}
 */
export function saveBook(storage, book) {
  try {
    const bookToSave = { ...book, updatedAt: book.updatedAt || new Date().toISOString() };
    storage.setItem(BOOK_STORAGE_KEY, JSON.stringify(bookToSave));
    saveBookToLibrary(storage, bookToSave);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "브라우저 저장 공간이 가득 찼어요. 지금 책을 인쇄·PDF로 저장한 뒤 새 책을 시작해주세요."
    };
  }
}

/**
 * @param {KeyValueStorage} storage
 */
export function clearBook(storage) {
  try {
    storage.removeItem(BOOK_STORAGE_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 지울 것도 없다.
  }
}

/**
 * @param {import('./story-types.js').StoryBook | null} book
 */
export function isBookFull(book) {
  return Boolean(book && book.chapters.length >= MAX_CHAPTERS);
}

/** 이어 쓸 수 있는 책이면 그 책에, 아니면 새 책에 한 편을 더한다.
 * @param {import('./story-types.js').StoryBook | null} book
 * @param {import('./story-types.js').StoryChapter} chapter
 * @param {Pick<import('./story-types.js').StoryBook, "nickname"|"age"|"language">} meta
 * @param {Date} [now]
 * @returns {import('./story-types.js').StoryBook}
 */
export function appendChapter(book, chapter, meta, now = new Date()) {
  // 친구 이야기에서 시작한 책은 누가 어느 편을 썼는지 남긴다.
  const authored = book?.origin ? { ...chapter, author: meta.nickname } : chapter;
  if (book && !isBookFull(book)) {
    return { ...book, ...meta, chapters: [...book.chapters, authored], updatedAt: now.toISOString() };
  }
  // 책이 다 차면 새 책을 시작한다. 친구 이야기 표시는 이어가지 않는다.
  return {
    id: `book-${now.getTime()}`,
    ...meta,
    chapters: [chapter],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}
