import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateImageDataUrl } from "../public/shared/image-validation.js";

describe("validateImageDataUrl", () => {
  it.each(["jpeg", "png", "webp"])("%s 이미지를 허용한다", (type) => {
    expect(validateImageDataUrl(`data:image/${type};base64,ZmFrZQ==`)).toEqual({ ok: true });
  });

  it("이미지가 아닌 데이터를 거부한다", () => {
    expect(validateImageDataUrl("data:text/plain;base64,ZmFrZQ==")).toEqual({
      ok: false,
      message: "JPG, PNG, WebP 그림 파일만 올릴 수 있어요."
    });
  });

  it("8MB를 넘는 이미지를 거부한다", () => {
    const tooLarge = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64");
    expect(validateImageDataUrl(`data:image/png;base64,${tooLarge}`)).toEqual({
      ok: false,
      message: "그림 파일은 8MB 이하로 올려주세요."
    });
  });
});
