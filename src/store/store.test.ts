import { beforeEach, describe, expect, it, vi } from "vitest";

const disk = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: async (k: string) => disk.get(k),
  set: async (k: string, v: unknown) => void disk.set(k, structuredClone(v)),
  del: async (k: string) => void disk.delete(k),
}));

import { useStore, startPersistence } from "./store";
import { buildViews, progress } from "./selectors";
import { loadKb } from "../kb";

const s = () => useStore.getState();

describe("store", () => {
  beforeEach(() => {
    disk.clear();
    s().reset();
  });

  it("makes no tasks when a child and a home are added", () => {
    expect(s().tasks).toHaveLength(0);
    const now = new Date();
    s().addChild("Mia", now.getMonth() + 1, now.getFullYear() - 1);
    expect(s().tasks).toHaveLength(0); // no home yet
    s().addHome("Home", ["kitchen", "bathroom"]);
    // Hazards are only assumed after the person checks a room, so nothing yet.
    expect(s().tasks).toHaveLength(0);
    expect(s().homes[0]!.checks).toEqual({});
  });

  it("keeps status when the family changes", () => {
    s().loadDemo();
    const id = s().tasks[5]!.id;
    s().setStatus(id, "done");
    s().addChild("Zed", 1, new Date().getFullYear());
    expect(s().tasks.find((t) => t.id === id)?.status).toBe("done");
  });

  it("sets and clears owner and due date, remembering owner names", () => {
    s().loadDemo();
    const id = s().tasks[4]!.id;
    s().setOwner(id, "  Pat ");
    s().setDue(id, "2026-12-01");
    let t = s().tasks.find((x) => x.id === id)!;
    expect(t.owner).toBe("Pat");
    expect(t.due).toBe("2026-12-01");
    expect(s().owners).toContain("Pat");
    s().setOwner(id, undefined);
    s().setDue(id, undefined);
    t = s().tasks.find((x) => x.id === id)!;
    expect(t.owner).toBeUndefined();
    expect(t.due).toBeUndefined();
  });

  it("demo family has progress and groups tasks", () => {
    s().loadDemo();
    const views = buildViews(s(), loadKb(), new Date());
    expect(views.length).toBe(s().tasks.length);
    expect(progress(views).done).toBe(2);
    expect(views.some((v) => v.group === "first")).toBe(true);
    expect(views.filter((v) => v.group === "first").length).toBeLessThanOrEqual(5);
  });

  it("persists and restores through storage", async () => {
    await startPersistence();
    s().loadDemo();
    await new Promise((r) => setTimeout(r, 0));
    const saved = structuredClone(s().tasks);
    useStore.setState({ children: [], homes: [], tasks: [], hydrated: false });
    await s().hydrate();
    expect(s().hydrated).toBe(true);
    expect(s().tasks.map((t) => [t.id, t.status])).toEqual(saved.map((t) => [t.id, t.status]));
  });

  it("reset erases everything", () => {
    s().loadDemo();
    s().reset();
    expect(s().children).toHaveLength(0);
    expect(s().tasks).toHaveLength(0);
  });
});
