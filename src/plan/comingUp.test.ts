import { describe, expect, it } from "vitest";
import { loadKb } from "../kb";
import { loadMilestones } from "../kb/stages";
import { comingUp } from "./comingUp";
import { childAged, NOW } from "./fixtures";

const kb = loadKb();
const cps = loadMilestones();

describe("comingUp", () => {
  it("at 9 months lists the 12, 15 and 18 month checkpoints, with hazards that start by 12", () => {
    const lines = comingUp(kb, cps, childAged("a", 9), NOW);
    expect(lines.map((l) => l.checkpoint.months)).toEqual([12, 15, 18]);
    expect(lines.map((l) => l.monthsAway)).toEqual([3, 6, 9]);
    const first = lines[0].hazards.map((r) => r.hazard);
    expect(first.length).toBeGreaterThan(0);
    for (const h of first) {
      expect(h.unlock_age_months).toBeGreaterThan(9);
      expect(h.unlock_age_months).toBeLessThanOrEqual(12);
    }
    expect(first.map((h) => h.id)).toContain("garage-chemicals-tools-reach");
  });

  it("every upcoming hazard in the window appears on exactly one line", () => {
    for (const months of [0, 1, 3, 4, 5, 7, 9, 11]) {
      const lines = comingUp(kb, cps, childAged("a", months), NOW);
      const last = lines[lines.length - 1]?.checkpoint.months ?? 0;
      const ids = lines.flatMap((l) => l.hazards.map((r) => r.hazard.id));
      expect(new Set(ids).size).toBe(ids.length);
      const expected = kb
        .filter((h) => h.unlock_age_months > months && h.unlock_age_months <= last)
        .map((h) => h.id)
        .sort();
      expect([...ids].sort()).toEqual(expected);
    }
  });

  it("is empty once there is no checkpoint left in the window", () => {
    expect(comingUp(kb, cps, childAged("a", 62), NOW)).toEqual([]);
  });

  it("keeps lines without hazards (milestone only)", () => {
    const lines = comingUp(kb, cps, childAged("a", 13), NOW);
    expect(lines[0].checkpoint.months).toBe(15);
    expect(lines[0].hazards).toEqual([]);
  });
});
