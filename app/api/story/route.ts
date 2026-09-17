import { buildEndingPrompt, buildOpeningPrompt } from "@/lib/ai-prompts";
import { createDemoEnding, createDemoOpening } from "@/lib/demo-data";
import { hasOpenAIKey, requestOpenAIJson } from "@/lib/openai";
import { parsePreviousChapters } from "@/lib/previous-chapters";
import { normalizeEnding, normalizeOpening, parseChildChoice, parseOpening } from "@/lib/story-normalize";
import type { DrawingAnalysis, StoryEnding, StoryOpening } from "@/lib/story-types";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

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

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400, headers: noStoreHeaders });
}

/**
 * 이야기는 두 번에 나눠 만든다.
 * - phase "opening": 앞 2페이지 + 아이가 고를 갈림길 카드
 * - phase "ending": 아이가 고른(또는 말한) 선택을 반영한 뒤 2페이지
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      phase?: unknown;
      nickname?: unknown;
      age?: unknown;
      analysis?: unknown;
      previousChapters?: unknown;
      opening?: unknown;
      choice?: unknown;
    };
    if (!validAnalysis(body.analysis)) return badRequest("부모님이 확인한 그림일기 내용이 필요해요.");

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const age = Math.min(12, Math.max(5, Number(body.age) || 7));
    const previousChapters = parsePreviousChapters(body.previousChapters);
    const chapter = previousChapters.length + 1;
    const meta = { nickname, age, chapter };
    const base = { nickname, age, analysis: body.analysis, previousChapters };

    if (body.phase === "ending") {
      const opening = parseOpening(body.opening);
      const choice = parseChildChoice(body.choice);
      if (!opening || !choice) return badRequest("앞 이야기와 아이의 선택이 필요해요.");

      if (!hasOpenAIKey()) {
        return Response.json(
          { ending: createDemoEnding({ ...meta, choice }), demoMode: true },
          { headers: noStoreHeaders }
        );
      }
      const generated = await requestOpenAIJson<Partial<StoryEnding>>({
        prompt: buildEndingPrompt({ ...base, opening, choice })
      });
      return Response.json(
        { ending: normalizeEnding(generated, { ...meta, choice }), demoMode: false },
        { headers: noStoreHeaders }
      );
    }

    if (!hasOpenAIKey()) {
      return Response.json({ opening: createDemoOpening(meta), demoMode: true }, { headers: noStoreHeaders });
    }
    const generated = await requestOpenAIJson<Partial<StoryOpening>>({ prompt: buildOpeningPrompt(base) });
    return Response.json({ opening: normalizeOpening(generated, meta), demoMode: false }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Story generation failed", error);
    return Response.json(
      { error: "이야기를 만드는 중 문제가 생겼어요. 확인한 내용은 그대로니 다시 시도해주세요." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
