import { describe, expect, it } from "vitest";
import { loadKb } from "../kb";
import type { Home, Task } from "../kb/schema";
import { cuesForRoom } from "../perception";
import { buildPlan } from "./build";
import { childAged, NOW } from "./fixtures";
import {
  anyChecked,
  applyRoomCheck,
  firstUnchecked,
  isChecked,
  markChecked,
  migrateChecks,
  prefillCues,
  recheckDue,
} from "./roomCheck";

const kb = loadKb();
const child = childAged("c1", 14);
const home: Home = { id: "h1", name: "Home", rooms: ["kitchen", "bathroom"], checks: {} };

// Two cues that lead to different hazards, so unticking one leaves the other.
function twoCues() {
  const cues = cuesForRoom(kb, "kitchen", child, NOW);
  const a = cues[0]!;
  const b = cues.find((c) => !c.hazardIds.some((id) => a.hazardIds.includes(id)))!;
  return [a, b] as const;
}

const check = (cues: string[], tasks: Task[] = [], h: Home = home) =>
  applyRoomCheck({ kb, home: h, room: "kitchen", cues, child, tasks, now: NOW });

describe("room checks", () => {
  it("an unchecked room has no tasks and is reported as unchecked", () => {
    expect(isChecked(home, "kitchen")).toBe(false);
    expect(firstUnchecked([home])).toEqual({ home, room: "kitchen" });
    expect(anyChecked([home])).toBe(false);
  });

  it("the plan engine still ranks hazards for a room (pure functions unchanged)", () => {
    expect(buildPlan(kb, [child], [home], NOW).length).toBeGreaterThan(0);
  });

  it("ticked cues become tasks and the room is stamped checked", () => {
    const [a] = twoCues();
    const r = check([a.cue]);
    expect(r.tasks.length).toBeGreaterThan(0);
    expect(r.tasks.every((t) => t.status === "todo" && t.room === "kitchen")).toBe(true);
    expect(r.fresh).toBe(r.added.length);
    expect(r.home.checks?.kitchen).toEqual({ checkedAt: NOW.toISOString(), cues: [a.cue] });
    expect(isChecked(r.home, "kitchen")).toBe(true);
  });

  it("zero taps is a valid check: checked, no tasks", () => {
    const r = check([]);
    expect(r.tasks).toHaveLength(0);
    expect(isChecked(r.home, "kitchen")).toBe(true);
    expect(isChecked(markChecked(home, "bathroom", NOW), "bathroom")).toBe(true);
  });

  it("editing removes only untouched to-do tasks for unticked cues", () => {
    const [a, b] = twoCues();
    const first = check([a.cue, b.cue]);
    const doneOne = first.tasks.find((t) => t.hazard_id === a.hazardId)!;
    const ownedOne = first.tasks.find((t) => t.hazard_id === b.hazardId)!;
    const tasks = first.tasks.map((t) =>
      t.id === doneOne.id
        ? { ...t, status: "done" as const }
        : t.id === ownedOne.id
          ? { ...t, owner: "Sam" }
          : t,
    );
    // Untick everything: done and owned tasks stay.
    const r = check([], tasks, first.home);
    expect(r.tasks.find((t) => t.id === doneOne.id)?.status).toBe("done");
    expect(r.tasks.find((t) => t.id === ownedOne.id)).toBeDefined();
    // Every remaining task is one the person touched.
    expect(r.tasks.every((t) => t.status !== "todo" || t.owner)).toBe(true);
    expect(r.removed).toBe(first.tasks.length - r.tasks.length);
  });

  it("unticking a cue drops its untouched to-do task but keeps the other cue's task", () => {
    const [a, b] = twoCues();
    const first = check([a.cue, b.cue]);
    const r = check([a.cue], first.tasks, first.home);
    expect(r.tasks.some((t) => t.hazard_id === a.hazardId)).toBe(true);
    const onlyB = first.tasks.filter(
      (t) => b.hazardIds.includes(t.hazard_id) && !a.hazardIds.includes(t.hazard_id),
    );
    expect(onlyB.length).toBeGreaterThan(0);
    for (const t of onlyB) expect(r.tasks.some((x) => x.id === t.id)).toBe(false);
    expect(r.removed).toBeGreaterThan(0);
  });

  it("re-opening pre-ticks the earlier taps", () => {
    const [a, b] = twoCues();
    const first = check([a.cue, b.cue]);
    const offered = cuesForRoom(kb, "kitchen", child, NOW).map((c) => c.cue);
    const pre = prefillCues(kb, first.home, "kitchen", first.tasks, offered);
    expect(pre).toEqual(expect.arrayContaining([a.cue, b.cue]));
  });

  it("re-check is due after 30 days, not before", () => {
    const [a] = twoCues();
    const h = check([a.cue]).home;
    expect(recheckDue(h, "kitchen", new Date(NOW.getTime() + 29 * 864e5))).toBe(false);
    expect(recheckDue(h, "kitchen", new Date(NOW.getTime() + 31 * 864e5))).toBe(true);
    expect(recheckDue(h, "bathroom", NOW)).toBe(false); // never checked
  });
});

describe("migrating saves from before room checks", () => {
  const legacy: Home = { id: "h", name: "Old", rooms: ["kitchen", "bathroom"] };
  const mk = (id: string, room: "kitchen" | "bathroom", extra: Partial<Task> = {}): Task => ({
    id,
    hazard_id: "x",
    home_id: "h",
    room,
    childIds: ["c"],
    status: "todo",
    ...extra,
  });

  it("drops guessed to-do tasks, keeps touched and gear ones, marks kept rooms checked", () => {
    const tasks = [
      mk("a", "kitchen"),
      mk("b", "kitchen", { status: "done" }),
      mk("c", "bathroom"),
      mk("d", "bathroom", { hazard_id: "gear:crib:slats" }),
    ];
    const r = migrateChecks([legacy], tasks, NOW);
    expect(r.tasks.map((t) => t.id).sort()).toEqual(["b", "d"]);
    expect(Object.keys(r.homes[0]!.checks!)).toEqual(["kitchen"]);
  });

  it("leaves homes that already have checks alone (idempotent)", () => {
    const once = migrateChecks([legacy], [mk("a", "kitchen")], NOW);
    const twice = migrateChecks(once.homes, once.tasks, NOW);
    expect(twice).toEqual(once);
  });
});
