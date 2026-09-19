/**
 * AI로 만든 그림(public/seed-art/*.png)에 한글 손글씨를 얹어
 * 그림일기 한 장(public/seed-*.png)으로 만든다.
 * 글꼴이 없는 기기에서도 똑같이 보이도록 마지막에 PNG로 구워 낸다.
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
const ART_HEIGHT = 600;
const HEIGHT = 760;
const HANDWRITING = "&quot;Nanum Pen Script&quot;, Gaegu, &quot;Apple SD Gothic Neo&quot;, sans-serif";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** macOS의 sips로 그림을 줄이고 JPEG로 바꿔 용량을 낮춘다. */
async function shrink(pngPath: string) {
  const dir = await mkdtemp(join(tmpdir(), "seed-art-"));
  const out = join(dir, "small.jpg");
  await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", "1200", pngPath, "--out", out]);
  return readFile(out);
}

function svgFor(imageBase64: string, lines: string[]) {
  const text = lines
    .map((line, index) => {
      const y = ART_HEIGHT + 78 + index * 62;
      // 얇은 펜 글꼴이라 잘 안 읽혀서, 크게 쓰고 같은 색으로 한 번 더 그어 굵게 만든다.
      return `  <text x="70" y="${y}" font-family=${`"${HANDWRITING}"`} font-size="52" fill="#2f2620" stroke="#2f2620" stroke-width="1.1" paint-order="stroke" transform="rotate(${index % 2 ? 0.4 : -0.6} 70 ${y})">${line}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" rx="24" fill="#fffdf6"/>
  <image x="30" y="28" width="${WIDTH - 60}" height="${ART_HEIGHT - 28}" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,${imageBase64}"/>
  <rect x="30" y="28" width="${WIDTH - 60}" height="${ART_HEIGHT - 28}" rx="10" fill="none" stroke="#e0d6c6" stroke-width="4"/>
${text}
</svg>
`;
}

/** SVG를 크롬으로 구워 PNG로 만든다. 보는 기기에 글꼴이 없어도 똑같이 보인다. */
async function rasterize(svg: string, target: string) {
  const dir = await mkdtemp(join(tmpdir(), "seed-page-"));
  const svgPath = join(dir, "page.svg");
  await writeFile(svgPath, svg);
  await run(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=2",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${target}`,
    `file://${svgPath}`
  ]);
}

async function main() {
  for (const [name, diary] of Object.entries(diaries)) {
    const source = join(process.cwd(), "public", "seed-art", `${name}.png`);
    const small = await shrink(source);
    const svg = svgFor(small.toString("base64"), diary.lines);
    const target = join(process.cwd(), "public", `${diary.file}.png`);
    await rasterize(svg, target);
    console.log(`[${name}] public/${diary.file}.png`);
  }
}

main().catch((error: unknown) => {
  console.error("그림일기를 만들지 못했어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
