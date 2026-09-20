import { MAX_CHAPTERS, OPENING_PAGES } from "./story-types.js";
import { withParticle, withParticle as childNameWithParticle } from "./korean.js";

/** @type {import('./story-types.js').DrawingAnalysis} */
export const demoAnalysis = {
  characters: ["수민이", "엄마"],
  place: "여행길",
  objects: ["빨간 자동차", "파란 길"],
  mood: "신나고 들뜬 기분",
  diaryText: "오늘 가족과 신나는 여행을 떠났다."
};

/** @type {import('./story-types.js').DrawingAnalysis[]} */
const demoAnalyses = [
  demoAnalysis,
  {
    characters: ["수민이", "작은 친구"],
    place: "물가와 공원",
    objects: ["큰 나무", "파란 물길"],
    mood: "반갑고 궁금한 기분",
    diaryText: "물가 옆 공원에서 새 친구를 만났다."
  },
  {
    characters: ["수민이", "친구들"],
    place: "강가 끝 상상 놀이공원",
    objects: ["반짝이는 불빛", "빙글빙글 놀이기구"],
    mood: "두근두근 신나는 기분",
    diaryText: "강가 길 끝에서 상상 놀이공원을 발견하고 빙글빙글 놀이기구를 탔다."
  },
  {
    characters: ["수민이", "가족", "친구"],
    place: "집으로 돌아온 길",
    objects: ["노란 옷", "긴 머리 친구"],
    mood: "따뜻하고 뿌듯한 기분",
    diaryText: "집에 돌아와 오늘 여행 이야기를 들려주었다."
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
  return `/sample-trip-${index + 1}.jpeg`;
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
      titleKo: `${nameAnd} 신나는 여행`,
      titleEn: `${name}'s Exciting Trip`,
      pages: [
        {
          ko: `${nameTopic} 가족과 함께 신나는 여행을 떠났어요.`,
          en: `${name} went on an exciting trip with family.`,
          words: [
            { ko: "여행", en: "trip" },
            { ko: "가족", en: "family" }
          ],
          focus: { x: 50, y: 50 }
        },
        {
          ko: "파란 길 위에서 빨간 자동차가 씽씽 달렸어요.",
          en: "A red car zoomed along the blue road.",
          words: [
            { ko: "자동차", en: "car" },
            { ko: "파란", en: "blue" }
          ],
          focus: { x: 48, y: 55 }
        },
        {
          ko: "창밖에는 모르는 길과 큰 하늘이 지나갔어요.",
          en: "Outside the window, a new road and a big sky passed by.",
          words: [
            { ko: "하늘", en: "sky" },
            { ko: "길", en: "road" }
          ],
          focus: { x: 62, y: 34 }
        },
        {
          ko: `${nameTopic} 말했어요. “다음에는 어디로 가볼까?”`,
          en: `${name} said, "Where should we go next?"`,
          words: [
            { ko: "다음", en: "next" },
            { ko: "가다", en: "go" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "여행길 다음에는 어떤 장소가 나올까요? 종이에 그려보세요.",
      offlinePromptEn: "What place comes next on the trip? Draw it on paper.",
      summaryKo: `${nameTopic} 가족과 신나는 여행을 떠났다. 파란 길을 지나며 다음 장소를 상상했다.`
    },
    {
      titleKo: "물가에서 만난 친구",
      titleEn: "A Friend by the Water",
      pages: [
        {
          ko: `${nameTopic} 물가 옆 공원에 도착했어요.`,
          en: `${name} arrived at a park by the water.`,
          words: [
            { ko: "물가", en: "waterside" },
            { ko: "공원", en: "park" }
          ],
          focus: { x: 50, y: 55 }
        },
        {
          ko: "큰 나무 아래에서 작은 친구가 손을 흔들었어요.",
          en: "Under a big tree, a little friend waved hello.",
          words: [
            { ko: "나무", en: "tree" },
            { ko: "친구", en: "friend" }
          ],
          focus: { x: 44, y: 40 }
        },
        {
          ko: "친구는 물길 끝에서 음악 소리와 반짝이는 불빛이 난다고 했어요.",
          en: "The friend said music and twinkling lights came from the end of the water path.",
          words: [
            { ko: "음악", en: "music" },
            { ko: "불빛", en: "light" }
          ],
          focus: { x: 56, y: 58 }
        },
        {
          ko: `${nameTopic} 씩씩하게 말했어요. “같이 불빛을 따라가보자!”`,
          en: `${name} said bravely, "Let's follow the lights together!"`,
          words: [
            { ko: "같이", en: "together" },
            { ko: "따라가다", en: "follow" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "강가 길 끝의 불빛을 따라가면 어떤 신나는 장소가 나올까요? 그 장면을 그려보세요.",
      offlinePromptEn: "What exciting place will appear if you follow the lights at the end of the riverside path? Draw that scene.",
      summaryKo: `${nameTopic} 물가 옆 공원에서 새 친구를 만났다. 강가 길 끝의 불빛과 음악을 따라가기로 했다.`
    },
    {
      titleKo: "강가 끝 놀이공원",
      titleEn: "The Amusement Park by the River",
      pages: [
        {
          ko: `${nameAnd} 친구는 불빛을 따라가 강가 끝 놀이공원에 도착했어요.`,
          en: `${name} and the friend followed the lights to an amusement park by the river.`,
          words: [
            { ko: "강가", en: "riverside" },
            { ko: "놀이공원", en: "amusement park" }
          ],
          focus: { x: 40, y: 40 }
        },
        {
          ko: "빙글빙글 놀이기구가 하늘까지 올라갔어요.",
          en: "A spinning ride went all the way up to the sky.",
          words: [
            { ko: "빙글빙글", en: "spin" },
            { ko: "올라가다", en: "go up" }
          ],
          focus: { x: 60, y: 45 }
        },
        {
          ko: "친구들은 무섭기도 하고 재미있기도 해서 크게 웃었어요.",
          en: "The friends laughed because it felt scary and fun.",
          words: [
            { ko: "재미있는", en: "fun" },
            { ko: "웃다", en: "smile" }
          ],
          focus: { x: 60, y: 35 }
        },
        {
          ko: `${nameTopic} 오늘 본 장면을 꼭 들려주고 싶었어요.`,
          en: `${name} wanted to tell everyone about the scene.`,
          words: [
            { ko: "들려주다", en: "tell" },
            { ko: "오늘", en: "today" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "놀이공원에서 돌아와 가족이나 친구에게 오늘 이야기를 들려주는 장면을 그려보세요.",
      offlinePromptEn: "Draw a scene where you come back from the amusement park and tell family or friends about today.",
      summaryKo: `${nameTopic} 친구와 불빛을 따라 강가 끝 놀이공원에 갔다. 빙글빙글 놀이기구를 타고 오늘 본 장면을 들려주고 싶어졌다.`
    },
    {
      titleKo: "오늘의 여행 이야기",
      titleEn: "Today's Trip Story",
      pages: [
        {
          ko: `${nameTopic} 집에 돌아와 가족과 친구를 만났어요.`,
          en: `${name} came home and met family and friends.`,
          words: [
            { ko: "집", en: "home" },
            { ko: "돌아오다", en: "come back" }
          ],
          focus: { x: 50, y: 55 }
        },
        {
          ko: "수민이는 신나는 여행 이야기를 천천히 들려주었어요.",
          en: `${name} slowly told the exciting trip story.`,
          words: [
            { ko: "이야기", en: "story" },
            { ko: "천천히", en: "slowly" }
          ],
          focus: { x: 35, y: 45 }
        },
        {
          ko: "모두는 어떤 장면이 제일 재미있었는지 물어보았어요.",
          en: "Everyone asked which scene was the most fun.",
          words: [
            { ko: "장면", en: "scene" },
            { ko: "재미", en: "fun" }
          ],
          focus: { x: 65, y: 50 }
        },
        {
          ko: `${nameTopic} 웃으며 말했어요. “다음에도 또 여행 가고 싶어!” 끝.`,
          en: `${name} smiled and said, "I want to travel again next time!" The end.`,
          words: [
            { ko: "다음", en: "next" },
            { ko: "끝", en: "the end" }
          ],
          focus: { x: 50, y: 50 }
        }
      ],
      offlinePromptKo: "오늘 완성한 책의 표지를 종이에 그려볼까요?",
      offlinePromptEn: "Can you draw the cover of your finished book on paper?",
      summaryKo: `${nameTopic} 집에 돌아와 가족과 친구에게 여행 이야기를 들려주었다. 다음에도 또 여행을 가고 싶다고 말했다.`
    }
  ];

  return chapters[chapterIndex(chapter)];
}

/** @typedef {{questionKo: string, questionEn: string, choices: import('./story-types.js').StoryChoice[]}} DemoBranch */

/** 편마다 2페이지 뒤에 나오는 갈림길. 첫 번째 카드가 원래 예제 이야기로 이어진다.
 * @type {DemoBranch[]} */
const demoBranches = [
  {
    questionKo: "여행길에서 무엇을 해볼까?",
    questionEn: "What should we do on the trip?",
    choices: [
      { emoji: "🏞️", ko: "새 장소 찾아가기", en: "Find a new place", iconKey: "search" },
      { emoji: "🎵", ko: "차 안에서 노래하기", en: "Sing in the car", iconKey: "sing" },
      { emoji: "👋", ko: "밖에 손 흔들기", en: "Wave outside", iconKey: "hello" }
    ]
  },
  {
    questionKo: "새 친구와 무엇을 해볼까?",
    questionEn: "What should we do with the new friend?",
    choices: [
      { emoji: "🏠", ko: "공원 구경하기", en: "Look around the park", iconKey: "lookAround" },
      { emoji: "🫧", ko: "물가 따라가기", en: "Follow the water path", iconKey: "follow" },
      { emoji: "🎁", ko: "선물 주기", en: "Give a present", iconKey: "gift" }
    ]
  },
  {
    questionKo: "상상 놀이공원에서 무엇을 해볼까?",
    questionEn: "What should we do at the imaginary amusement park?",
    choices: [
      { emoji: "🎡", ko: "빙글빙글 놀이기구 타기", en: "Ride the spinning ride", iconKey: "dance" },
      { emoji: "🎶", ko: "친구와 노래하기", en: "Sing with a friend", iconKey: "singTogether" },
      { emoji: "🤝", ko: "새 친구 소개하기", en: "Introduce a new friend", iconKey: "introduce" }
    ]
  },
  {
    questionKo: "이야기를 어떻게 끝낼까?",
    questionEn: "How should we end the story?",
    choices: [
      { emoji: "🏠", ko: "집에 가서 이야기하기", en: "Go home and tell the story", iconKey: "return" },
      { emoji: "🎁", ko: "친구에게 선물 주기", en: "Give a gift to a friend", iconKey: "gift" },
      { emoji: "🌙", ko: "여행 꿈꾸며 잠들기", en: "Fall asleep dreaming of the trip", iconKey: "sleep" }
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
