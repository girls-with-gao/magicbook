import { MAX_CHAPTERS, OPENING_PAGES } from "./story-types.js";
import { withParticle, withParticle as childNameWithParticle } from "./korean.js";

/** @type {import('./story-types.js').DrawingAnalysis} */
export const demoAnalysis = {
  characters: ["수민이", "엄마"],
  place: "바닷가",
  objects: ["반짝이는 조개", "파도"],
  mood: "신나고 궁금한 기분",
  diaryText: "오늘 엄마와 바닷가에서 반짝이는 조개를 찾았다."
};

/** @type {import('./story-types.js').DrawingAnalysis[]} */
const demoAnalyses = [
  demoAnalysis,
  {
    characters: ["수민이", "노란 물고기"],
    place: "조개 속 바다 마을",
    objects: ["꺼진 등불", "작은 집들"],
    mood: "궁금하고 조금 걱정되는 기분",
    diaryText: "조개 속에 바다 마을이 있었다. 물고기 친구를 만났다."
  },
  {
    characters: ["수민이", "노란 물고기", "해파리"],
    place: "깊은 바닷속",
    objects: ["빛나는 해파리", "산호"],
    mood: "두근두근한 기분",
    diaryText: "깊은 바다에서 반짝이는 해파리를 만났다."
  },
  {
    characters: ["수민이", "물고기들", "해파리"],
    place: "환해진 바다 마을",
    objects: ["켜진 등불", "빛 조각"],
    mood: "기쁘고 뿌듯한 기분",
    diaryText: "바다 마을에 불이 다시 켜졌다. 다 같이 춤을 췄다."
  }
];

/**
 * @param {number} chapter
 */
function chapterIndex(chapter) {
  return Math.min(MAX_CHAPTERS, Math.max(1, Math.round(chapter) || 1)) - 1;
}

/**
 * @param {number} [chapter]
 * @returns {import('./story-types.js').DrawingAnalysis}
 */
export function demoAnalysisFor(chapter = 1) {
  return demoAnalyses[chapterIndex(chapter)];
}

/**
 * @param {number} [chapter]
 */
export function demoSampleImagePath(chapter = 1) {
  const index = chapterIndex(chapter);
  return index === 0 ? "/sample-drawing.svg" : `/sample-drawing-${index + 1}.svg`;
}

/**
 * @param {{nickname?: string, age?: number, chapter?: number}} params
 * @returns {import('./story-types.js').BilingualStory}
 */
export function createDemoStory({ nickname = "수민", age: _age = 7, chapter = 1 } = {}) {
  const name = nickname.trim() || "아이";
  const nameAnd = childNameWithParticle(name, "이와", "와");
  const nameTopic = childNameWithParticle(name, "이는", "는");

  const chapters = [
    {
      titleKo: `${nameAnd} 조개의 비밀`,
      titleEn: `${name} and the Secret Shell`,
      pages: [
        {
          ko: `${nameTopic} 엄마와 바닷가에 갔어요. 파도가 반짝반짝 웃고 있었어요.`,
          en: `${name} went to the beach with Mom. The waves sparkled and smiled.`,
          words: [
            { ko: "바닷가", en: "beach" },
            { ko: "파도", en: "wave" }
          ],
          focus: { x: 50, y: 50 }
        },
        {
          ko: `${nameTopic} 모래 사이에서 반짝이는 조개를 발견했어요.`,
          en: `${name} found a shiny shell in the sand.`,
          words: [
            { ko: "조개", en: "shell" },
            { ko: "반짝이는", en: "shiny" }
          ],
          focus: { x: 32, y: 62 }
        },
        {
          ko: "귀에 가까이 대자, 조개 속에서 작은 바다 노래가 들렸어요.",
          en: "A tiny sea song came from inside the shell.",
          words: [
            { ko: "노래", en: "song" },
            { ko: "듣다", en: "listen" }
          ],
          focus: { x: 68, y: 44 }
        },
        {
          ko: `조개는 ${name}에게 속삭였어요. “나의 다음 이야기를 그려줄래?”`,
          en: `The shell whispered, "Will you draw my next story?"`,
          words: [
            { ko: "속삭이다", en: "whisper" },
            { ko: "그리다", en: "draw" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "조개 안에는 어떤 세상이 있을까요? 다음 장면을 종이에 그려보세요.",
      offlinePromptEn: "What world is inside the shell? Draw the next scene on paper.",
      summaryKo: `${nameTopic} 엄마와 바닷가에서 노래하는 조개를 찾았다. 조개가 다음 이야기를 그려 달라고 속삭였다.`
    },
    {
      titleKo: "조개 속 바다 마을",
      titleEn: "The Sea Village in the Shell",
      pages: [
        {
          ko: `${nameTopic} 조개 속으로 쏙 들어갔어요. 그곳엔 작은 바다 마을이 있었어요.`,
          en: `${name} slipped into the shell and found a tiny sea village.`,
          words: [
            { ko: "조개", en: "shell" },
            { ko: "마을", en: "village" }
          ],
          focus: { x: 50, y: 55 }
        },
        {
          ko: "노란 물고기 ‘방울이’가 반갑게 인사했어요.",
          en: "A yellow fish named Bubbles said hello.",
          words: [
            { ko: "물고기", en: "fish" },
            { ko: "노란", en: "yellow" }
          ],
          focus: { x: 30, y: 45 }
        },
        {
          ko: "방울이는 마을의 등불이 모두 꺼져서 걱정이라고 했어요.",
          en: "Bubbles was worried because all the village lights went out.",
          words: [
            { ko: "등불", en: "light" },
            { ko: "걱정", en: "worry" }
          ],
          focus: { x: 66, y: 50 }
        },
        {
          ko: `${nameTopic} 씩씩하게 말했어요. “내가 빛을 찾아볼게!”`,
          en: `${name} said bravely, "I will find the light!"`,
          words: [
            { ko: "찾다", en: "find" },
            { ko: "씩씩한", en: "brave" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "마을의 빛은 어디에 숨어 있을까요? 빛을 찾으러 가는 장면을 그려보세요.",
      offlinePromptEn: "Where is the village light hiding? Draw the scene where you go to find it.",
      summaryKo: `${nameTopic} 조개 속 바다 마을에서 물고기 방울이를 만났다. 꺼진 마을 등불을 되찾아 주기로 약속했다.`
    },
    {
      titleKo: "외로운 해파리의 선물",
      titleEn: "The Lonely Jellyfish's Gift",
      pages: [
        {
          ko: `${nameAnd} 방울이는 깊은 바닷속으로 내려갔어요.`,
          en: `${name} and Bubbles swam deep into the sea.`,
          words: [
            { ko: "깊은", en: "deep" },
            { ko: "바다", en: "sea" }
          ],
          focus: { x: 40, y: 40 }
        },
        {
          ko: "산호 뒤에서 해파리가 혼자 반짝이고 있었어요.",
          en: "Behind the coral, a jellyfish glowed all alone.",
          words: [
            { ko: "산호", en: "coral" },
            { ko: "해파리", en: "jellyfish" }
          ],
          focus: { x: 62, y: 45 }
        },
        {
          ko: "“나랑 친구 해 줄래?” 해파리가 수줍게 물었어요.",
          en: '"Will you be my friend?" the jellyfish asked shyly.',
          words: [
            { ko: "친구", en: "friend" },
            { ko: "수줍은", en: "shy" }
          ],
          focus: { x: 60, y: 35 }
        },
        {
          ko: "해파리는 고맙다며 빛 한 조각을 나눠 주었어요.",
          en: "To say thank you, the jellyfish shared a piece of its light.",
          words: [
            { ko: "나누다", en: "share" },
            { ko: "고마워", en: "thank you" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "나눠 받은 빛으로 바다 마을을 어떻게 밝혀 줄까요? 그 장면을 그려보세요.",
      offlinePromptEn: "How will you light up the sea village with the gift? Draw that scene.",
      summaryKo: "깊은 바닷속에서 외로운 해파리와 친구가 되었다. 해파리가 마을을 밝힐 빛 한 조각을 나눠 주었다."
    },
    {
      titleKo: "다시 환해진 바다 마을",
      titleEn: "The Sea Village Shines Again",
      pages: [
        {
          ko: `${nameTopic} 빛 조각을 마을 한가운데에 살며시 올려 두었어요.`,
          en: `${name} gently placed the piece of light in the middle of the village.`,
          words: [
            { ko: "가운데", en: "middle" },
            { ko: "살며시", en: "gently" }
          ],
          focus: { x: 50, y: 55 }
        },
        {
          ko: "마을의 등불이 하나둘 반짝 켜졌어요.",
          en: "One by one, the village lights turned on.",
          words: [
            { ko: "켜지다", en: "turn on" },
            { ko: "하나둘", en: "one by one" }
          ],
          focus: { x: 35, y: 45 }
        },
        {
          ko: "물고기들과 해파리가 다 함께 춤을 추었어요.",
          en: "The fish and the jellyfish danced together.",
          words: [
            { ko: "춤", en: "dance" },
            { ko: "함께", en: "together" }
          ],
          focus: { x: 65, y: 50 }
        },
        {
          ko: `${nameTopic} 엄마에게 돌아와 오늘의 모험을 들려주었어요. 끝.`,
          en: `${name} came back to Mom and told her about the adventure. The end.`,
          words: [
            { ko: "모험", en: "adventure" },
            { ko: "끝", en: "the end" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "오늘 완성한 책의 표지를 종이에 그려볼까요?",
      offlinePromptEn: "Can you draw the cover of your finished book on paper?",
      summaryKo: "빛 조각으로 바다 마을을 다시 밝혔다. 모두 함께 춤을 추고, 엄마에게 돌아와 모험 이야기를 들려주었다."
    }
  ];

  return chapters[chapterIndex(chapter)];
}

/** @typedef {{questionKo: string, questionEn: string, choices: import('./story-types.js').StoryChoice[]}} DemoBranch */

/** 편마다 2페이지 뒤에 나오는 갈림길. 첫 번째 카드가 원래 예제 이야기로 이어진다.
 * @type {DemoBranch[]} */
const demoBranches = [
  {
    questionKo: "반짝이는 조개에게 무엇을 해볼까?",
    questionEn: "What should we do with the shiny shell?",
    choices: [
      { emoji: "👂", ko: "조개 소리 들어보기", en: "Listen to the shell", iconKey: "listen" },
      { emoji: "🎵", ko: "조개에게 노래 불러주기", en: "Sing to the shell", iconKey: "sing" },
      { emoji: "👋", ko: "조개에게 인사하기", en: "Say hello to the shell", iconKey: "hello" }
    ]
  },
  {
    questionKo: "방울이와 무엇을 해볼까?",
    questionEn: "What should we do with Bubbles?",
    choices: [
      { emoji: "🏠", ko: "마을 구경하기", en: "Look around the village", iconKey: "lookAround" },
      { emoji: "🫧", ko: "같이 헤엄치기", en: "Swim together", iconKey: "together" },
      { emoji: "🎁", ko: "선물 주기", en: "Give a present", iconKey: "gift" }
    ]
  },
  {
    questionKo: "혼자 있는 해파리에게 어떻게 할까?",
    questionEn: "What should we do for the lonely jellyfish?",
    choices: [
      { emoji: "🤝", ko: "친구 하자고 하기", en: "Ask to be friends", iconKey: "friend" },
      { emoji: "🎶", ko: "같이 노래하기", en: "Sing together", iconKey: "singTogether" },
      { emoji: "🐟", ko: "방울이 소개하기", en: "Introduce Bubbles", iconKey: "introduce" }
    ]
  },
  {
    questionKo: "이야기를 어떻게 끝낼까?",
    questionEn: "How should we end the story?",
    choices: [
      { emoji: "💃", ko: "다 같이 춤추기", en: "Dance together", iconKey: "dance" },
      { emoji: "🎁", ko: "선물 주고 인사하기", en: "Give a gift and say bye", iconKey: "gift" },
      { emoji: "🌙", ko: "다 같이 잠들기", en: "Fall asleep together", iconKey: "sleep" }
    ]
  }
];

/**
 * @param {{nickname?: string, age?: number, chapter?: number}} params
 * @returns {import('./story-types.js').StoryOpening}
 */
export function createDemoOpening({ nickname = "수민", age = 7, chapter = 1 } = {}) {
  const full = createDemoStory({ nickname, age, chapter });
  return {
    titleKo: full.titleKo,
    titleEn: full.titleEn,
    pages: full.pages.slice(0, OPENING_PAGES),
    ...demoBranches[chapterIndex(chapter)]
  };
}

/**
 * @param {{nickname?: string, age?: number, chapter?: number, choice: import('./story-types.js').ChildChoice}} params
 * @returns {import('./story-types.js').StoryEnding}
 */
export function createDemoEnding({ nickname = "수민", age = 7, chapter = 1, choice }) {
  const name = nickname.trim() || "아이";
  const full = createDemoStory({ nickname, age, chapter });
  const [canonicalPage, lastPage] = full.pages.slice(OPENING_PAGES);
  const canonical = demoBranches[chapterIndex(chapter)].choices[0];
  /**
   * @param {import('./story-types.js').StoryPage[]} pages
   * @param {string} summaryKo
   * @returns {import('./story-types.js').StoryEnding}
   */
  const endingOf = (pages, summaryKo, parentNoteKo) => ({
    pages,
    offlinePromptKo: full.offlinePromptKo,
    offlinePromptEn: full.offlinePromptEn,
    summaryKo,
    parentNoteKo
  });

  if (!choice.byVoice && choice.ko === canonical.ko) {
    return endingOf(
      [canonicalPage, lastPage],
      full.summaryKo,
      `${withParticle(name, "이는", "는")} 카드 중에서 “${choice.ko}”를 골랐어요. 궁금한 것을 먼저 확인해 보는 모습이었어요.`
    );
  }

  const nameTopic = childNameWithParticle(name, "이는", "는");
  const choicePage = {
    ko: `“${choice.ko}!” ${nameTopic} 마음을 정했어요. 모두가 활짝 웃었어요.`,
    en: choice.en
      ? `"${choice.en}!" ${name} decided, and everyone smiled.`
      : `${name} shared a wonderful idea, and everyone smiled.`,
    words: [
      { ko: "정하다", en: "decide" },
      { ko: "웃다", en: "smile" }
    ],
    focus: canonicalPage.focus
  };
  return endingOf(
    [choicePage, lastPage],
    `${full.summaryKo} ${name}의 선택: ${choice.ko}.`,
    choice.byVoice
      ? `${withParticle(name, "이가", "가")} 직접 “${choice.ko}”라고 말했어요. 자기 생각을 먼저 말로 꺼내 보았어요.`
      : `${withParticle(name, "이가", "가")} “${choice.ko}”를 골랐어요. 이야기를 자기 방향으로 끌고 갔어요.`
  );
}
