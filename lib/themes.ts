export type StoryThemeId =
  | "free"
  | "adventure"
  | "magic"
  | "ocean"
  | "animals"
  | "busan";

export type StoryTheme = {
  id: StoryThemeId;
  label: string;
  /** 이야기 생성 프롬프트에 넣는 영어 힌트 */
  hint: string;
};

export const storyThemes: StoryTheme[] = [
  {
    id: "free",
    label: "자유롭게",
    hint: "Follow the child's drawing only. Do not add an outside theme."
  },
  {
    id: "adventure",
    label: "용감한 모험",
    hint: "A brave but gentle adventure. Courage without danger or fear."
  },
  {
    id: "magic",
    label: "공주와 마법",
    hint: "A kind princess-and-magic world. Warm, sparkling, never scary."
  },
  {
    id: "ocean",
    label: "바닷속 여행",
    hint: "An underwater journey with calm sea creatures."
  },
  {
    id: "animals",
    label: "동물 친구들",
    hint: "Friendly animal companions who help each other."
  },
  {
    id: "busan",
    label: "부산 바다 모험",
    hint: "A seaside adventure in Busan, Korea. Gentle local coastal feeling."
  }
];

export const defaultThemeId: StoryThemeId = "free";

export function findTheme(id: unknown): StoryTheme {
  const match = storyThemes.find((theme) => theme.id === id);
  return match ?? storyThemes[0];
}
