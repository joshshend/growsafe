import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store/store";
import { useHeights } from "./store";

const settle = () => new Promise((r) => setTimeout(r, 0));

describe("height store", () => {
  beforeEach(async () => {
    useStore.getState().reset();
    useStore.setState({ hydrated: true });
    useHeights.getState().reset();
    await useHeights.getState().hydrate();
  });

  it("adds, updates, removes and restores marks per child", () => {
    const h = useHeights.getState();
    const a = h.add("c1", { date: "2026-01-01", cm: 70 });
    h.add("c2", { date: "2026-01-02", cm: 90 });
    expect(useHeights.getState().marks.c1).toHaveLength(1);
    h.update("c1", a.id, { date: "2026-01-05", cm: 71.5, note: "x" });
    expect(useHeights.getState().marks.c1![0]).toEqual({
      id: a.id,
      date: "2026-01-05",
      cm: 71.5,
      note: "x",
    });
    h.remove("c1", a.id);
    expect(useHeights.getState().marks.c1).toEqual([]);
    h.restore("c1", a);
    h.restore("c1", a); // no duplicate
    expect(useHeights.getState().marks.c1).toHaveLength(1);
    expect(useHeights.getState().marks.c2).toHaveLength(1);
  });

  it("remembers the unit", () => {
    useHeights.getState().setUnit("in");
    expect(useHeights.getState().unit).toBe("in");
  });

  it("drops marks of children who no longer exist, and erase clears everything", async () => {
    useStore.getState().loadDemo();
    await settle();
    expect(useHeights.getState().marks["demo-mia"]).toHaveLength(4);
    expect(useHeights.getState().marks["demo-noah"]).toHaveLength(4);
    useStore.getState().removeChild("demo-noah");
    await settle();
    expect(useHeights.getState().marks["demo-noah"]).toBeUndefined();
    expect(useHeights.getState().marks["demo-mia"]).toHaveLength(4);
    useStore.getState().reset(); // "Erase data" / "Start my own"
    await settle();
    expect(useHeights.getState().marks).toEqual({});
  });

  it("does not bring deleted sample marks back", async () => {
    useStore.getState().loadDemo();
    await settle();
    for (const m of [...useHeights.getState().marks["demo-mia"]!])
      useHeights.getState().remove("demo-mia", m.id);
    useHeights.getState().reconcile();
    expect(useHeights.getState().marks["demo-mia"]).toEqual([]);
  });

  it("does not seed real children", async () => {
    const id = useStore.getState().addChild("Ana", 1, 2025);
    await settle();
    expect(useHeights.getState().marks[id]).toBeUndefined();
  });
});
