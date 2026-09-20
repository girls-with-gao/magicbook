import { createHiggsfieldClient } from "@higgsfield/client/v2";

function credentials() {
  const value = process.env.HF_CREDENTIALS;
  if (!value) throw new Error("HF_CREDENTIALS가 설정되지 않았습니다.");
  const separator = value.indexOf(":");
  if (separator < 1 || separator === value.length - 1) {
    throw new Error("HF_CREDENTIALS 형식은 KEY_ID:KEY_SECRET이어야 합니다.");
  }
  return {
    combined: value,
    apiKey: value.slice(0, separator),
    apiSecret: value.slice(separator + 1)
  };
}

function imageFromDataUrl(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp);base64,([\s\S]+)$/.exec(dataUrl || "");
  if (!match) throw new Error("지원하지 않는 그림 형식입니다.");
  return {
    bytes: Buffer.from(match[2], "base64"),
    format: match[1],
    contentType: `image/${match[1]}`
  };
}

export function hasHiggsfieldCredentials() {
  return Boolean(process.env.HF_CREDENTIALS);
}

export function buildHiggsfieldPagePrompt({
  nickname,
  characters = [],
  place,
  objects = [],
  mood,
  title,
  pageText,
  pageNumber,
  framing,
  textSide
}) {
  const framingGuide = {
    close: "Use a close-up from a fresh camera angle to focus on the character's expression or the important discovered detail. Keep enough of the character visible to recognize the child's design.",
    medium: "Use an eye-level medium shot showing the character doing the page's specific action, with nearby story props and setting visible.",
    wide: "Use a wide establishing shot with a distinct camera angle. Let the setting and its depth carry the scene; keep the protagonist smaller but unmistakably recognizable."
  }[framing] || "Use a balanced storybook composition with a clearly readable setting.";
  const confirmedCharacters = characters.filter((item) => typeof item === "string" && item.trim()).join(", ");
  const confirmedObjects = objects.filter((item) => typeof item === "string" && item.trim()).join(", ");

  return `
Create one complete, full-bleed illustration for page ${pageNumber} of a Korean children's picture book. Each page must feel like a different story moment and camera shot, not a repeated portrait with a swapped background.

The attached image is the authoritative visual reference for the child-drawn character(s) and drawing style. Reconstruct the drawn subject as a storybook character while preserving its recognizable design: the same silhouette and proportions, face placement, distinctive parts, exact main colors, uneven child-drawn outlines, and crayon or marker texture. Keep those identity and style traits consistent across every page; only pose and expression may change. Do not make the character realistic, polished, or a generic version of its species. Follow the parent-confirmed character identity below even if the drawing could be mistaken for something else.

Use the uploaded drawing as a character and style reference, not as a finished scene to copy. Ignore and replace its original background, paper edges, photo details, handwriting, and unrelated marks. Build a new setting around the recognizable child-drawn character(s) using the story details below. Integrate the character naturally into the scene; do not paste the source image, frame it, split the page into panels, or leave the original background attached.

Child: ${nickname || "아이"}
Parent-confirmed character(s): ${confirmedCharacters || "the main subject drawn by the child"}
Story setting: ${place || "a warm imaginative world"}
Story objects: ${confirmedObjects || "none specified"}
Mood: ${mood || "warm and curious"}
Book title: ${title || "그림이야기"}
Page story for visual guidance only: ${pageText || ""}

Composition: ${framingGuide}
The story text will be placed in a separate area below the illustration, so compose the entire image freely without reserving a blank text panel. Vary pose, camera distance, viewpoint, and environment details to match this page's action while keeping the protagonist's identity and the illustration style consistent.

Use the same handmade picture-book art direction on every page: childlike colored-pencil and crayon marks, simple shapes, warm colors sampled from the reference drawing, gentle paper texture, and soft storybook backgrounds. Preserve the child's imperfect drawing quality instead of converting it into polished digital cartoon art.

Absolutely no writing anywhere in the image: no readable or pseudo text, letter-like marks, numbers, labels, signs, logos, captions, speech bubbles, book titles, or handwriting. Keep signs, screens, and pages blank or show only simple non-letter shapes. The app adds the exact Korean and English story text separately below the image. Keep everything safe, cozy, and age-appropriate.
`.trim();
}

async function uploadReferenceImage(dataUrl) {
  const auth = credentials();
  const image = imageFromDataUrl(dataUrl);
  const slotResponse = await fetch("https://api.higgsfield.ai/files/generate-upload-url", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Key ${auth.apiKey}:${auth.apiSecret}`
    },
    body: JSON.stringify({ content_type: image.contentType }),
    signal: AbortSignal.timeout(30_000)
  });
  if (!slotResponse.ok) throw new Error(`Higgsfield upload authorization failed (${slotResponse.status}).`);

  const slot = await slotResponse.json();
  if (typeof slot.upload_url !== "string" || typeof slot.public_url !== "string") {
    throw new Error("Higgsfield did not return a valid upload slot.");
  }

  const signedHeaders = slot.upload_headers && typeof slot.upload_headers === "object" ? slot.upload_headers : {};
  const signedHeaderNames = new URL(slot.upload_url).searchParams.get("X-Amz-SignedHeaders")?.split(";") ?? [];
  const uploadHeaders = { ...signedHeaders, "Content-Type": image.contentType };
  for (const header of signedHeaderNames) {
    if (header !== "host" && !Object.keys(uploadHeaders).some((name) => name.toLowerCase() === header)) {
      uploadHeaders[header] = "";
    }
  }

  const uploadResponse = await fetch(slot.upload_url, {
    method: "PUT",
    headers: uploadHeaders,
    body: new Uint8Array(image.bytes),
    signal: AbortSignal.timeout(60_000)
  });
  if (!uploadResponse.ok) throw new Error(`Higgsfield image upload failed (${uploadResponse.status}).`);
  return slot.public_url;
}

export async function generateHiggsfieldPageImage({ imageDataUrl, prompt }) {
  const auth = credentials();
  if (!imageDataUrl) throw new Error("아이 그림 참조 이미지가 없습니다.");
  const referenceUrl = await uploadReferenceImage(imageDataUrl);
  const client = createHiggsfieldClient({
    credentials: auth.combined,
    timeout: 180_000,
    maxPollTime: 240_000
  });
  const result = await client.subscribe(process.env.HF_IMAGE_MODEL || "alibaba/qwen-image-3/edit", {
    input: {
      prompt,
      image_urls: [referenceUrl],
      resolution: "1k",
      aspect_ratio: "3:2",
      prompt_extend: false,
      enable_thinking: false
    },
    withPolling: true
  });

  const imageUrl = result.status === "completed" ? result.images?.[0]?.url : "";
  if (!imageUrl) throw new Error(`Higgsfield image generation ended with status: ${result.status}`);

  const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
  if (!imageResponse.ok) throw new Error(`Higgsfield image download failed (${imageResponse.status}).`);
  const contentType = imageResponse.headers.get("content-type")?.split(";")[0] || "image/png";
  if (!/^image\/(png|jpeg|webp)$/.test(contentType)) throw new Error("Higgsfield returned an unsupported image format.");
  const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
  return `data:${contentType};base64,${imageBytes.toString("base64")}`;
}
