// "계속 나온 단어" 뽑기 + 느슨한 발음 비교. 순수 함수만 모아 두어 테스트하기 쉽게 한다.
// 새 AI 호출은 없다. 이미 저장된 StoryBook(편마다의 analysis·words)만 다시 읽는다.

export const MAX_RECURRING_WORDS = 5;

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeTerm(value) {
  return String(value || "").trim();
}

/**
 * 한 편(chapter) 안에서 "이 단어를 봤다"고 칠 수 있는 한국어 표현을 모두 모은다.
 * - 등장인물·사물은 우선순위 판정에도 쓰이므로 따로 들고 있는다.
 * - 쪽마다의 words[].ko도 더한다(사물·인물이 아니어도 반복되면 단골 단어가 될 수 있다).
 * @param {import('./story-types.js').StoryChapter} chapter
 */
function chapterTermPool(chapter) {
  const characters = (chapter.analysis?.characters || []).map(normalizeTerm).filter(Boolean);
  const objects = (chapter.analysis?.objects || []).map(normalizeTerm).filter(Boolean);
  const wordTerms = [];
  (chapter.story?.pages || []).forEach((page) => {
    (page.words || []).forEach((word) => {
      const ko = normalizeTerm(word.ko);
      if (ko) wordTerms.push(ko);
    });
  });
  return {
    priorityTerms: [...characters, ...objects],
    allTerms: [...characters, ...objects, ...wordTerms]
  };
}

/**
 * 한쪽이 다른 쪽을 포함하면 "같은 단어를 가리킨다"고 본다.
 * 예: 후보 "물고기"는 인물 목록의 "노란 물고기"에도 들어 있으니 나온 것으로 친다.
 * @param {string[]} terms
 * @param {string} ko
 */
function poolMentions(terms, ko) {
  const target = normalizeTerm(ko);
  if (!target) return false;
  return terms.some((term) => term && (term.includes(target) || target.includes(term)));
}

/**
 * 책 전체에서 서로 다른 두 편 이상에 나온 단어를 최대 5개까지 뽑는다.
 * 편이 하나뿐이면(반복이 있을 수 없으므로) 빈 배열을 돌려준다.
 * @param {import('./story-types.js').StoryBook | null} book
 * @returns {import('./story-types.js').StoryWord[]}
 */
export function getRecurringWords(book) {
  if (!book || !Array.isArray(book.chapters) || book.chapters.length < 2) return [];

  const pools = book.chapters.map(chapterTermPool);

  /** @type {Map<string, {ko: string, en: string, order: number, priority: boolean}>} */
  const candidates = new Map();
  book.chapters.forEach((chapter, chapterIndex) => {
    const { priorityTerms } = pools[chapterIndex];
    (chapter.story?.pages || []).forEach((page, pageIndex) => {
      (page.words || []).forEach((word, wordIndex) => {
        const ko = normalizeTerm(word.ko);
        const en = normalizeTerm(word.en);
        if (!ko || !en) return;
        const key = en.toLowerCase();
        if (candidates.has(key)) return;
        candidates.set(key, {
          ko,
          en,
          order: chapterIndex * 1000 + pageIndex * 10 + wordIndex,
          priority: poolMentions(priorityTerms, ko)
        });
      });
    });
  });

  const recurring = [];
  candidates.forEach((candidate) => {
    let count = 0;
    let priority = candidate.priority;
    pools.forEach(({ allTerms, priorityTerms }) => {
      if (poolMentions(allTerms, candidate.ko)) count += 1;
      if (poolMentions(priorityTerms, candidate.ko)) priority = true;
    });
    if (count >= 2) recurring.push({ ...candidate, count, priority });
  });

  recurring.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.priority !== a.priority) return Number(b.priority) - Number(a.priority);
    return a.order - b.order;
  });

  return recurring.slice(0, MAX_RECURRING_WORDS).map(({ ko, en }) => ({ ko, en }));
}

/**
 * 비교용으로 소문자화하고 공백·문장부호를 지운다.
 * @param {string} text
 */
export function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, "")
    .replace(/\s+/g, "");
}

/**
 * 두 문자열 사이의 레벤슈타인 거리(글자를 몇 번 바꿔야 같아지는지).
 * @param {string} a
 * @param {string} b
 */
function levenshteinDistance(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let col = 1; col < cols; col += 1) distances[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      if (a[row - 1] === b[col - 1]) {
        distances[row][col] = distances[row - 1][col - 1];
      } else {
        distances[row][col] = 1 + Math.min(distances[row - 1][col], distances[row][col - 1], distances[row - 1][col - 1]);
      }
    }
  }
  return distances[rows - 1][cols - 1];
}

/**
 * 아이가 따라 말한 문장을 목표 단어와 느슨하게 비교한다.
 * 정확히 같거나, 한쪽이 다른 쪽을 포함하거나, 글자 차이가 2 이하면 성공으로 본다.
 * 점수·정확도는 계산하지 않는다 — 맞았는지 아닌지만 돌려준다.
 * @param {string} target 목표 영어 단어
 * @param {string} transcript 인식된 문장
 */
export function isCloseMatch(target, transcript) {
  const a = normalizeForMatch(target);
  const b = normalizeForMatch(transcript);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return levenshteinDistance(a, b) <= 2;
}

/**
 * 발음해본 단어에 도장을 남긴다. 영어 단어만, 소문자로, 중복 없이 저장한다.
 * @param {import('./story-types.js').StoryBook} book
 * @param {string} enWord
 * @returns {import('./story-types.js').StoryBook}
 */
export function markPracticed(book, enWord) {
  if (!book) return book;
  const key = normalizeForMatch(enWord);
  if (!key) return book;
  const wordKey = normalizeTerm(enWord).toLowerCase();
  const existing = Array.isArray(book.practiced) ? book.practiced : [];
  if (existing.includes(wordKey)) return book;
  return { ...book, practiced: [...existing, wordKey] };
}

/**
 * @param {import('./story-types.js').StoryBook | null} book
 * @param {string} enWord
 */
export function isPracticed(book, enWord) {
  if (!book || !Array.isArray(book.practiced)) return false;
  return book.practiced.includes(normalizeTerm(enWord).toLowerCase());
}
