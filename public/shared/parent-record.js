import { withParticle } from "./korean.js";

/**
 * @param {string[]} values
 * @param {number} [limit]
 */
function uniqueValues(values, limit = Infinity) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].slice(0, limit);
}

/**
 * @param {import('./story-types.js').StoryBook} book
 */
export function buildParentRecord(book) {
  const chapters = book.chapters || [];
  const choices = chapters.map((chapter) => chapter.story.choice).filter(Boolean);
  const last = chapters.at(-1);
  const lastChoice = last?.story.choice || choices.at(-1);
  const nameTopic = withParticle(book.nickname, "이는", "는");
  const choiceMode = lastChoice?.byVoice ? "말로 남기며" : "고르며";
  const childNames = new Set(
    [book.nickname, `${book.nickname}이`, `${book.nickname}는`, book.origin?.authorName, `${book.origin?.authorName || ""}이`]
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  );
  const focusItems = uniqueValues(
    chapters.flatMap((chapter) => [
      ...chapter.analysis.characters.filter((character) => !childNames.has(character)),
      chapter.analysis.place,
      ...chapter.analysis.objects
    ]),
    6
  );
  const atmosphere = uniqueValues(chapters.map((chapter) => chapter.analysis.mood));
  const practicedCount = book.practiced?.length || 0;

  return {
    disclaimer: "아이의 마음을 단정하지 않고, 오늘 이야기에서 보인 선택과 표현만 정리했어요.",
    observation: lastChoice
      ? `${nameTopic} “${lastChoice.ko}”를 ${choiceMode} 이야기를 이어갔어요.`
      : `${nameTopic} ${chapters.length}편의 이야기를 만들었어요.`,
    statCards: [
      { label: "함께 만든 이야기", value: `${chapters.length}편` },
      { label: "아이의 선택", value: `${choices.length}번` },
      { label: "말해본 단어", value: `${practicedCount}개` }
    ],
    atmosphere,
    followUpQuestion: last?.story.offlinePromptKo || "오늘 만든 이야기에서 어떤 장면이 제일 기억나?",
    focusItems,
    episodes: chapters.map((chapter, index) => ({
      number: index + 1,
      title: chapter.story.titleKo,
      choice: chapter.story.choice || null,
      note: chapter.story.parentNoteKo || "",
      mood: chapter.analysis.mood || ""
    }))
  };
}
