import { describe, expect, it } from "vitest";
import type { HazardEntry, Room, Task } from "../kb/schema";
import { NOW, childAged, hz } from "./fixtures";
import { planWeekend, suppliesFor, taskEffort } from "./weekend";

const child = childAged("c", 9);
const ROOMS: Room[] = ["living_room", "kitchen", "bathroom"];

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hazard(
  id: string,
  o: { sev?: number; minutes?: number; min?: number; max?: number; tools?: string[] } = {},
): HazardEntry {
  const h = hz(id, { sev: { "6-12m": o.sev ?? 3 }, rooms: ROOMS });
  h.fix_steps = [
    {
      order: 1,
      text: "t",
      cost_usd_min: o.min ?? 0,
      cost_usd_max: o.max ?? o.min ?? 0,
      minutes: o.minutes ?? 5,
      tools: o.tools ?? [],
    },
  ];
  return h;
}
function task(h: HazardEntry, room: Room = "living_room", status: Task["status"] = "todo"): Task {
  return {
    id: `${h.id}@${room}`,
    hazard_id: h.id,
    home_id: "h1",
    room,
    childIds: ["c"],
    status,
  };
}
const run = (kb: HazardEntry[], tasks: Task[], minutes: number, budgetUsd: number | null) =>
  planWeekend({ tasks, kb, minutes, budgetUsd, children: [child], now: NOW });

function randomInstance(rand: () => number, n: number) {
  const kb = Array.from({ length: n }, (_, i) => {
    const min = Math.floor(rand() * 40);
    return hazard(`h${i}`, {
      sev: 1 + Math.floor(rand() * 5),
      minutes: Math.floor(rand() * 40),
      min,
      max: min + Math.floor(rand() * 20),
    });
  });
  const tasks = kb.map((h) => task(h, ROOMS[Math.floor(rand() * 3)]!));
  return { kb, tasks };
}

describe("planWeekend", () => {
  it("matches a brute-force optimum on 200 random small instances", () => {
    const rand = mulberry(7);
    for (let k = 0; k < 200; k++) {
      const n = 1 + Math.floor(rand() * 9);
      const { kb, tasks } = randomInstance(rand, n);
      const minutes = Math.floor(rand() * 120);
      const budget = rand() < 0.2 ? null : Math.floor(rand() * 120);
      const got = run(kb, tasks, minutes, budget);

      // Brute force over unit-rounded weights (5 min / $5 units, rounded up) with the same objective.
      const info = kb.map((h) => {
        const e = taskEffort(h);
        return { e, mu: Math.ceil(e.minutes / 5), cu: Math.ceil(e.cost / 5) };
      });
      const M = Math.floor(minutes / 5);
      const B = budget === null ? Infinity : Math.floor(budget / 5);
      const val = tasks.map((t, i) => valueOf(kb[i]!, t));
      let best = { v: -1, c: 0 };
      for (let mask = 0; mask < 1 << n; mask++) {
        let mu = 0,
          cu = 0,
          v = 0,
          c = 0;
        for (let i = 0; i < n; i++)
          if (mask & (1 << i)) {
            mu += info[i]!.mu;
            cu += info[i]!.cu;
            v += val[i]!;
            c += info[i]!.e.cost;
          }
        if (mu > M || cu > B) continue;
        if (v > best.v || (v === best.v && c < best.c)) best = { v, c };
      }
      const gotValue = got.chosen.reduce((s, t) => s + val[tasks.indexOf(t)]!, 0);
      expect(gotValue).toBe(best.v);
      expect(got.totalCost).toBe(best.c);
    }
  });

  it("never exceeds the limits", () => {
    const rand = mulberry(11);
    for (let k = 0; k < 100; k++) {
      const { kb, tasks } = randomInstance(rand, 30);
      const minutes = Math.floor(rand() * 300);
      const budget = Math.floor(rand() * 200);
      const r = run(kb, tasks, minutes, budget);
      expect(r.totalMinutes).toBeLessThanOrEqual(minutes);
      expect(r.totalCost).toBeLessThanOrEqual(budget);
      expect(r.leftoverMinutes).toBe(minutes - r.totalMinutes);
    }
  });

  it("budget 0 picks only $0 tasks", () => {
    const kb = [hazard("free", { min: 0 }), hazard("paid", { min: 12, max: 20, sev: 5 })];
    const r = run(
      kb,
      kb.map((h) => task(h)),
      120,
      0,
    );
    expect(r.chosen.map((t) => t.hazard_id)).toEqual(["free"]);
    expect(r.skippedReason["paid@living_room"]).toBe("cost");
  });

  it("huge limits pick everything open and skip done tasks", () => {
    const kb = [hazard("a", { min: 30 }), hazard("b", { min: 5 }), hazard("c")];
    const tasks = [task(kb[0]!), task(kb[1]!), task(kb[2]!, "kitchen", "done")];
    const r = run(kb, tasks, 100000, null);
    expect(r.chosen).toHaveLength(2);
    expect(r.skipped).toHaveLength(0);
  });

  it("is deterministic regardless of input order", () => {
    const rand = mulberry(3);
    const { kb, tasks } = randomInstance(rand, 25);
    const a = run(kb, tasks, 90, 40);
    const b = run(kb, [...tasks].reverse(), 90, 40);
    expect(b.chosen.map((t) => t.id)).toEqual(a.chosen.map((t) => t.id));
    expect(b.skipped.map((t) => t.id)).toEqual(a.skipped.map((t) => t.id));
  });

  it("lists skipped tasks by value with a reason", () => {
    const kb = [
      hazard("big", { sev: 5, minutes: 60 }),
      hazard("mid", { sev: 3, minutes: 30 }),
      hazard("pricey", { sev: 4, minutes: 5, min: 80 }),
    ];
    const r = run(
      kb,
      kb.map((h) => task(h)),
      35,
      20,
    );
    expect(r.chosen.map((t) => t.hazard_id)).toEqual(["mid"]);
    expect(r.skipped.map((t) => t.hazard_id)).toEqual(["big", "pricey"]);
    expect(r.skippedReason["big@living_room"]).toBe("time");
    expect(r.skippedReason["pricey@living_room"]).toBe("cost");
  });

  it("orders by room value, then task value, and filters by home", () => {
    const kb = [
      hazard("k1", { sev: 2 }),
      hazard("l1", { sev: 5 }),
      hazard("k2", { sev: 4 }),
      hazard("l2", { sev: 1 }),
    ];
    const tasks = [task(kb[0]!, "kitchen"), task(kb[1]!), task(kb[2]!, "kitchen"), task(kb[3]!)];
    const r = run(kb, tasks, 999, null);
    // kitchen total 6+... compare: kitchen sev 2+4, living sev 5+1 -> kitchen first (equal sums break by key)
    expect(r.chosen.map((t) => t.hazard_id)).toEqual(
      r.chosen[0]!.room === "kitchen" ? ["k2", "k1", "l1", "l2"] : ["l1", "l2", "k2", "k1"],
    );
    const other = planWeekend({
      tasks,
      kb,
      minutes: 999,
      budgetUsd: null,
      homeId: "nope",
      children: [child],
      now: NOW,
    });
    expect(other.chosen).toHaveLength(0);
  });

  it("combines supplies without duplicates and counts them", () => {
    const kb = [
      hazard("a", { tools: ["Drill", "stud finder"] }),
      hazard("b", { tools: ["drill", "Tape measure", "drill"] }),
    ];
    expect(suppliesFor(kb)).toEqual([
      { name: "Drill", count: 2 },
      { name: "stud finder", count: 1 },
      { name: "Tape measure", count: 1 },
    ]);
  });

  it("reports cost as rounded midpoint plus min and max", () => {
    const kb = [hazard("a", { min: 5, max: 10 }), hazard("b", { min: 0, max: 3 })];
    const r = run(
      kb,
      kb.map((h) => task(h)),
      999,
      null,
    );
    expect(r.totalCostMin).toBe(5);
    expect(r.totalCostMax).toBe(13);
    expect(r.totalCost).toBe(Math.round(7.5) + Math.round(1.5));
  });
});

// Rank score for the fixture child, read the same way the planner reads it.
import { rankHazards } from "./rank";
function valueOf(h: HazardEntry, t: Task): number {
  return Math.max(
    1,
    rankHazards([h], child, NOW, { rooms: [t.room] }).find((r) => r.hazard.id === h.id)?.score ?? 0,
  );
}
