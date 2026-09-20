export const OPENAI_IMAGE_NEGATIVE_PROMPT = "No speech bubbles, no thought bubbles, no dialogue balloons, no captions, no text, no letters, no numbers, no logos, no labels, no signs, no posters, no screens, no UI, no comic panels.";

export function buildOpenAIPagePrompt({
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
Create one standalone, full-bleed, silent picture-book illustration. Use the attached child drawing as the authoritative visual reference for the protagonist and drawing style.

Preserve the recognizable child-drawn identity: same simple silhouette, proportions, face placement, main colors, uneven outlines, crayon or marker texture, and imperfect hand-drawn quality. Do not make the protagonist realistic, polished, or generic.

Use the uploaded image as a character and style reference, not as a finished scene to copy. Ignore paper edges, photo shadows, handwriting, speech bubbles, thought bubbles, labels, captions, and unrelated marks. If the reference image contains handwritten words or bubble shapes, remove them completely instead of preserving, cropping, translating, or redrawing them. Build a new scene around the recognizable child-drawn character.

Parent-confirmed character(s): ${confirmedCharacters || "the main subject drawn by the child"}
Visual setting: ${place || "a warm imaginative world"}
Visual props: ${confirmedObjects || "simple story-relevant props"}
Mood: ${mood || "warm and curious"}
Visual story beat: ${storyBeat}
Composition: ${framingGuide}

Use a 7-year-old child's crayon-and-marker picture style: clumsy wobbly outlines, uneven simple shapes, flat bright colors, scribbled coloring, visible paper texture, and no realistic shading or perspective.

Show the exact page action through pose, facial expression, and visible movement. Each generated page should feel like a different story moment and camera shot, not the same portrait with swapped props. If the scene changes location, show a simple visual bridge such as a path, sound, light, invitation, or object from the previous scene. Avoid adding unrelated objects like boats, boxes, portals, jewels, or magic items unless the story beat explicitly asks for them.

${OPENAI_IMAGE_NEGATIVE_PROMPT}
Do not add empty bubbles, empty white ovals, bubble tails, cloud outlines, thought circles, or any blank dialogue shapes either. Never depict conversation with a bubble; show it only through the characters' expressions and gestures.
`.trim();
}

function responseImageBase64(data) {
  if (!data || typeof data !== "object") return "";
  const output = Array.isArray(data.output) ? data.output : [];
  return output.find((item) => item && item.type === "image_generation_call" && typeof item.result === "string")?.result || "";
}

export async function generateOpenAIPageImage({ imageDataUrl, prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  if (!imageDataUrl) throw new Error("아이 그림 참조 이미지가 없습니다.");

  const outputFormat = process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "jpeg";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_RESPONSE_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: imageDataUrl }
          ]
        }
      ],
      tools: [
        {
          type: "image_generation",
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
          size: "1536x1024",
          quality: "medium",
          output_format: outputFormat,
          output_compression: 85,
          input_fidelity: "high"
        }
      ],
      tool_choice: { type: "image_generation" }
    }),
    signal: AbortSignal.timeout(240_000)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI image request failed (${response.status}): ${details.slice(0, 500)}`);
  }

  const imageBase64 = responseImageBase64(await response.json());
  if (!imageBase64) throw new Error("OpenAI image response did not include an image.");
  return `data:image/${outputFormat};base64,${imageBase64}`;
}
