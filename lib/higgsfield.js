import { createHiggsfieldClient } from "@higgsfield/client/v2";

export const HIGGSFIELD_NEGATIVE_PROMPT = "speech bubbles, thought bubbles, dialogue balloons, comic panels, callouts, outlined floating shapes, captions, subtitles, lettering, typography, text, words, letters, numbers, logos, labels, signs, posters, plaques, diagrams, text on screens, writing of any kind";

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
  characters = [],
  place,
  objects = [],
  mood,
  visualDescription,
  pageNumber,
  framing
}) {
  const framingGuide = {
    close: "Use a close-up from a fresh camera angle to focus on the character's expression or the important discovered detail. Keep enough of the character visible to recognize the child's design.",
    medium: "Use an eye-level medium shot showing the character doing the page's specific action, with nearby story props and setting visible.",
    wide: "Use a wide establishing shot with a distinct camera angle. Let the setting and its depth carry the scene; keep the protagonist smaller but unmistakably recognizable."
  }[framing] || "Use a balanced storybook composition with a clearly readable setting.";
  const confirmedCharacters = characters.filter((item) => typeof item === "string" && item.trim()).join(", ");
  const confirmedObjects = objects.filter((item) => typeof item === "string" && item.trim()).join(", ");
  const fallbackBeat = [
    "Introduce the protagonist within the setting in a clear establishing moment.",
    "Show the protagonist exploring the setting and moving toward a story-relevant object.",
    "Focus on an expressive interaction or discovery involving the protagonist.",
    "Show a gentle resolution or an inviting pause that suggests what could happen next."
  ][Math.max(0, Math.min(3, Number(pageNumber) - 1 || 0))];
  const storyBeat = typeof visualDescription === "string" && visualDescription.trim()
    ? visualDescription.trim().slice(0, 240)
    : fallbackBeat;

  return `
Create one standalone, full-bleed, silent picture-book illustration. This output must be image only, not a designed book page or comic. Each illustration in the sequence must feel like a different story moment and camera shot, not a repeated portrait with a swapped background. Show every interaction through pose, facial expression, and visible action only; the characters never speak on the page.

The attached image is the authoritative visual reference for the child-drawn character(s) and drawing style. Reconstruct the drawn subject as a storybook character while preserving its recognizable design: the same silhouette and proportions, face placement, distinctive parts, exact main colors, uneven child-drawn outlines, and crayon or marker texture. Keep those identity and style traits consistent across every page; only pose and expression may change. Do not make the character realistic, polished, or a generic version of its species. Follow the parent-confirmed character identity below even if the drawing could be mistaken for something else.

Use the uploaded drawing as a character and style reference, not as a finished scene to copy. Ignore and replace its original background, paper edges, photo details, handwriting, speech bubbles, thought bubbles, labels, captions, and unrelated marks. If the reference image contains handwritten words or bubble shapes, remove them completely instead of preserving, cropping, translating, or redrawing them. Build a new setting around the recognizable child-drawn character(s) using the visual details below. Integrate the character naturally into the scene; do not paste the source image, frame it, split the page into panels, or leave the original background attached.

Parent-confirmed character(s): ${confirmedCharacters || "the main subject drawn by the child"}
Visual setting: ${place || "a warm imaginative world"}
Visual props: ${confirmedObjects || "simple story-relevant natural props"}
Mood: ${mood || "warm and curious"}
Visual story beat: ${storyBeat}

Composition: ${framingGuide}
Use the entire canvas for the illustrated scene. Vary pose, camera distance, viewpoint, and environment details to match this story beat while keeping the protagonist's identity and illustration style consistent.

Use this simple art direction consistently on every page: a 7-year-old child's crayon-and-marker picture, clumsy wobbly outlines, uneven simple shapes, flat bright colors, scribbled coloring, no realistic shading or perspective, and visible paper texture. Preserve the child's imperfect drawing quality instead of converting it into polished digital cartoon art.

The illustration contains no text of any kind and no comic devices. Absolutely no speech bubbles, thought bubbles, dialogue balloons, callouts, floating outlined shapes, captions, lettering, words, numbers, logos, labels, handwriting, signs, posters, noticeboards, exhibit plaques, diagrams, screens, menus, book covers, or pages. Do not add empty bubbles, empty white ovals, bubble tails, cloud outlines, thought circles, or any blank dialogue shapes either. Never depict conversation with a bubble; show it only through the characters' expressions and gestures. Keep visible surfaces blank and use only scenery and story-relevant objects. If the setting is a museum, show exhibits and scenery only, with no informational displays. Do not render, quote, or reproduce any words from these production instructions. Keep everything safe, cozy, and age-appropriate.
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
      negative_prompt: HIGGSFIELD_NEGATIVE_PROMPT,
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
