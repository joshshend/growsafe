import { describe, expect, it } from "vitest";
import { intensityOf, mapSummary, roomState } from "./homeMapState";

const todo = (severity: number) => ({ status: "todo" as const, severity });
const done = (severity: number) => ({ status: "done" as const, severity });

describe("roomState", () => {
  it("no tasks: unchecked until the room is checked, then done", () => {
    expect(roomState(false, [])).toEqual({ kind: "unchecked" });
    expect(roomState(true, [])).toEqual({ kind: "done", total: 0 });
  });

  it("open tasks: counts, and tasks make the room open even if it was never marked checked", () => {
    const s = roomState(false, [todo(3), done(2), todo(4)]);
    expect(s).toMatchObject({ kind: "open", open: 2, done: 1, total: 3, weight: 7 });
  });

  it("all tasks done: done with the total", () => {
    expect(roomState(true, [done(5), done(1)])).toEqual({ kind: "done", total: 2 });
  });

  it("intensity grows with severity and with count, and done tasks add nothing", () => {
    const mild = roomState(true, [todo(1)]);
    const serious = roomState(true, [todo(5)]);
    const many = roomState(true, [todo(4), todo(4), todo(4), todo(4)]);
    const doneHeavy = roomState(true, [todo(1), done(5), done(5), done(5)]);
    const i = (s: ReturnType<typeof roomState>) => (s.kind === "open" ? s.intensity : 0);
    expect(i(mild)).toBe(1);
    expect(i(serious)).toBeGreaterThan(i(mild));
    expect(i(many)).toBeGreaterThan(i(serious));
    expect(i(doneHeavy)).toBe(1);
  });

  it("clamps odd severities and buckets the weight", () => {
    expect(roomState(true, [todo(99)])).toMatchObject({ weight: 5 });
    expect(roomState(true, [todo(0)])).toMatchObject({ weight: 1 });
    expect([2, 6, 12, 13].map(intensityOf)).toEqual([1, 2, 3, 4]);
  });
});

describe("mapSummary", () => {
  it("sums open fixes over rooms and counts checked rooms", () => {
    const s = mapSummary([
      roomState(true, [todo(2), todo(2)]),
      roomState(true, [todo(1)]),
      roomState(true, []),
      roomState(false, []),
    ]);
    expect(s).toEqual({ open: 3, rooms: 2, checked: 3 });
  });
});
