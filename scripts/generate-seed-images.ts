/**
 * 친구 이야기 예시 그림을 Higgsfield Soul로 만든다. (글 → 이미지)
 * OpenAI 쪽은 scripts/generate-seed-art.ts. 두 결과를 비교하려고 남겨 둔다.
 *
 * 실행: npm run seed-images            (전체)
 *       npm run seed-images rabbit-1   (한 장만)
 *
 * 아이가 크레용으로 그린 그림처럼 보이게 하는 게 목적이다.
 * 호출마다 요금이 나가므로, 먼저 한 장으로 확인한 뒤 나머지를 만든다.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config, higgsfield } from "@higgsfield/client/v2";

const MODEL = "higgsfield-ai/soul/v2/standard";

const childStyle =
  "A drawing made by a 7-year-old child with crayons and markers on white paper. " +
  "Clumsy wobbly lines, uneven shapes, flat bright colors, scribbled coloring that goes outside the lines, " +
  "childlike proportions, no shading, no perspective. Absolutely no text, no letters, no numbers, no signature anywhere in the image.";

const targets: Record<string, string> = {
  "rabbit-1": `${childStyle}. A white rabbit with long ears floating in dark night space, a big pale moon, small yellow stars, pink round star candies`,
  "rabbit-2": `${childStyle}. A purple boat shaped like a star flying through dark blue space, a white rabbit and a small child riding it, one lonely yellow star far away`,
  "dino-1": `${childStyle}. A friendly green dinosaur sitting between tall brown bookshelves in a quiet library at night, an open book on the floor`,
  "snow-1": `${childStyle}. A smiling snowman with twig arms and orange carrot nose holding a white card, snowy village with a red roof house, falling snowflakes`
};

const credentials = process.env.HF_CREDENTIALS;
if (!credentials) {
  console.error(".env에 HF_CREDENTIALS=키아이디:키시크릿 을 넣어주세요.");
  process.exit(1);
}
config({ credentials });

async function generate(name: string, prompt: string) {
  console.log(`[${name}] 그림을 만드는 중…`);
  const result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt,
      resolution: "720p",
      aspect_ratio: "4:3",
      batch_size: 1,
      // 자동 프롬프트 보정을 끄면 '아이 그림' 느낌이 덜 다듬어진다.
      enhance_prompt: false
    },
    withPolling: true
  });

  const imageUrl = result.images?.[0]?.url;
  if (result.status !== "completed" || !imageUrl) {
    console.error(`[${name}] 실패. 상태: ${result.status} (요청 번호: ${result.request_id})`);
    return false;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    console.error(`[${name}] 이미지를 내려받지 못했어요. HTTP ${response.status}`);
    return false;
  }
  const filePath = join(process.cwd(), "public", "seed-art-hf", `${name}.png`);
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()));
  console.log(`[${name}] 저장 완료 → public/seed-art-hf/${name}.png`);
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
  for (const [name, prompt] of entries) {
    if (!(await generate(name, prompt))) failed += 1;
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
