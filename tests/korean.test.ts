import { describe, expect, it } from "vitest";
import { withParticle } from "../lib/korean";

describe("withParticle", () => {
  it("받침이 있으면 앞 조사를, 없으면 뒤 조사를 붙인다", () => {
    expect(withParticle("수민", "이가", "가")).toBe("수민이가");
    expect(withParticle("지우", "이가", "가")).toBe("지우가");
    expect(withParticle("민준", "이", "")).toBe("민준이");
    expect(withParticle("하윤", "이는", "는")).toBe("하윤이는");
  });

  it("이름이 비었으면 '아이'로 대신한다", () => {
    expect(withParticle("   ", "이가", "가")).toBe("아이가");
  });
});
