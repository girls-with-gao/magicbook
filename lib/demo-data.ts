import type { BilingualStory, DrawingAnalysis } from "./story-types";

function hasKoreanFinalConsonant(value: string) {
  const lastCharacter = value.trim().at(-1);

  if (!lastCharacter) return false;

  const code = lastCharacter.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;

  return isHangulSyllable && (code - 0xac00) % 28 !== 0;
}

function childNameWithParticle(name: string, afterFinal: string, afterVowel: string) {
  return `${name}${hasKoreanFinalConsonant(name) ? afterFinal : afterVowel}`;
}

export const demoAnalysis: DrawingAnalysis = {
  characters: ["수민이", "엄마"],
  place: "바닷가",
  objects: ["반짝이는 조개", "파도"],
  mood: "신나고 궁금한 기분",
  diaryText: "오늘 엄마와 바닷가에서 반짝이는 조개를 찾았다."
};

export function createDemoStory({
  nickname = "수민",
  age: _age = 7
}: {
  nickname?: string;
  age?: number;
}): BilingualStory {
  const name = nickname.trim() || "아이";
  const nameAnd = childNameWithParticle(name, "이와", "와");
  const nameTopic = childNameWithParticle(name, "이는", "는");

  return {
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
    offlinePromptEn: "What world is inside the shell? Draw the next scene on paper."
  };
}
