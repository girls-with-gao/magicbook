/**
 * 친구가 쓰다 만 이야기. 실제 아이가 올린 글이 아니라 팀이 만든 예시이며,
 * 화면에서도 예시라고 밝힌다. 아이는 이 이야기를 이어서 자기 책을 완성한다.
 *
 * @typedef {Object} SeedChapter
 * @property {string} imagePath
 * @property {import('./story-types.js').DrawingAnalysis} analysis
 * @property {import('./story-types.js').BilingualStory} story
 *
 * @typedef {Object} SeedBook
 * @property {string} id
 * @property {string} emoji
 * @property {string} authorName
 * @property {number} authorAge
 * @property {string} hook
 * @property {SeedChapter[]} chapters
 */

/** @type {SeedBook[]} */
export const seedBooks = [
  {
    id: "space-rabbit",
    emoji: "🐰",
    authorName: "민준",
    authorAge: 7,
    hook: "길 잃은 별을 찾으러 떠난 우주 토끼. 그다음은 아직 아무도 몰라요.",
    chapters: [
      {
        imagePath: "/seed-rabbit-1.svg",
        analysis: {
          characters: ["민준이", "우주 토끼"],
          place: "깜깜한 우주",
          objects: ["별 사탕", "커다란 달"],
          mood: "신기하고 설레는 기분",
          diaryText: "우주에서 토끼를 만났다. 별 사탕을 줬다."
        },
        story: {
          titleKo: "민준이와 우주 토끼",
          titleEn: "Minjun and the Space Rabbit",
          pages: [
            {
              ko: "민준이는 깜깜한 우주에서 하얀 토끼를 만났어요.",
              en: "Minjun met a white rabbit in the dark space.",
              words: [
                { ko: "우주", en: "space" },
                { ko: "토끼", en: "rabbit" }
              ],
              focus: { x: 35, y: 55 }
            },
            {
              ko: "토끼는 배가 고픈지 귀를 쫑긋 세웠어요.",
              en: "The rabbit perked up its ears because it was hungry.",
              words: [
                { ko: "귀", en: "ear" },
                { ko: "배고픈", en: "hungry" }
              ],
              focus: { x: 32, y: 45 }
            },
            {
              ko: "민준이는 주머니에서 별 사탕을 꺼내 나눠 주었어요.",
              en: "Minjun took out star candy and shared it.",
              words: [
                { ko: "사탕", en: "candy" },
                { ko: "나누다", en: "share" }
              ],
              focus: { x: 58, y: 62 }
            },
            {
              ko: "토끼가 방긋 웃으며 말했어요. “내 별 배를 태워 줄게!”",
              en: 'The rabbit smiled and said, "I will give you a ride on my star boat!"',
              words: [
                { ko: "웃다", en: "smile" },
                { ko: "배", en: "boat" }
              ],
              focus: { x: 50, y: 50 }
            }
          ],
          offlinePromptKo: "별 배는 어디로 갈까요? 다음 장면을 종이에 그려보세요.",
          offlinePromptEn: "Where will the star boat go? Draw the next scene on paper.",
          summaryKo: "민준이는 우주에서 하얀 토끼를 만나 별 사탕을 나눠 주었다. 토끼가 별 배를 태워 주겠다고 했다."
        }
      },
      {
        imagePath: "/seed-rabbit-2.svg",
        analysis: {
          characters: ["민준이", "우주 토끼", "길 잃은 별"],
          place: "별 배 위",
          objects: ["보라색 별 배", "반짝이는 별"],
          mood: "두근두근하고 씩씩한 기분",
          diaryText: "토끼가 별 배를 태워줬다. 길 잃은 별을 찾으러 갔다."
        },
        story: {
          titleKo: "길 잃은 별을 찾아서",
          titleEn: "Looking for the Lost Star",
          pages: [
            {
              ko: "보라색 별 배가 둥실 떠올랐어요. 민준이는 손잡이를 꼭 잡았어요.",
              en: "The purple star boat floated up, and Minjun held on tight.",
              words: [
                { ko: "떠오르다", en: "float" },
                { ko: "꼭", en: "tight" }
              ],
              focus: { x: 48, y: 60 }
            },
            {
              ko: "토끼가 속삭였어요. “작은 별 하나가 집을 잃어버렸대.”",
              en: 'The rabbit whispered, "A little star lost its home."',
              words: [
                { ko: "잃어버리다", en: "lose" },
                { ko: "집", en: "home" }
              ],
              focus: { x: 40, y: 42 }
            },
            {
              ko: "저 멀리에서 노란 별이 깜빡깜빡 울고 있었어요.",
              en: "Far away, a yellow star was blinking and crying.",
              words: [
                { ko: "멀리", en: "far" },
                { ko: "울다", en: "cry" }
              ],
              focus: { x: 70, y: 40 }
            },
            {
              ko: "민준이는 별에게 손을 내밀었어요. 그런데 그다음은…",
              en: "Minjun reached out to the star. And then…",
              words: [
                { ko: "손", en: "hand" },
                { ko: "그다음", en: "next" }
              ],
              focus: { x: 60, y: 50 }
            }
          ],
          offlinePromptKo: "길 잃은 별을 어떻게 도와줄까요? 다음 장면을 종이에 그려보세요.",
          offlinePromptEn: "How will you help the lost star? Draw the next scene on paper.",
          summaryKo: "민준이는 별 배를 타고 길 잃은 별을 찾아갔다. 우는 별에게 손을 내미는 순간에서 이야기가 멈췄다."
        }
      }
    ]
  },
  {
    id: "dino-library",
    emoji: "🦕",
    authorName: "하윤",
    authorAge: 6,
    hook: "밤마다 책을 읽는 공룡. 무슨 책을 그렇게 열심히 읽는 걸까요?",
    chapters: [
      {
        imagePath: "/seed-dino-1.svg",
        analysis: {
          characters: ["하윤이", "초록 공룡"],
          place: "밤의 도서관",
          objects: ["펼쳐진 책", "높은 책장"],
          mood: "조용하고 궁금한 기분",
          diaryText: "도서관에 공룡이 살았다. 밤마다 책을 읽는대."
        },
        story: {
          titleKo: "도서관에 사는 공룡",
          titleEn: "The Dinosaur in the Library",
          pages: [
            {
              ko: "불 꺼진 도서관에서 부스럭 소리가 났어요.",
              en: "A rustling sound came from the dark library.",
              words: [
                { ko: "도서관", en: "library" },
                { ko: "소리", en: "sound" }
              ],
              focus: { x: 50, y: 50 }
            },
            {
              ko: "책장 사이에 초록 공룡이 앉아 있었어요.",
              en: "A green dinosaur was sitting between the shelves.",
              words: [
                { ko: "공룡", en: "dinosaur" },
                { ko: "초록", en: "green" }
              ],
              focus: { x: 42, y: 60 }
            },
            {
              ko: "공룡은 커다란 책을 아주 천천히 넘기고 있었어요.",
              en: "The dinosaur turned the pages of a big book very slowly.",
              words: [
                { ko: "책", en: "book" },
                { ko: "천천히", en: "slowly" }
              ],
              focus: { x: 50, y: 68 }
            },
            {
              ko: "“쉿.” 공룡이 하윤이를 보고 웃었어요. “같이 읽을래?”",
              en: '"Shh." The dinosaur smiled at Hayun. "Want to read with me?"',
              words: [
                { ko: "같이", en: "together" },
                { ko: "읽다", en: "read" }
              ],
              focus: { x: 38, y: 55 }
            }
          ],
          offlinePromptKo: "공룡이 읽던 책에는 무엇이 있었을까요? 다음 장면을 종이에 그려보세요.",
          offlinePromptEn: "What was inside the dinosaur's book? Draw the next scene on paper.",
          summaryKo: "하윤이는 밤의 도서관에서 책 읽는 초록 공룡을 만났다. 공룡이 같이 읽자고 했다."
        }
      }
    ]
  },
  {
    id: "snow-village",
    emoji: "⛄",
    authorName: "서준",
    authorAge: 8,
    hook: "눈사람이 건넨 초대장. 눈사람 마을 잔치에는 누가 올까요?",
    chapters: [
      {
        imagePath: "/seed-snow-1.svg",
        analysis: {
          characters: ["서준이", "눈사람"],
          place: "눈 내리는 마을",
          objects: ["초대장", "빨간 지붕 집"],
          mood: "설레고 포근한 기분",
          diaryText: "눈사람이 초대장을 줬다. 눈사람 마을 잔치래!"
        },
        story: {
          titleKo: "눈사람 마을의 초대장",
          titleEn: "The Snow Village Invitation",
          pages: [
            {
              ko: "함박눈이 내리던 날, 눈사람이 서준이를 불렀어요.",
              en: "On a snowy day, a snowman called Seojun.",
              words: [
                { ko: "눈", en: "snow" },
                { ko: "부르다", en: "call" }
              ],
              focus: { x: 35, y: 58 }
            },
            {
              ko: "나뭇가지 손에 하얀 초대장이 들려 있었어요.",
              en: "A white invitation was in its twig hand.",
              words: [
                { ko: "초대장", en: "invitation" },
                { ko: "손", en: "hand" }
              ],
              focus: { x: 52, y: 45 }
            },
            {
              ko: "“오늘 밤 눈사람 마을에서 잔치가 열려요.”",
              en: '"Tonight there is a party in the snow village."',
              words: [
                { ko: "밤", en: "night" },
                { ko: "잔치", en: "party" }
              ],
              focus: { x: 60, y: 55 }
            },
            {
              ko: "서준이는 목도리를 두르고 눈길을 따라갔어요. 그런데…",
              en: "Seojun put on a scarf and followed the snowy path. But then…",
              words: [
                { ko: "목도리", en: "scarf" },
                { ko: "따라가다", en: "follow" }
              ],
              focus: { x: 70, y: 62 }
            }
          ],
          offlinePromptKo: "눈사람 마을에는 누가 살고 있을까요? 다음 장면을 종이에 그려보세요.",
          offlinePromptEn: "Who lives in the snow village? Draw the next scene on paper.",
          summaryKo: "서준이는 눈사람에게 눈사람 마을 잔치 초대장을 받았다. 눈길을 따라 마을로 가는 길에서 이야기가 멈췄다."
        }
      }
    ]
  }
];

/**
 * @param {unknown} id
 */
export function findSeedBook(id) {
  return seedBooks.find((book) => book.id === id) ?? null;
}
