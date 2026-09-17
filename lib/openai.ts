type InputContent =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

export function extractJsonObject<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("올바른 JSON 객체가 아닙니다.");
  }
  return parsed as T;
}

function responseText(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const record = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  if (record.output_text) return record.output_text;
  return record.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text ?? "";
}

export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function requestOpenAIJson<T>({
  prompt,
  imageDataUrl
}: {
  prompt: string;
  imageDataUrl?: string;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

  const content: InputContent[] = [{ type: "input_text", text: prompt }];
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
  return extractJsonObject<T>(text);
}
