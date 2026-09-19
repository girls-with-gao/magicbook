/**
 * Higgsfield Seedance 2.5 (글 → 동영상) 예제.
 *
 * 실행: npm run video
 * 키는 .env의 HF_CREDENTIALS(키아이디:키시크릿)에서 읽습니다.
 * 이 SDK는 서버 쪽 전용이라 브라우저에서는 동작하지 않습니다. 호출은 유료입니다.
 */
import { config, higgsfield } from "@higgsfield/client/v2";

const MODEL = "bytedance/seedance-2.5/text-to-video";

const credentials = process.env.HF_CREDENTIALS;
if (!credentials) {
  console.error(".env에 HF_CREDENTIALS=키아이디:키시크릿 을 넣어주세요.");
  process.exit(1);
}

config({ credentials });

async function main() {
  console.log(`동영상을 만드는 중이에요… (${MODEL})`);

  const result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9"
    },
    withPolling: true
  });

  const videoUrl = result.video?.url;

  if (result.status !== "completed" || !videoUrl) {
    // 실패·취소·검열(nsfw) 상태를 성공으로 보고하지 않는다.
    console.error(`동영상을 만들지 못했어요. 상태: ${result.status} (요청 번호: ${result.request_id})`);
    console.error("응답 내용:", JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log("완성된 동영상 주소:");
  console.log(videoUrl);
}

main().catch((error: unknown) => {
  console.error("요청 중 문제가 생겼어요:", error instanceof Error ? error.message : error);
  process.exit(1);
});
