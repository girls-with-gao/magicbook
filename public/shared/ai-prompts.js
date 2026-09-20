import { CHOICE_COUNT, MAX_CHAPTERS, OPENING_PAGES, STORY_PAGES } from "./story-types.js";
import { choiceIconKeyOptions } from "./design-copy.js";

/**
 * @param {{nickname: string, age: number}} params
 */
export function buildAnalysisPrompt({ nickname, age }) {
  return `
You analyze one child's drawing diary for a parent-assisted creative storytelling app.
The child uses the nickname "${nickname}" and is ${age} years old.

Safely inspect the drawing and handwriting. Never identify a real person or infer sensitive traits.
Return only a JSON object with these exact fields:
{
  "characters": ["string"],
  "place": "string",
  "objects": ["string"],
  "mood": "string",
  "diaryText": "string"
}

Use Korean. For unclear handwriting, write only the readable portion without inventing details.
If there is no handwriting at all, return "" for diaryText. Never invent a diary sentence.
Describe what is actually drawn. Do not add objects, places, or moods that are not visible in the drawing.
`.trim();
}

/**
 * @param {import('./story-types.js').PreviousChapter[]} previousChapters
 */
function buildContinuationSection(previousChapters) {
  if (!previousChapters.length) return "";
  const chapterNumber = previousChapters.length + 1;
  const history = previousChapters.map((chapter, index) => `${index + 1}. ${chapter.titleKo} — ${chapter.summaryKo}`).join("\n");
  const ending =
    chapterNumber >= MAX_CHAPTERS
      ? `
- This is the final chapter: resolve the adventure warmly and end the last page with "끝." and "The end."
- The offline drawing prompt should invite the child to draw the cover of this book on paper.`
      : "";
  return `
This is chapter ${chapterNumber} of ${MAX_CHAPTERS} in the same picture book.
Previous chapters:
${history}

Continuation rules:
- Keep the same characters, names, and world, and continue naturally from the last chapter.
- The new drawing is the child's idea for the next scene; weave its content in as what happens next.${ending}
`;
}

const pageJson = `{
      "ko": "string",
      "en": "string",
      "visualDescription": "one concise English description of only the visible scene for the illustrator; describe the exact action, characters, setting, and relevant objects from this page, without quoting or drawing any words",
      "words": [{ "ko": "string", "en": "string" }],
      "focus": { "x": 50, "y": 50 }
    }`;

/**
 * @param {number} age
 */
function sharedRules(age) {
  return `- Every page must contain matching Korean and English sentences.
- For every page, write visualDescription as a concise, concrete illustration direction that depicts that page's exact action, characters, setting, and relevant objects. It must agree with both story sentences; do not add a different event or prop. Refer to characters by their visual appearance, not by writing their names.
- visualDescription is production guidance only, not text to show or render in the illustration. Describe characters' visible actions and expressions, never dialogue or conversation bubbles. Do not include captions, signs, labels, or any other writing in it.
- Use short, age-appropriate language for a ${age}-year-old; the full ${STORY_PAGES}-page story reads in about 3 minutes.
- Each page may contain at most 2 vocabulary words, paired as Korean and English.
- Preserve the child's imagination; do not claim new artwork was generated.
- Avoid violence, fear, advertising, scoring, streaks, and addictive hooks.
- Focus coordinates are percentages from 0 to 100 and should vary gently by page.`;
}

/** 1단계: 앞 2페이지를 쓰고, 아이가 고를 갈림길 질문과 카드 3장을 만든다.
 * @param {import('./story-types.js').StoryRequest} params
 */
export function buildOpeningPrompt({ nickname, age, analysis, previousChapters = [] }) {
  const finalChapter = previousChapters.length + 1 >= MAX_CHAPTERS;
  const choiceRules = finalChapter
    ? `- This is the last chapter of the book, so the question must ask how to END the story (e.g. "이야기를 어떻게 끝낼까?").
- All ${CHOICE_COUNT} choices must be gentle ways to close the adventure — going home, giving a gift, saying goodbye, falling asleep together — never a new adventure.`
    : `- Ask one very short question a child can answer (Korean and English), e.g. "조개에게 무엇을 해볼까?".
- Offer choices that push the story forward without ending it.`;
  return `
You create a safe, warm, interactive story for a ${age}-year-old child using the nickname "${nickname}".
The child will choose what happens next, so write only the beginning.
Use only this parent-confirmed drawing diary analysis:
${JSON.stringify(analysis)}
${buildContinuationSection(previousChapters)}
Requirements:
- Return exactly ${OPENING_PAGES} pages: pages 1-${OPENING_PAGES} of a ${STORY_PAGES}-page story. Do not resolve anything yet.
- Page ${OPENING_PAGES} must end at a clear decision point for ${nickname}.
${choiceRules}
- Offer exactly ${CHOICE_COUNT} choices. Each choice is one short action phrase (max 12 Korean characters) with one fitting emoji.
- Choices must be clearly different from each other, all kind and safe, and none may be "wrong".
- Every choice must include iconKey, chosen from this exact list only: ${choiceIconKeyOptions}.
- Choose iconKey by the action's meaning, not by matching a word. If no key fits clearly, use "generic".
${sharedRules(age)}

Return only this JSON object:
{
  "titleKo": "string",
  "titleEn": "string",
  "pages": [
    ${pageJson}
  ],
  "questionKo": "string",
  "questionEn": "string",
  "choices": [{ "emoji": "string", "ko": "string", "en": "string", "iconKey": "${choiceIconKeyOptions}" }]
}
`.trim();
}

/** 2단계: 아이가 고른(또는 말한) 선택을 반영해 뒤 2페이지를 쓴다.
 * @param {import('./story-types.js').EndingRequest} params
 */
export function buildEndingPrompt({ nickname, age, analysis, previousChapters = [], opening, choice }) {
  const openingText = opening.pages.map((page, index) => `${index + 1}. ${page.ko} / ${page.en}`).join("\n");
  const source = choice.byVoice
    ? "The child said this idea out loud (speech recognition may contain small errors; keep its intent)"
    : "The child picked this card";
  return `
You continue a safe, warm, interactive story for a ${age}-year-old child using the nickname "${nickname}".
Drawing diary analysis confirmed by a parent:
${JSON.stringify(analysis)}
${buildContinuationSection(previousChapters)}
Story so far — "${opening.titleKo}" / "${opening.titleEn}":
${openingText}

Question asked: ${opening.questionKo}
${source}: "${choice.ko}"${choice.en && choice.en !== choice.ko ? ` / "${choice.en}"` : ""}

Requirements:
- Return exactly ${STORY_PAGES - OPENING_PAGES} pages: pages ${OPENING_PAGES + 1}-${STORY_PAGES}.
- Page ${OPENING_PAGES + 1} must show the child's choice happening, clearly and respectfully. The child's idea is the turning point.
- If the idea is unsafe or unclear, gently turn it into a kind, safe version with the same spirit instead of ignoring it.
- The final page must gently open the ending.
- End with an offline drawing prompt that asks the child to leave the screen and draw the next scene on paper.
${sharedRules(age)}

Return only this JSON object:
{
  "pages": [
    ${pageJson}
  ],
  "offlinePromptKo": "string",
  "offlinePromptEn": "string",
  "summaryKo": "two short Korean sentences summarizing the whole ${STORY_PAGES}-page chapter, including the child's choice",
  "parentNoteKo": "one warm Korean sentence for the parent: what the child's choice showed about them. Observe, never evaluate or score the child."
}
`.trim();
}
