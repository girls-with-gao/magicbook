import { findTheme } from "./themes";

import type { StoryRequest } from "./story-types";

export function buildAnalysisPrompt({ nickname, age }: { nickname: string; age: number }) {
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
`.trim();
}

export function buildStoryPrompt({ nickname, age, analysis, themeId }: StoryRequest) {
  const theme = findTheme(themeId);

  return `
You create a safe, warm story for a ${age}-year-old child using the nickname "${nickname}".
Use only this parent-confirmed drawing diary analysis:
${JSON.stringify(analysis)}

Story theme the child chose: ${theme.label}
Theme guidance: ${theme.hint}

Requirements:
- Return exactly 4 pages.
- Let the theme colour the mood and setting, but never replace what the child actually drew.
- Every page must contain matching Korean and English sentences.
- Use age-appropriate, short language that can be read in about 3 minutes total.
- Each page may contain at most 2 vocabulary words, paired as Korean and English.
- Preserve the child's imagination; do not claim new artwork was generated.
- The final page must gently open the ending.
- End with an offline drawing prompt that asks the child to leave the screen and draw the next scene on paper.
- Avoid violence, fear, advertising, scoring, streaks, and addictive hooks.
- Focus coordinates are percentages from 0 to 100 and should vary gently by page.

Return only this JSON object:
{
  "titleKo": "string",
  "titleEn": "string",
  "pages": [
    {
      "ko": "string",
      "en": "string",
      "words": [{ "ko": "string", "en": "string" }],
      "focus": { "x": 50, "y": 50 }
    }
  ],
  "offlinePromptKo": "string",
  "offlinePromptEn": "string"
}
`.trim();
}
