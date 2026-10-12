import { describe, expect, it } from "vitest";
import { ageMonths, stageForAge, stageLabelKey } from "./stage";
import { NOW, childAged } from "./fixtures";

describe("stage", () => {
  it("computes age from month/year using the 15th", () => {
    expect(ageMonths(childAged("a", 9), NOW)).toBe(9);
    // Same child on the 14th: month not yet complete.
    expect(ageMonths(childAged("a", 9), new Date(2026, 9, 14))).toBe(8);
  });
  it("age crossing a month boundary changes the stage", () => {
    const c = { id: "c", nickname: "c", birth_month: 4, birth_year: 2026 };
    expect(stageForAge(ageMonths(c, new Date(2026, 9, 14)))).toBe("3-6m"); // 5 months
    expect(stageForAge(ageMonths(c, new Date(2026, 9, 15)))).toBe("6-12m"); // 6 months
  });
  it("maps band edges", () => {
    expect(stageForAge(0)).toBe("0-3m");
    expect(stageForAge(2)).toBe("0-3m");
    expect(stageForAge(3)).toBe("3-6m");
    expect(stageForAge(12)).toBe("12-24m");
    expect(stageForAge(36)).toBe("36-60m");
    expect(stageForAge(80)).toBe("36-60m");
  });
  it("throws a clear error for a birth in the future", () => {
    expect(() =>
      ageMonths({ id: "x", nickname: "Ada", birth_month: 12, birth_year: 2026 }, NOW),
    ).toThrow(/future/);
  });
  it("does not throw for a baby born this month", () => {
    expect(
      ageMonths(
        { id: "x", nickname: "n", birth_month: 10, birth_year: 2026 },
        new Date(2026, 9, 3),
      ),
    ).toBe(0);
  });
  it("gives label keys", () => {
    expect(stageLabelKey("0-3m")).toBe("stage.0-3m");
  });
});
