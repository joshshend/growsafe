import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// iOS Safari widens native date/time inputs past their column unless appearance is reset.
describe("form control sizing (index.css)", () => {
  const css = readFileSync("src/index.css", "utf8");
  const start = css.indexOf("input:not(");
  const rule = css.slice(start, css.indexOf("}", start));
  it("caps every input, select and textarea at its column", () => {
    for (const decl of [
      "width: 100%",
      "max-width: 100%",
      "min-width: 0",
      "box-sizing: border-box",
      "-webkit-appearance: none",
      "appearance: none",
      "min-height: 52px",
    ])
      expect(rule).toContain(decl);
  });
  it("keeps checkboxes and radios native", () => {
    expect(rule).toContain('[type="checkbox"]');
    expect(rule).toContain('[type="radio"]');
  });
});
