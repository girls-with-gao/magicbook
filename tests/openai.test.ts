import { describe, expect, it } from "vitest";
import { extractJsonObject } from "../lib/openai";

describe("extractJsonObject", () => {
  it("일반 JSON 객체를 읽는다", () => {
    expect(extractJsonObject<{ ok: boolean }>('{"ok":true}')).toEqual({ ok: true });
  });

  it("마크다운 코드 울타리를 제거한다", () => {
    expect(extractJsonObject<{ ok: boolean }>('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("객체가 아닌 JSON을 거부한다", () => {
    expect(() => extractJsonObject("[]")).toThrow("올바른 JSON 객체가 아닙니다.");
  });
});
