import { describe, expect, it } from "vitest";
import { buildPlan } from "./build";
import { childAged, hz, NOW } from "./fixtures";
import { previewAt, shiftMonths, tasksToAdd } from "./preview";
import { rankHazards } from "./rank";
import { ageMonths } from "./stage";
import type { Home } from "../kb/schema";

const ALL = { "0-3m": 3, "3-6m": 3, "6-12m": 3, "12-24m": 3, "24-36m": 3, "36-60m": 3 };
const kb = [
  hz("a-now", { unlock: 0, sev: ALL }),
  hz("b-crawl", { unlock: 8, sev: ALL }),
  hz("c-climb", { unlock: 12, sev: ALL }),
  hz("d-stairs", { unlock: 14, sev: ALL }),
  hz("e-late", { unlock: 30, sev: ALL }),
  hz("f-gone", { unlock: 2, sev: { "0-3m": 2, "3-6m": 2 } }), // no severity after 6 months
];
const child = childAged("kid", 9);
const ids = (r: { hazard: { id: string } }[]) => r.map((x) => x.hazard.id);

describe("previewAt", () => {
  it("0 months equals the current plan", () => {
    const p = previewAt(kb, child, 0, NOW);
    expect(p.ranked).toEqual(rankHazards(kb, child, NOW));
    expect(p.ageMonths).toBe(9);
  });

  it("shifts age by exactly the months asked, even at month ends", () => {
    for (const day of [1, 14, 15, 28, 30, 31]) {
      const now = new Date(2026, 0, day);
      const born = new Date(2026, 0 - 5 - (day < 15 ? 1 : 0), 1);
      const c = {
        id: "x",
        nickname: "x",
        birth_month: born.getMonth() + 1,
        birth_year: born.getFullYear(),
      };
      const base = ageMonths(c, now);
      for (let n = 0; n <= 18; n++) expect(ageMonths(c, shiftMonths(now, n))).toBe(base + n);
    }
  });

  it("unlocks are monotonic: the active set only grows while severity exists", () => {
    const full = kb.filter((h) => h.id !== "f-gone");
    let before = new Set<string>();
    for (let n = 0; n <= 18; n++) {
      const active = new Set(
        previewAt(full, child, n, NOW)
          .ranked.filter((r) => r.status === "active")
          .map((r) => r.hazard.id),
      );
      for (const id of before) expect(active.has(id)).toBe(true);
      before = active;
    }
  });

  it("newlyActive switches on exactly at the unlock month", () => {
    // child is 9 months: b-crawl (8) active already, c-climb (12) at +3, d-stairs (14) at +5.
    expect(ids(previewAt(kb, child, 2, NOW).newlyActive)).toEqual([]);
    expect(ids(previewAt(kb, child, 3, NOW).newlyActive)).toEqual(["c-climb"]);
    expect(ids(previewAt(kb, child, 4, NOW).newlyActive)).toEqual([]);
    expect(ids(previewAt(kb, child, 5, NOW).newlyActive)).toEqual(["d-stairs"]);
  });

  it("upcoming risks inside the lead time are not newly active yet", () => {
    const p = previewAt(kb, child, 1, NOW);
    expect(p.ranked.find((r) => r.hazard.id === "c-climb")?.status).toBe("upcoming");
    expect(ids(p.newlyActive)).not.toContain("c-climb");
  });

  it("dropped lists hazards that lose their severity at the next stage", () => {
    // f-gone has no severity at 6-12m, so it is already absent for a 9 month old; use a 5 month old.
    const young = childAged("y", 5);
    expect(ids(previewAt(kb, young, 0, NOW).ranked)).toContain("f-gone");
    const p = previewAt(kb, young, 1, NOW);
    expect(p.dropped.map((h) => h.id)).toEqual(["f-gone"]);
    expect(ids(p.ranked)).not.toContain("f-gone");
  });

  it("unlocksBy groups hazards by months from today", () => {
    const p = previewAt(kb, child, 6, NOW);
    expect([...p.unlocksBy.keys()]).toEqual([3, 5]);
    expect(ids(p.unlocksBy.get(3)!)).toEqual(["c-climb"]);
    expect(ids(p.unlocksBy.get(5)!)).toEqual(["d-stairs"]);
  });

  it("handles a newborn without looking before birth", () => {
    expect(() => previewAt(kb, childAged("nb", 0), 0, NOW)).not.toThrow();
  });
});

describe("tasksToAdd", () => {
  const homes: Home[] = [{ id: "h", name: "Home", rooms: ["living_room"] }];
  it("returns only tasks the plan does not have yet", () => {
    const current = buildPlan(kb, [child], homes, NOW);
    const add = tasksToAdd(kb, child, homes, 6, NOW, current);
    expect(add.map((t) => t.hazard_id).sort()).toEqual(["c-climb", "d-stairs"]);
    expect(tasksToAdd(kb, child, homes, 0, NOW, current)).toEqual([]);
    expect(tasksToAdd(kb, child, homes, 6, NOW, [...current, ...add])).toEqual([]);
  });
});
