// OpenAI Responses API 호출과 JSON 응답 파싱. 서버(Node)에서만 실제로 fetch를 호출한다.

/**
 * @template T
 * @param {string} text
 * @returns {T}
 */
export function extractJsonObject(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("올바른 JSON 객체가 아닙니다.");
  }
  return /** @type {T} */ (parsed);
}

/**
 * @param {unknown} data
 */
function responseText(data) {
  if (!data || typeof data !== "object") return "";
  const record = /** @type {{output_text?: string, output?: Array<{content?: Array<{text?: string}>}>}} */ (data);
  if (record.output_text) return record.output_text;
  return record.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text ?? "";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * @template T
 * @param {{prompt: string, imageDataUrl?: string}} params
 * @returns {Promise<T>}
 */
export async function requestOpenAIJson({ prompt, imageDataUrl }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

  const content = [{ type: "input_text", text: prompt }];
  if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content }],
      temperature: 0.6
    }),
    signal: AbortSignal.timeout(45_000)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details.slice(0, 300)}`);
  }

  const text = responseText(await response.json());
  if (!text) throw new Error("AI 응답에 이야기 내용이 없습니다.");
  return extractJsonObject(text);
}
