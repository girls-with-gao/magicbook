/**
 * 친구 이야기 예시 그림 만들기 (OpenAI 이미지 모델).
 *
 * 실행: npm run seed-art            (전체 4장)
 *       npm run seed-art rabbit-1   (한 장만)
 *
 * 글자는 넣지 않고 그림만 만든다. 그림일기의 한글 손글씨는
 * scripts/compose-seed-art.ts에서 따로 얹는다. 호출마다 요금이 나간다.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const MODEL = "gpt-image-2.5-flare";
const SIZE = "1536x1024";

const childStyle =
  "A drawing made by a 7-year-old child with crayons and markers on white paper. " +
  "Clumsy wobbly lines, uneven shapes, flat bright colors, scribbled coloring that goes outside the lines, " +
  "childlike proportions, no shading, no perspective. Absolutely no text, no letters, no numbers, no signature anywhere in the image.";

const targets: Record<string, string> = {
  "rabbit-1": "A white rabbit with long ears floating in dark night space, a big round moon, small stars, and a few pink round candies.",
  "rabbit-2": "A purple boat shaped like a star flying through dark blue space. A white rabbit and a small child ride in it. One small yellow star far away looks sad.",
  "dino-1": "A friendly green dinosaur sitting on the floor between tall brown bookshelves in a library at night, with a big open book in front of it.",
  "snow-1": "A smiling snowman with twig arms and an orange carrot nose holding a white card, standing in a snowy village with a red roof house, snow falling."
};

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(".env에 OPENAI_API_KEY를 넣어주세요.");
  process.exit(1);
}

async function generate(name: string, scene: string) {
  console.log(`[${name}] 그림을 만드는 중…`);
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: `${childStyle}\n\nScene: ${scene}`, size: SIZE, n: 1 })
  });

  const data = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
    error?: { message?: string };
  };
  if (!response.ok || !data.data?.length) {
    console.error(`[${name}] 실패. HTTP ${response.status}: ${data.error?.message ?? "알 수 없는 오류"}`);
    return false;
  }

  const image = data.data[0];
  const bytes = image.b64_json
    ? Buffer.from(image.b64_json, "base64")
    : image.url
      ? Buffer.from(await (await fetch(image.url)).arrayBuffer())
      : null;
  if (!bytes) {
    console.error(`[${name}] 실패. 응답에 이미지가 없어요.`);
    return false;
  }

  await writeFile(join(process.cwd(), "public", "seed-art", `${name}.png`), bytes);
  console.log(`[${name}] 저장 완료 → public/seed-art/${name}.png`);
  return true;
}

async function main() {
  const only = process.argv[2];
  const entries = only ? Object.entries(targets).filter(([name]) => name === only) : Object.entries(targets);
  if (!entries.length) {
    console.error(`이름을 확인해주세요: ${Object.keys(targets).join(", ")}`);
    process.exit(1);
  }

  let failed = 0;
  for (const [name, scene] of entries) {
    if (!(await generate(name, scene))) failed += 1;
  }
  if (failed) {
    console.error(`${failed}장이 실패했어요. 같은 명령으로 다시 시도할 수 있어요.`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("요청 중 문제가 생겼어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
