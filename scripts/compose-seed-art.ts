/**
 * AI로 만든 그림(public/seed-art/*.png)에 한글 손글씨를 얹어
 * 그림일기 한 장(public/seed-*.svg)으로 만든다.
 *
 * 실행: npm run seed-compose
 *
 * AI 이미지 모델은 한글을 제대로 못 쓰기 때문에 글씨는 여기서 얹는다.
 * 그림은 용량을 줄여 SVG 안에 넣으므로 결과 파일 하나만 있으면 된다.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const diaries: Record<string, { file: string; lines: string[] }> = {
  "rabbit-1": { file: "seed-rabbit-1", lines: ["우주에서 토끼를 만났다.", "별 사탕을 줬다."] },
  "rabbit-2": { file: "seed-rabbit-2", lines: ["토끼가 별 배를 태워줬다.", "길 잃은 별을 찾으러 갔다."] },
  "dino-1": { file: "seed-dino-1", lines: ["도서관에 공룡이 살았다.", "밤마다 책을 읽는대."] },
  "snow-1": { file: "seed-snow-1", lines: ["눈사람이 초대장을 줬다.", "눈사람 마을 잔치래!"] }
};

const WIDTH = 1000;
const ART_HEIGHT = 620;
const HEIGHT = 760;
const HANDWRITING = "&quot;Nanum Pen Script&quot;, Gaegu, &quot;Apple SD Gothic Neo&quot;, sans-serif";

/** macOS의 sips로 그림을 줄이고 JPEG로 바꿔 용량을 낮춘다. */
async function shrink(pngPath: string) {
  const dir = await mkdtemp(join(tmpdir(), "seed-art-"));
  const out = join(dir, "small.jpg");
  await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", "1200", pngPath, "--out", out]);
  return readFile(out);
}

function svgFor(imageBase64: string, lines: string[]) {
  const text = lines
    .map(
      (line, index) =>
        `  <text x="70" y="${ART_HEIGHT + 70 + index * 52}" font-family=${`"${HANDWRITING}"`} font-size="40" fill="#4a3f38" transform="rotate(${index % 2 ? 0.5 : -0.7} 70 ${ART_HEIGHT + 70 + index * 52})">${line}</text>`
    )
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="24" fill="#fffdf6"/>
  <image x="30" y="28" width="${WIDTH - 60}" height="${ART_HEIGHT - 28}" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,${imageBase64}"/>
  <rect x="30" y="28" width="${WIDTH - 60}" height="${ART_HEIGHT - 28}" rx="10" fill="none" stroke="#e0d6c6" stroke-width="4"/>
${text}
</svg>
`;
}

async function main() {
  for (const [name, diary] of Object.entries(diaries)) {
    const source = join(process.cwd(), "public", "seed-art", `${name}.png`);
    const small = await shrink(source);
    const svg = svgFor(small.toString("base64"), diary.lines);
    const target = join(process.cwd(), "public", `${diary.file}.svg`);
    await writeFile(target, svg);
    console.log(`[${name}] public/${diary.file}.svg (${Math.round(svg.length / 1024)}KB)`);
  }
}

main().catch((error: unknown) => {
  console.error("그림일기를 만들지 못했어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
