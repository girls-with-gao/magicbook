import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

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
      if (!key || process.env[key]) return;
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

function fallbackStory({ childName, age, theme, mode, diaryText }, reason = "missing-key") {
  const name = childName || "아이";
  const openEnded = mode === "continue";
  const subject = josa(name, "이", "가");
  const topic = josa(name, "은", "는");
  const object = inferSubject(diaryText, theme);
  const englishObject = inferEnglishSubject(object);
  const place = inferPlace(diaryText);
  const englishPlace = inferEnglishPlace(place);
  const themeText = theme || "신기한 모험";

  return {
    title: `${name}의 ${object} 매직북`,
    summary: `${name}${subject} 남긴 그림과 일기를 바탕으로 ${place}에서 만난 ${object} 이야기를 만들었습니다.`,
    keywords: [object, place, themeText, "상상"],
    pages: [
      {
        ko: `${name}${subject} 그린 그림 속 ${object}${josa(object, "이", "가")} 반짝 눈을 떴어요. 오늘 ${name}${topic} ${place}에서 본 멋진 모습을 떠올렸죠.`,
        en: `The ${englishObject} opened its eyes inside the drawing. The child remembered the amazing day at the ${englishPlace}.`
      },
      {
        ko: `${object}${josa(object, "은", "는")} 색연필 길을 천천히 걸으며 말했어요. "나를 이렇게 멋지게 기억해줘서 고마워!"`,
        en: `The ${englishObject} walked along a crayon road and said, "Thank you for remembering me in such a wonderful way!"`
      },
      {
        ko: `${name}${topic} ${object}의 뿔과 튼튼한 발을 보며, 전시회에서 느꼈던 두근거림을 다시 떠올렸어요.`,
        en: `The child looked at the ${englishObject}'s horns and strong feet, and remembered the excitement from the exhibition.`
      },
      {
        ko: openEnded
          ? `그때 전시장 안쪽에서 쿵, 쿵, 작은 발소리가 들렸어요. ${name}${topic} 고개를 돌렸어요. 이제 다음 장면은 ${name}${subject} 상상할 차례예요.`
          : `${object}${josa(object, "은", "는")} ${name}에게 작은 화석 모양 별을 선물했고, 그림 속 전시회는 환한 모험으로 가득 찼어요.`,
        en: openEnded
          ? `Then the child heard soft footsteps from inside the exhibition hall. Now it is time to imagine what happens next.`
          : `The ${englishObject} gave the child a tiny fossil-shaped star, and the drawing exhibition became full of bright adventure.`
      }
    ],
    prompts: [
      `${object}${josa(object, "은", "는")} 다음에 어디로 걸어갈까요?`,
      `${name}${subject} ${object}에게 물어보고 싶은 것은 무엇일까요?`,
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

function buildPrompt({ childName, age, theme, mode, diaryText }) {
  return `
You are MagicBook, an AI storybook creator for children.

Create a safe, warm, age-appropriate storybook from a child's drawing or drawing diary.

Child name: ${childName || "아이"}
Age: ${age || "unknown"}
Theme: ${theme || "free imagination"}
Story mode: ${mode === "continue" ? "open-ended continuation" : "complete story"}
Diary text written by child or parent: ${diaryText || "none"}

Rules:
- Korean should be natural and warm.
- English should be easy enough for the child's age.
- The story must be grounded in the uploaded drawing and diary text. If the diary mentions a specific subject, place, or event, make that the center of the story.
- If the drawing and diary seem different, prioritize the diary text and explain the drawing as part of that memory.
- Treat the uploaded child drawing as the heart of the book. Mention visible details from the drawing when possible, and make the child's drawing feel like the source of the story rather than a generic prompt.
- Avoid violence, fear, commercial content, and addictive hooks.
- If story mode is open-ended, stop at an exciting but gentle moment and invite the child to imagine or draw the next scene.
- Keep it short: 4 to 6 pages.
- Return only valid JSON with this schema:
{
  "title": "string",
  "summary": "string",
  "keywords": ["string"],
  "pages": [{"ko": "string", "en": "string"}],
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
  return JSON.parse(text);
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
