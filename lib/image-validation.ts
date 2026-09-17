export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const allowedPrefix = /^data:image\/(jpeg|png|webp);base64,/;

export type ImageValidation = { ok: true } | { ok: false; message: string };

function decodedByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function validateImageDataUrl(value: unknown): ImageValidation {
  if (typeof value !== "string" || !allowedPrefix.test(value)) {
    return { ok: false, message: "JPG, PNG, WebP 그림 파일만 올릴 수 있어요." };
  }

  const base64 = value.slice(value.indexOf(",") + 1);
  if (!base64 || decodedByteLength(base64) > MAX_IMAGE_BYTES) {
    return { ok: false, message: "그림 파일은 8MB 이하로 올려주세요." };
  }

  return { ok: true };
}
