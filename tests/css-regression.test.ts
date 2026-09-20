import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

function block(selector: string) {
  const match = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]+)\\}`, "m").exec(css);
  return match?.[1] ?? "";
}

describe("CSS regressions", () => {
  it("keeps language option marks inside their icon boxes", () => {
    const mark = block(".language-mark");
    const compact = block(".language-mark.compact");

    expect(mark).toContain("overflow: hidden");
    expect(mark).toContain("white-space: nowrap");
    expect(mark).toContain("line-height: 1");
    expect(compact).toContain("font-size");
  });
});
