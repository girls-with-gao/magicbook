import { buildStoryPrompt } from "@/lib/ai-prompts";
import { createDemoStory } from "@/lib/demo-data";
import { parsePreviousChapters } from "@/lib/previous-chapters";
import { hasOpenAIKey, requestOpenAIJson } from "@/lib/openai";
import type { BilingualStory, DrawingAnalysis, StoryPage } from "@/lib/story-types";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

function cleanPage(value: Partial<StoryPage>, fallback: StoryPage): StoryPage {
  const words = Array.isArray(value.words)
    ? value.words
        .filter((word) => word && typeof word.ko === "string" && typeof word.en === "string")
        .slice(0, 2)
    : fallback.words;
  const focus = value.focus && typeof value.focus.x === "number" && typeof value.focus.y === "number"
    ? {
        x: Math.min(100, Math.max(0, value.focus.x)),
        y: Math.min(100, Math.max(0, value.focus.y))
      }
    : fallback.focus;
  return {
    ko: typeof value.ko === "string" && value.ko.trim() ? value.ko.trim() : fallback.ko,
    en: typeof value.en === "string" && value.en.trim() ? value.en.trim() : fallback.en,
    words,
    focus
  };
}

function normalizeStory(
  value: Partial<BilingualStory>,
  nickname: string,
  age: number,
  chapter: number
): BilingualStory {
  const fallback = createDemoStory({ nickname, age, chapter });
  const pages = Array.isArray(value.pages)
    ? value.pages.slice(0, 4).map((page, index) => cleanPage(page, fallback.pages[index]))
    : [];
  while (pages.length < 4) pages.push(fallback.pages[pages.length]);

  return {
    titleKo: typeof value.titleKo === "string" && value.titleKo.trim() ? value.titleKo.trim() : fallback.titleKo,
    titleEn: typeof value.titleEn === "string" && value.titleEn.trim() ? value.titleEn.trim() : fallback.titleEn,
    pages,
    offlinePromptKo:
      typeof value.offlinePromptKo === "string" && value.offlinePromptKo.trim()
        ? value.offlinePromptKo.trim()
        : fallback.offlinePromptKo,
    offlinePromptEn:
      typeof value.offlinePromptEn === "string" && value.offlinePromptEn.trim()
        ? value.offlinePromptEn.trim()
        : fallback.offlinePromptEn,
    summaryKo:
      typeof value.summaryKo === "string" && value.summaryKo.trim()
        ? value.summaryKo.trim().slice(0, 300)
        : [value.titleKo, value.pages?.at(-1)?.ko].filter(Boolean).join(" — ") || fallback.summaryKo
  };
}


function validAnalysis(value: unknown): value is DrawingAnalysis {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<DrawingAnalysis>;
  return (
    Array.isArray(analysis.characters) &&
    Array.isArray(analysis.objects) &&
    typeof analysis.place === "string" &&
    typeof analysis.mood === "string" &&
    typeof analysis.diaryText === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nickname?: unknown;
      age?: unknown;
      analysis?: unknown;
      previousChapters?: unknown;
    };
    if (!validAnalysis(body.analysis)) {
      return Response.json(
        { error: "부모님이 확인한 그림일기 내용이 필요해요." },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const age = Math.min(12, Math.max(5, Number(body.age) || 7));
    const previousChapters = parsePreviousChapters(body.previousChapters);
    const chapter = previousChapters.length + 1;

    if (!hasOpenAIKey()) {
      return Response.json(
        { story: createDemoStory({ nickname, age, chapter }), demoMode: true },
        { headers: noStoreHeaders }
      );
    }

    const generated = await requestOpenAIJson<Partial<BilingualStory>>({
      prompt: buildStoryPrompt({ nickname, age, analysis: body.analysis, previousChapters })
    });
    return Response.json(
      { story: normalizeStory(generated, nickname, age, chapter), demoMode: false },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("Story generation failed", error);
    return Response.json(
      { error: "이야기를 만드는 중 문제가 생겼어요. 확인한 내용은 그대로니 다시 시도해주세요." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
