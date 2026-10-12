import { describe, expect, it } from "vitest";
import { LEAD_TIME_MONTHS } from "../kb/schema";
import { rankHazards } from "./rank";
import { NOW, childAged, hz } from "./fixtures";

const ids = (r: { hazard: { id: string } }[]) => r.map((x) => x.hazard.id);

describe("rankHazards", () => {
  const child = childAged("c", 9);

  it("orders by severity", () => {
    const kb = [hz("low", { sev: { "6-12m": 2 } }), hz("high", { sev: { "6-12m": 5 } })];
    expect(ids(rankHazards(kb, child, NOW))).toEqual(["high", "low"]);
  });
  it("sourced evidence breaks a severity tie", () => {
    const kb = [hz("a", { sev: { "6-12m": 3 } }), hz("b", { sev: { "6-12m": 3 }, sourced: true })];
    const r = rankHazards(kb, child, NOW);
    expect(ids(r)).toEqual(["b", "a"]);
    expect(r[0].score - r[1].score).toBe(3);
  });
  it("ties break by lower cost, then id", () => {
    const kb = [
      hz("z-cheap", { cost: 1 }),
      hz("a-pricey", { cost: 50 }),
      hz("b-cheap", { cost: 1 }),
    ];
    expect(ids(rankHazards(kb, child, NOW))).toEqual(["b-cheap", "z-cheap", "a-pricey"]);
  });
  it("active vs upcoming at the boundary months", () => {
    const kb = [
      hz("now", { unlock: 9 }),
      hz("edge", { unlock: 9 + LEAD_TIME_MONTHS, sev: { "6-12m": 3, "12-24m": 3 } }),
      hz("far", { unlock: 9 + LEAD_TIME_MONTHS + 1, sev: { "12-24m": 3 } }),
    ];
    const r = rankHazards(kb, child, NOW);
    expect(ids(r).sort()).toEqual(["edge", "now"]);
    expect(r.find((x) => x.hazard.id === "now")).toMatchObject({
      status: "active",
      unlocksInMonths: null,
    });
    expect(r.find((x) => x.hazard.id === "edge")).toMatchObject({
      status: "upcoming",
      unlocksInMonths: LEAD_TIME_MONTHS,
    });
  });
  it("upcoming gets the unlock boost and an unlock reason", () => {
    const kb = [hz("soon", { unlock: 10, sev: { "6-12m": 3 } })];
    const [r] = rankHazards(kb, child, NOW);
    expect(r.score).toBe(35);
    expect(r.reasons.map((x) => x.kind)).toEqual(["severity", "evidence", "unlock", "cost"]);
  });
  it("excludes active hazards with no severity for the current stage", () => {
    expect(rankHazards([hz("x", { sev: { "12-24m": 4 } })], child, NOW)).toEqual([]);
  });
  it("ageing across a month boundary changes stage and order", () => {
    const kb = [
      hz("crawl", { sev: { "3-6m": 2, "6-12m": 5 } }),
      hz("early", { sev: { "3-6m": 4, "6-12m": 1 } }),
    ];
    const c = { id: "c", nickname: "c", birth_month: 4, birth_year: 2026 };
    const before = rankHazards(kb, c, new Date(2026, 9, 14)); // 5 months
    const after = rankHazards(kb, c, new Date(2026, 9, 15)); // 6 months
    expect(before[0].stage).toBe("3-6m");
    expect(ids(before)).toEqual(["early", "crawl"]);
    expect(after[0].stage).toBe("6-12m");
    expect(ids(after)).toEqual(["crawl", "early"]);
  });
  it("filters by room", () => {
    const kb = [hz("k", { rooms: ["kitchen"] }), hz("l", { rooms: ["living_room"] })];
    expect(ids(rankHazards(kb, child, NOW, { rooms: ["kitchen"] }))).toEqual(["k"]);
  });
  it("handles an empty KB", () => {
    expect(rankHazards([], child, NOW)).toEqual([]);
  });
  it("throws for a child born in the future", () => {
    expect(() =>
      rankHazards([hz("a")], { id: "f", nickname: "F", birth_month: 1, birth_year: 2027 }, NOW),
    ).toThrow(/future/);
  });
});
