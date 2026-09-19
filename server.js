import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { buildAnalysisPrompt, buildEndingPrompt, buildOpeningPrompt } from "./public/shared/ai-prompts.js";
import { createDemoEnding, createDemoOpening, demoAnalysis, demoAnalysisFor } from "./public/shared/demo-data.js";
import { validateImageDataUrl } from "./public/shared/image-validation.js";
import { hasOpenAIKey, requestOpenAIJson } from "./public/shared/openai.js";
import { getPageFraming } from "./public/shared/page-composition.js";
import { parsePreviousChapters } from "./public/shared/previous-chapters.js";
import { normalizeEnding, normalizeOpening, parseChildChoice, parseOpening } from "./public/shared/story-normalize.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
await loadEnv();
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

async function loadEnv() {
  try {
    const env = await readFile(join(root, ".env"), "utf8");
    env.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const [key, ...valueParts] = trimmed.split("=");
      // 빈 값으로 넘겨 준 경우도 그대로 존중한다(OPENAI_API_KEY= 로 예제 모드 확인).
      if (!key || key in process.env) return;
      process.env[key] = valueParts.join("=").trim().replace(/^["']|["']$/g, "");
    });
  } catch {
    // Local development can still run in demo mode without a .env file.
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function fallbackStory({ childName, age, theme, mode, diaryText, characterIdentity, characterName, characterDetails }, reason = "missing-key") {
  const name = childName || "아이";
  const openEnded = mode === "continue";
  const subject = josa(name, "이", "가");
  const topic = josa(name, "은", "는");
  const object = characterIdentity || inferSubject(diaryText, theme);
  const heroName = characterName || object;
  const englishObject = inferEnglishSubject(object);
  const place = inferPlace(diaryText);
  const englishPlace = inferEnglishPlace(place);
  const themeText = theme || "신기한 모험";
  const details = characterDetails || "아이 그림 그대로의 특별한 모습";

  return {
    title: `${name}의 ${heroName} 매직북`,
    summary: `${name}${subject} 직접 그린 ${object} '${heroName}'${josa(heroName, "이", "가")} 주인공인 이야기입니다.`,
    keywords: [object, place, themeText, "상상"],
    pages: [
      {
        ko: `${name}${subject} 그린 ${object} '${heroName}'${josa(heroName, "이", "가")} 그림 속에서 반짝 눈을 떴어요. ${details}${josa(details, "은", "는")} 그대로였죠.`,
        en: `The ${englishObject} opened its eyes inside the drawing. The child remembered the amazing day at the ${englishPlace}.`,
        framing: "close",
        textSide: "right"
      },
      {
        ko: `'${heroName}'${josa(heroName, "은", "는")} 전시실 안으로 천천히 걸어 들어갔어요. 커다란 뼈와 발자국이 눈앞에 펼쳐졌지요.`,
        en: `The ${englishObject} walked into the exhibition hall. Huge bones and footprints appeared before the child.`,
        framing: "wide",
        textSide: "right"
      },
      {
        ko: `${name}${topic} '${heroName}'${josa(heroName, "이", "가")} 전시실 바닥의 발자국을 따라가는 모습을 보며, ${place}에서 느꼈던 두근거림을 다시 떠올렸어요.`,
        en: `The child watched the ${englishObject} follow footprints across the hall and remembered the excitement of the ${englishPlace}.`,
        framing: "medium",
        textSide: "left"
      },
      {
        ko: openEnded
          ? `발자국은 아직 가 보지 않은 전시실 앞에서 멈췄어요. '${heroName}'${josa(heroName, "은", "는")} 고개를 들었지요. 다음에는 무엇이 기다리고 있을까요?`
          : `'${heroName}'${josa(heroName, "은", "는")} 발자국의 끝에서 새로운 전시물을 발견했고, ${name}${subject} 그 모습을 오래도록 기억했어요.`,
        en: openEnded
          ? `The footprints stopped at an unexplored hall. What might be waiting there?`
          : `At the end of the footprints, the ${englishObject} found a new exhibit that the child would remember for a long time.`,
        framing: "wide",
        textSide: "left"
      }
    ],
    prompts: [
      `'${heroName}'${josa(heroName, "은", "는")} 다음에 어디로 걸어갈까요?`,
      `${name}${subject} '${heroName}'에게 물어보고 싶은 것은 무엇일까요?`,
      `전시회 다음 장면을 그린다면 어떤 공룡이나 화석을 더 그리고 싶나요?`
    ],
    englishWords: [
      { word: "dinosaur", meaning: "공룡" },
      { word: "exhibition", meaning: "전시회" },
      { word: "imagine", meaning: "상상하다" }
    ],
    note: `${fallbackReason(reason)} 나이 ${age || "미입력"}세 기준의 쉬운 문장으로 구성했습니다.`
  };
}

function normalizeStory(story) {
  const pages = Array.isArray(story.pages) ? story.pages : [];
  return {
    ...story,
    pages: pages.slice(0, 4).map((page) => ({
      ko: trimSentences(page.ko || "", 2),
      en: trimSentences(page.en || "", 2),
      framing: normalizeFraming(page.framing),
      textSide: page.textSide === "left" ? "left" : "right"
    }))
  };
}

function normalizeFraming(framing) {
  return ["close", "medium", "wide"].includes(framing) ? framing : "medium";
}

function normalizeStoryWithImages(story, images) {
  const normalized = normalizeStory(story);
  return {
    ...normalized,
    pages: normalized.pages.map((page, index) => ({
      ...page,
      imageDataUrl: images[index] || ""
    }))
  };
}

function trimSentences(text, maxSentences) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。？！])\s+/)
    .filter(Boolean)
    .slice(0, maxSentences)
    .join(" ");
}

function fallbackReason(reason) {
  if (reason === "quota") {
    return "현재 OpenAI API 크레딧이 부족해 실제 그림 분석 대신 입력한 글과 테마를 바탕으로 데모 이야기를 만들었습니다.";
  }
  if (reason === "api-error") {
    return "현재 OpenAI API 응답에 문제가 있어 실제 그림 분석 대신 입력한 글과 테마를 바탕으로 데모 이야기를 만들었습니다.";
  }
  return "현재는 API 키 없이 실행되어 실제 그림 분석 대신 입력한 글과 테마를 바탕으로 데모 이야기를 만들었습니다.";
}

function inferSubject(text = "", theme = "") {
  const source = `${text} ${theme}`;
  if (source.includes("트리케라톱스")) return "트리케라톱스";
  if (source.includes("공룡")) return "공룡";
  if (source.includes("공주")) return "공주";
  if (source.includes("바다")) return "바다 친구";
  if (source.includes("동물")) return "동물 친구";
  if (source.includes("우주")) return "우주 친구";
  return "그림 주인공";
}

function inferPlace(text = "") {
  if (text.includes("전시회")) return "공룡 전시회";
  if (text.includes("바다")) return "바닷가";
  if (text.includes("동물원")) return "동물원";
  if (text.includes("유치원")) return "유치원";
  if (text.includes("학교")) return "학교";
  return "그림 속 세상";
}

function inferEnglishSubject(subject) {
  if (subject === "트리케라톱스") return "triceratops";
  if (subject === "공룡") return "dinosaur";
  if (subject === "공주") return "princess";
  if (subject === "바다 친구") return "sea friend";
  if (subject === "동물 친구") return "animal friend";
  if (subject === "우주 친구") return "space friend";
  return "drawing hero";
}

function inferEnglishPlace(place) {
  if (place === "공룡 전시회") return "dinosaur exhibition";
  if (place === "바닷가") return "beach";
  if (place === "동물원") return "zoo";
  if (place === "유치원") return "kindergarten";
  if (place === "학교") return "school";
  return "drawing world";
}

function josa(word, withFinalConsonant, withoutFinalConsonant) {
  const last = word.trim().charCodeAt(word.trim().length - 1);
  const hasFinalConsonant = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? withFinalConsonant : withoutFinalConsonant;
}

function buildPrompt({ childName, age, theme, mode, diaryText, characterIdentity, characterName, characterDetails }) {
  return `
You are MagicBook, an AI storybook creator for children.

Create a safe, warm, age-appropriate storybook from a child's drawing or drawing diary.

Child name: ${childName || "아이"}
Age: ${age || "unknown"}
Child says the main character is: ${characterIdentity || "not specified"}
Character name: ${characterName || "not specified"}
Character details from child/parent: ${characterDetails || "not specified"}
Theme: ${theme || "free imagination"}
Story mode: ${mode === "continue" ? "open-ended continuation" : "complete story"}
Diary text written by child or parent: ${diaryText || "none"}

Rules:
- Korean should be natural and warm.
- English should be easy enough for the child's age.
- The child's interpretation is the source of truth. If the child says the drawing is a triceratops, princess, robot, or anything else, treat the uploaded drawing as that exact character even if it looks different.
- Never replace the child's character with a generic AI-created version. The visual protagonist of the book is the original uploaded drawing.
- Write like a real picture book: scene by scene, with warm narration, simple action, and a page-turn feeling.
- Write the story as if the extracted character from the uploaded drawing is acting inside illustrated backgrounds. The text should support the picture-book page, not explain the app.
- The story must be grounded in the uploaded drawing and diary text. If the diary mentions a specific subject, place, or event, make that the center of the story.
- Do not invent vague magical objects when the diary gives a concrete place or event. Prefer visible, drawable actions such as entering a museum, looking at a skeleton, following footprints, or meeting a friend.
- Unless the child explicitly mentions them, do not use gems, crystals, mysterious lights, portals, secret doors, magic keys, or other vague fantasy objects. Use concrete, drawable details from the diary instead.
- If the drawing and diary seem different, prioritize the diary text and explain the drawing as part of that memory.
- Treat the uploaded child drawing as the heart of the book. Mention visible details from the drawing when possible, and make the child's drawing feel like the source of the story rather than a generic prompt.
- Avoid violence, fear, commercial content, and addictive hooks.
- If story mode is open-ended, stop at an exciting but gentle moment and invite the child to imagine or draw the next scene.
- Create exactly 4 story pages. Do not create a separate cover page.
- Each page should have 1 to 2 short Korean picture-book sentences and 1 simple English translation.
- Page 1 introduces the child's extracted character in the story world.
- Page 2 starts a gentle event or discovery.
- Page 3 shows action, emotion, or a small problem.
- Page 4 resolves it or, for open-ended mode, pauses at a page-turn moment with a creative prompt.
- For every page, choose one framing value: "close" for a character-focused view, "medium" for character plus action, or "wide" for a scene-focused view. Do not use the same framing for every page.
- For every page, choose textSide as "left" or "right" and place the important visual action on the opposite side.
- Return only valid JSON with this schema:
{
  "title": "string",
  "summary": "string",
  "keywords": ["string"],
  "pages": [{"ko": "string", "en": "string", "framing": "close|medium|wide", "textSide": "left|right"}],
  "prompts": ["string"],
  "englishWords": [{"word": "string", "meaning": "string"}],
  "note": "string"
}
`;
}

async function generateStory(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackStory(payload);

  const content = [
    { type: "input_text", text: buildPrompt(payload) }
  ];

  if (payload.imageDataUrl) {
    content.push({
      type: "input_image",
      image_url: payload.imageDataUrl
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content }],
      temperature: 0.8
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429 && errorText.includes("insufficient_quota")) {
      return fallbackStory(payload, "quota");
    }
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text =
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text;

  if (!text) throw new Error("OpenAI response did not include text output.");
  const story = normalizeStory(parseStoryJson(text));
  if (!payload.imageDataUrl) return story;

  try {
    const images = await generatePageImages(payload, story);
    return normalizeStoryWithImages(story, images);
  } catch (error) {
    return {
      ...story,
      note: `${story.note || ""} 삽화 생성 중 문제가 있어 임시 장면으로 표시합니다: ${error.message}`.trim()
    };
  }
}

function parseStoryJson(text) {
  const cleaned = String(text)
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through with the original response for a useful error message.
      }
    }
    throw new Error("동화 응답을 JSON으로 읽지 못했어요. 다시 시도해 주세요.");
  }
}

async function generatePageImages(payload, story) {
  const pages = story.pages || [];
  const results = [];

  for (let index = 0; index < pages.length; index += 1) {
    const image = await generatePageImage(payload, story, pages[index], index);
    results.push(image);
  }

  return results;
}

async function generatePageImage(payload, story, page, index) {
  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = buildImagePrompt(payload, story, page, index);
  const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const primaryTool = buildImageTool(imageModel, false);
  return runImageGeneration(apiKey, prompt, [], primaryTool);
}

async function runImageGeneration(apiKey, prompt, imageUrls, tool) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...imageUrls.map((imageUrl) => ({ type: "input_image", image_url: imageUrl }))
          ]
        }
      ],
      tools: [tool]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (tool.input_fidelity) {
      return runImageGeneration(apiKey, prompt, imageUrls, buildImageTool("gpt-image-1-mini"));
    }
    throw new Error(`image generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const base64 = findGeneratedImage(data);
  if (!base64) throw new Error("image generation response did not include an image");
  return `data:image/png;base64,${base64}`;
}

function buildImageTool(model, useInputFidelity = true) {
  const tool = {
    type: "image_generation",
    model,
    quality: "low",
    size: "1024x1024",
    output_format: "png"
  };

  if (model === "gpt-image-1" && useInputFidelity) {
    tool.input_fidelity = "high";
  }

  return tool;
}

function buildImagePrompt({ childName, characterIdentity, characterName, characterDetails, theme, diaryText }, story, page, index) {
  const hero = [characterName, characterIdentity].filter(Boolean).join(", ") || "the child drawn character";
  const framing = normalizeFraming(page.framing);
  const framingDirection = {
    close: "Use a character-focused composition with room around the character for a storybook text panel.",
    medium: "Use a medium composition that shows the character and the main action around it.",
    wide: "Use a wide establishing composition where the location and atmosphere are clearly visible; do not fill the frame with a character."
  }[framing];
  return `
Create a background-only illustration for one page of a Korean children's picture book.

The app will place the child's original drawing on top of this background later. Do not draw, recreate, imply, duplicate, silhouette, or include any main character, animal, person, mascot, or creature in the background.
Do not include a character-shaped empty outline or a second version of the protagonist.

Child: ${childName || "아이"}
Character: ${hero}
Character details: ${characterDetails || "preserve the uploaded drawing's visible features"}
Theme: ${theme || "warm adventure"}
Diary context: ${diaryText || "none"}
Story title: ${story.title || "MagicBook"}
Page ${index + 1} Korean text: ${page.ko}

Page ${index + 1} composition:
- Framing: ${framing}
- ${framingDirection}
- Leave a calm, low-detail area on the ${page.textSide === "left" ? "left" : "right"} side for Korean story text.
- Keep the main action area on the opposite side from the text area.

Visual direction:
- Style similar to a warm printed children's picture book: soft colored pencil, watercolor, gentle texture, bright but not flashy.
- Use concrete visual details from the diary and story page, such as a museum hall, dinosaur skeleton, display case, footprints, trees, castle rooms, or ocean waves.
- Do not draw any readable text, letters, labels, logos, captions, speech bubbles, or page numbers inside the image.
- The app will place the original child drawing and Korean text over this background, so keep the requested text area visually simple.
- Safe, cozy, age-appropriate, no scary or violent elements.
`;
}

function findGeneratedImage(value) {
  if (!value || typeof value !== "object") return "";
  if (typeof value.result === "string") return value.result;
  if (typeof value.b64_json === "string") return value.b64_json;
  if (typeof value.image_base64 === "string") return value.image_base64;

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) {
      for (const child of item) {
        const found = findGeneratedImage(child);
        if (found) return found;
      }
    } else if (item && typeof item === "object") {
      const found = findGeneratedImage(item);
      if (found) return found;
    }
  }

  return "";
}

/* ------------------------------------------------------------------ */
/* 2단계: 5단계 아이 주도 흐름을 위한 새 API. public/shared의 공용 모듈을 쓴다. */
/* ------------------------------------------------------------------ */

function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 5) : [];
}

/**
 * AI가 읽어 온 값을 정리한다.
 * 비어 있을 때 예제 문장(바닷가·조개)으로 채우면 아이 그림과 상관없는 내용이 들어가므로,
 * 읽지 못한 항목은 비워 두고 부모가 채우게 한다.
 */
function normalizeAnalysis(value) {
  const analysis = value && typeof value === "object" ? value : {};
  const text = (input) => (typeof input === "string" ? input.trim() : "");
  return {
    characters: strings(analysis.characters),
    place: text(analysis.place),
    objects: strings(analysis.objects),
    mood: text(analysis.mood),
    diaryText: text(analysis.diaryText)
  };
}

function validAnalysis(value) {
  if (!value || typeof value !== "object") return false;
  return (
    Array.isArray(value.characters) &&
    Array.isArray(value.objects) &&
    typeof value.place === "string" &&
    typeof value.mood === "string" &&
    typeof value.diaryText === "string"
  );
}

async function handleAnalyze(req, res) {
  try {
    const body = await readBody(req);
    const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
    const validation = validateImageDataUrl(imageDataUrl);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.message });
      return;
    }

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const age = Math.min(12, Math.max(5, Number(body.age) || 7));
    const chapter = Number(body.chapter) || 1;

    if (!hasOpenAIKey()) {
      sendJson(res, 200, { analysis: demoAnalysisFor(chapter), demoMode: true });
      return;
    }

    const analysis = await requestOpenAIJson({ prompt: buildAnalysisPrompt({ nickname, age }), imageDataUrl });
    sendJson(res, 200, { analysis: normalizeAnalysis(analysis), demoMode: false });
  } catch (error) {
    sendJson(res, 500, { error: "그림을 읽는 중 문제가 생겼어요. 입력한 내용은 그대로니 다시 시도해주세요." });
  }
}

/**
 * 이야기는 두 번에 나눠 만든다.
 * - phase "opening": 앞 2페이지 + 아이가 고를 갈림길 카드
 * - phase "ending": 아이가 고른(또는 말한) 선택을 반영한 뒤 2페이지
 */
async function handleStory(req, res) {
  try {
    const body = await readBody(req);
    if (!validAnalysis(body.analysis)) {
      sendJson(res, 400, { error: "부모님이 확인한 그림일기 내용이 필요해요." });
      return;
    }

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const age = Math.min(12, Math.max(5, Number(body.age) || 7));
    const previousChapters = parsePreviousChapters(body.previousChapters);
    const chapter = previousChapters.length + 1;
    const meta = { nickname, age, chapter };
    const base = { nickname, age, analysis: body.analysis, previousChapters };

    if (body.phase === "ending") {
      const opening = parseOpening(body.opening);
      const choice = parseChildChoice(body.choice);
      if (!opening || !choice) {
        sendJson(res, 400, { error: "앞 이야기와 아이의 선택이 필요해요." });
        return;
      }

      if (!hasOpenAIKey()) {
        sendJson(res, 200, { ending: createDemoEnding({ ...meta, choice }), demoMode: true });
        return;
      }
      const generated = await requestOpenAIJson({ prompt: buildEndingPrompt({ ...base, opening, choice }) });
      sendJson(res, 200, { ending: normalizeEnding(generated, { ...meta, choice }), demoMode: false });
      return;
    }

    if (!hasOpenAIKey()) {
      sendJson(res, 200, { opening: createDemoOpening(meta), demoMode: true });
      return;
    }
    const generated = await requestOpenAIJson({ prompt: buildOpeningPrompt(base) });
    sendJson(res, 200, { opening: normalizeOpening(generated, meta), demoMode: false });
  } catch (error) {
    sendJson(res, 500, { error: "이야기를 만드는 중 문제가 생겼어요. 확인한 내용은 그대로니 다시 시도해주세요." });
  }
}

/** 새 흐름의 배경 프롬프트. 팀원 코드의 buildImagePrompt와 같은 원칙(배경만, 주인공은 나중에 오려 붙임)을
 * 새 DrawingAnalysis 스키마(characters/place/objects/mood)에 맞춰 쓴다. */
function buildPageArtPrompt({ nickname, analysis, titleKo }, page, index, framing, textSide) {
  const framingDirection = {
    close: "Use a character-focused composition with room around the character for a storybook text panel.",
    medium: "Use a medium composition that shows the character and the main action around it.",
    wide: "Use a wide establishing composition where the location and atmosphere are clearly visible; do not fill the frame with a character."
  }[framing];
  return `
Create a background-only illustration for one page of a Korean children's picture book.

The app will place the child's original drawing on top of this background later. Do not draw, recreate, imply, duplicate, silhouette, or include any main character, animal, person, mascot, or creature in the background.
Do not include a character-shaped empty outline or a second version of the protagonist.

Child: ${nickname || "아이"}
Characters in the story: ${(analysis.characters || []).join(", ") || "the child and friends"}
Place: ${analysis.place || "a warm imaginative world"}
Objects: ${(analysis.objects || []).join(", ") || "none specified"}
Mood: ${analysis.mood || "warm and curious"}
Story title: ${titleKo || "그림이야기"}
Page ${index + 1} Korean text: ${page.ko || ""}

Page ${index + 1} composition:
- Framing: ${framing}
- ${framingDirection}
- Leave a calm, low-detail area on the ${textSide === "left" ? "left" : "right"} side for Korean story text.
- Keep the main action area on the opposite side from the text area.

Visual direction:
- Style similar to a warm printed children's picture book: soft colored pencil, watercolor, gentle texture, bright but not flashy.
- Keep colors soft and slightly desaturated so a child's bright crayon drawing placed on top stands out clearly.
- Depth of field is welcome: keep the far background softer and the standing area crisper.
- Use concrete visual details from the place, objects, and mood above.
- Do not draw any readable text, letters, labels, logos, captions, speech bubbles, or page numbers inside the image.
- The app will place the original child drawing and Korean text over this background, so keep the requested text area visually simple.
- Safe, cozy, age-appropriate, no scary or violent elements.
`;
}

/** 팀원 코드 유지: 보고 있는 쪽 하나만 삽화를 만든다. 실패하면 500이 아니라
 * 빈 imageDataUrl로 응답해, 화면에서는 오려낸 주인공만으로 자연스럽게 대체한다. */
async function handlePageArt(req, res) {
  try {
    const body = await readBody(req);
    if (!validAnalysis(body.analysis)) {
      sendJson(res, 400, { error: "부모님이 확인한 그림일기 내용이 필요해요." });
      return;
    }

    const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : "아이";
    const page = body.page && typeof body.page === "object" ? body.page : {};
    const pageIndex = Math.max(0, Number(body.pageIndex) || 0);
    const titleKo = typeof body.titleKo === "string" ? body.titleKo : "";
    const { framing, textSide } = getPageFraming(pageIndex);

    if (!hasOpenAIKey()) {
      sendJson(res, 200, { imageDataUrl: "", demoMode: true, framing, textSide });
      return;
    }

    const prompt = buildPageArtPrompt({ nickname, analysis: body.analysis, titleKo }, page, pageIndex, framing, textSide);
    const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
    const tool = buildImageTool(imageModel, false);
    const imageDataUrl = await runImageGeneration(process.env.OPENAI_API_KEY, prompt, [], tool);
    sendJson(res, 200, { imageDataUrl, demoMode: false, framing, textSide });
  } catch (error) {
    // 삽화 생성 실패는 화면을 막지 않는다. 오려낸 주인공 그림만으로도 쪽을 볼 수 있어야 한다.
    console.error("page art failed:", error);
    sendJson(res, 200, { imageDataUrl: "", demoMode: false, error: "삽화를 만들지 못했어요. 그림만 보여드릴게요." });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(file);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/generate-story") {
    try {
      const payload = await readBody(req);
      const story = await generateStory(payload);
      sendJson(res, 200, { story });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/analyze") {
    await handleAnalyze(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/story") {
    await handleStory(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/page-art") {
    await handlePageArt(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MagicBook is running at http://localhost:${port}`);
});
