import { buildAnalysisPrompt } from "@/lib/ai-prompts";
import { demoAnalysis, demoAnalysisFor } from "@/lib/demo-data";
import { validateImageDataUrl } from "@/lib/image-validation";
import { hasOpenAIKey, requestOpenAIJson } from "@/lib/openai";
import type { DrawingAnalysis } from "@/lib/story-types";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 5)
    : [];
}

function normalizeAnalysis(value: Partial<DrawingAnalysis>): DrawingAnalysis {
  return {
    characters: strings(value.characters).length ? strings(value.characters) : demoAnalysis.characters,
    place: typeof value.place === "string" && value.place.trim() ? value.place.trim() : demoAnalysis.place,
    objects: strings(value.objects).length ? strings(value.objects) : demoAnalysis.objects,
    mood: typeof value.mood === "string" && value.mood.trim() ? value.mood.trim() : demoAnalysis.mood,
    diaryText:
      typeof value.diaryText === "string" && value.diaryText.trim()
        ? value.diaryText.trim()
        : demoAnalysis.diaryText
  };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 12 * 1024 * 1024) {
      return Response.json({ error: "그림 파일이 너무 커요." }, { status: 413, headers: noStoreHeaders });
    }

    const body = (await request.json()) as {
      imageDataUrl?: unknown;
      nickname?: unknown;
      age?: unknown;
      chapter?: unknown;
    };
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    const validation = validateImageDataUrl(imageDataUrl);
    if (!validation.ok) {
      return Response.json({ error: validation.message }, { status: 400, headers: noStoreHeaders });
    }

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const age = Math.min(12, Math.max(5, Number(body.age) || 7));

    if (!hasOpenAIKey()) {
      return Response.json({ analysis: demoAnalysisFor(Number(body.chapter) || 1), demoMode: true }, { headers: noStoreHeaders });
    }

    const analysis = await requestOpenAIJson<Partial<DrawingAnalysis>>({
      prompt: buildAnalysisPrompt({ nickname, age }),
      imageDataUrl
    });
    return Response.json({ analysis: normalizeAnalysis(analysis), demoMode: false }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("Drawing analysis failed", error);
    return Response.json(
      { error: "그림을 읽는 중 문제가 생겼어요. 입력한 내용은 그대로니 다시 시도해주세요." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
