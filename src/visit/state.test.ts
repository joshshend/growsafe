import { describe, expect, it } from "vitest";
import { VisitPackSchema, mergeReply } from "../share/visit";
import {
  changedCount,
  helperReply,
  initHelper,
  previewMerge,
  progress,
  restoreHelper,
  setBy,
  tick,
} from "./state";

const pack = VisitPackSchema.parse({
  v: 1,
  packId: "pack_unit_1",
  homeName: "Nana's",
  ageBand: "6-12m",
  from: "Alex",
  tasks: [
    { id: "a", hazardId: "h1", room: "kitchen", status: "todo", updatedAt: 0 },
    { id: "b", hazardId: "h2", room: "kitchen", status: "done", updatedAt: 0 },
    { id: "c", hazardId: "h3", room: "bedroom", status: "todo", updatedAt: 0 },
  ],
});

describe("helper state", () => {
  it("starts from the pack with nothing to send", () => {
    const s = initHelper(pack);
    expect(progress(s)).toEqual({ done: 1, total: 3 });
    expect(changedCount(s)).toBe(0);
  });
  it("ticks and unticks, ignores unknown ids", () => {
    let s = tick(initHelper(pack, "Nana"), "a", true, 100);
    expect(progress(s).done).toBe(2);
    expect(changedCount(s)).toBe(1);
    expect(tick(s, "zzz", true, 200)).toEqual(s);
    s = tick(s, "a", false, 300);
    expect(s.tasks.find((t) => t.id === "a")).toMatchObject({ status: "todo", updatedAt: 300 });
  });
  it("builds a reply with only changed items and the helper's name", () => {
    const s = tick(setBy(initHelper(pack), "Nana"), "c", true, 100);
    const r = helperReply(s);
    expect(r).toMatchObject({ packId: "pack_unit_1", by: "Nana" });
    expect(r.updates).toEqual([{ taskId: "c", status: "done", at: 100 }]);
  });
  it("rejects a full name in the reply", () => {
    const s = tick(setBy(initHelper(pack), "Nana Smith"), "c", true, 100);
    expect(() => helperReply(s)).toThrow();
  });
  it("restores saved ticks only for this pack and drops junk", () => {
    const saved = tick(setBy(initHelper(pack), "Nana"), "a", true, 100);
    expect(restoreHelper(pack, saved).tasks[0]!.status).toBe("done");
    expect(restoreHelper(pack, { ...saved, pack: { ...pack, packId: "other_pack_1" } })).toEqual(
      initHelper(pack),
    );
    expect(restoreHelper(pack, "junk")).toEqual(initHelper(pack));
    const bad = { ...saved, tasks: [{ id: "a", status: "evil", updatedAt: 1 }] };
    expect(restoreHelper(pack, bad).tasks[0]!.status).toBe("todo");
  });
});

describe("previewMerge", () => {
  const local = [
    { id: "a", status: "todo" as const },
    { id: "b", status: "done" as const },
  ];
  const reply = helperReply(tick(setBy(initHelper(pack), "Nana"), "a", true, 1000));
  it("counts finished tasks without changing anything", () => {
    const p = previewMerge(local, undefined, reply, 2000);
    expect(p.changes).toEqual([{ id: "a", status: "done" }]);
    expect(p.finished).toBe(1);
    expect(p.summary.by).toBe("Nana");
    expect(local[0]!.status).toBe("todo");
  });
  it("lets a later parent edit win, and is idempotent once applied", () => {
    const sent = {
      packId: "pack_unit_1",
      homeId: "h",
      homeName: "Nana's",
      helper: "",
      sentAt: 500,
      snapshot: { a: "todo", b: "done" } as const,
    };
    expect(previewMerge(local, sent, reply, 2000).changes).toHaveLength(1);
    const edited = [{ id: "a", status: "doing" as const }, local[1]!];
    expect(previewMerge(edited, sent, reply, 2000).changes).toHaveLength(0);
    const applied = [{ id: "a", status: "done" as const }, local[1]!];
    expect(previewMerge(applied, sent, reply, 3000).changes).toHaveLength(0);
    expect(mergeReply([{ id: "a", status: "todo" as const }], reply).summary.applied).toBe(1);
  });
});
