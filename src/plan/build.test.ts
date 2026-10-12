import { describe, expect, it } from "vitest";
import type { Home } from "../kb/schema";
import { buildPlan } from "./build";
import { nextUnlocks } from "./unlock";
import { NOW, childAged, hz } from "./fixtures";

const home: Home = { id: "h1", name: "Home", rooms: ["kitchen", "living_room"] };

describe("buildPlan", () => {
  it("makes one task per hazard per intersecting room", () => {
    const kb = [
      hz("multi", { rooms: ["kitchen", "living_room", "garage"] }),
      hz("garage-only", { rooms: ["garage"] }),
    ];
    const tasks = buildPlan(kb, [childAged("c", 9)], [home], NOW);
    expect(tasks.map((t) => t.room).sort()).toEqual(["kitchen", "living_room"]);
    expect(tasks.every((t) => t.hazard_id === "multi")).toBe(true);
  });
  it("dedupes across children into childIds", () => {
    const kb = [hz("tv", { sev: { "6-12m": 3, "12-24m": 4 } })]; // lives in living_room only
    const tasks = buildPlan(kb, [childAged("a", 9), childAged("b", 20)], [home], NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].childIds).toEqual(["a", "b"]);
  });
  it("is stable and keeps status/owner/due on rebuild", () => {
    const kb = [hz("tv")];
    const first = buildPlan(kb, [childAged("a", 9)], [home], NOW);
    expect(first).toHaveLength(1);
    const edited = [{ ...first[0], status: "done" as const, owner: "Sam", due: "2026-11-01" }];
    const again = buildPlan(kb, [childAged("a", 9), childAged("b", 9)], [home], NOW, edited);
    expect(again[0]).toMatchObject({
      id: first[0].id,
      status: "done",
      owner: "Sam",
      due: "2026-11-01",
    });
    expect(again[0].childIds).toEqual(["a", "b"]);
  });
  it("returns nothing for an empty KB", () => {
    expect(buildPlan([], [childAged("a", 9)], [home], NOW)).toEqual([]);
  });
  it("orders tasks by best score", () => {
    const kb = [hz("low", { sev: { "6-12m": 1 } }), hz("high", { sev: { "6-12m": 5 } })];
    expect(buildPlan(kb, [childAged("a", 9)], [home], NOW).map((t) => t.hazard_id)).toEqual([
      "high",
      "low",
    ]);
  });
});

describe("nextUnlocks", () => {
  it("lists only upcoming hazards inside the horizon, soonest first", () => {
    const kb = [
      hz("now", { unlock: 0 }),
      hz("m5", { unlock: 14, sev: { "12-24m": 3 } }),
      hz("m3", { unlock: 12, sev: { "12-24m": 3 } }),
      hz("m10", { unlock: 19, sev: { "12-24m": 3 } }),
    ];
    const r = nextUnlocks(kb, childAged("a", 9), NOW, 6);
    expect(r.map((x) => x.hazard.id)).toEqual(["m3", "m5"]);
  });
});
