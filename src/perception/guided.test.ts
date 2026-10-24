import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadKb } from "../kb";
import { childAged, hz, NOW } from "../plan/fixtures";
import { taskId } from "../plan";
import type { HazardEntry, Home } from "../kb/schema";
import { cuesForRoom, findingsFromTaps, findingsToTasks, verifyFix } from "./guided";
import en from "../i18n/features/cues.en.json";
import es from "../i18n/features/cues.es.json";
import { CUE_ICON } from "./cueIcons";

const home: Home = { id: "h1", name: "Home", rooms: ["living_room", "garage", "kitchen"] };
const withCues = (id: string, cues: string[], rooms: HazardEntry["rooms"], score = 3) => ({
  ...hz(id, { rooms, sev: { "6-12m": score } }),
  detection_cues: cues,
});

describe("cuesForRoom", () => {
  const kb = [
    withCues("a", ["x", "y"], ["living_room"], 5),
    withCues("b", ["y", "z"], ["living_room"], 2),
    withCues("c", ["only_garage"], ["garage"]),
  ];
  const child = childAged("k", 8);
  it("unions cues, dedupes, orders by hazard rank, remembers every hazard", () => {
    const cues = cuesForRoom(kb, "living_room", child, NOW);
    expect(cues.map((c) => c.cue)).toEqual(["x", "y", "z"]);
    expect(cues[1]).toMatchObject({ hazardId: "a", hazardIds: ["a", "b"] });
  });
  it("is empty for a room with no hazards", () => {
    expect(cuesForRoom(kb, "bathroom", child, NOW)).toEqual([]);
  });
  it("skips hazards that start far in the future", () => {
    const far = [{ ...withCues("f", ["later"], ["living_room"]), unlock_age_months: 40 }];
    expect(cuesForRoom(far, "living_room", child, NOW)).toEqual([]);
  });
  it("works on the real KB", () => {
    expect(cuesForRoom(loadKb(), "kitchen", childAged("k", 14), NOW).length).toBeGreaterThan(3);
  });
});

describe("findingsFromTaps", () => {
  it("makes confidence-1 findings and drops duplicates and blanks", () => {
    expect(findingsFromTaps(["x", "x", "", "y"])).toEqual([
      { cue: "x", confidence: 1 },
      { cue: "y", confidence: 1 },
    ]);
    expect(findingsFromTaps([])).toEqual([]);
  });
});

describe("findingsToTasks", () => {
  const kb = [withCues("a", ["x", "y"], ["living_room"]), withCues("b", ["y"], ["living_room"])];
  it("uses plan task ids and creates one task per hazard even if several cues match", () => {
    const tasks = findingsToTasks(findingsFromTaps(["x", "y"]), kb, home, "living_room", ["k"]);
    expect(tasks.map((t) => t.id).sort()).toEqual(
      [taskId("h1", "living_room", "a"), taskId("h1", "living_room", "b")].sort(),
    );
    expect(tasks.every((t) => t.status === "todo" && t.childIds[0] === "k")).toBe(true);
  });
  it("ignores hazards from other rooms and unknown cues", () => {
    expect(findingsToTasks(findingsFromTaps(["x"]), kb, home, "garage")).toEqual([]);
    expect(findingsToTasks(findingsFromTaps(["nope"]), kb, home, "living_room")).toEqual([]);
    expect(findingsToTasks([], kb, home, "living_room")).toEqual([]);
  });
});

describe("verifyFix", () => {
  const kb = [withCues("a", ["x", "y"], ["living_room"])];
  const task = findingsToTasks(findingsFromTaps(["x"]), kb, home, "living_room")[0]!;
  it("fixed when no offered cue is ticked", () => {
    expect(verifyFix(task, [], kb, ["x", "y"])).toBe("fixed");
  });
  it("still_present when an offered cue is ticked", () => {
    expect(verifyFix(task, findingsFromTaps(["y"]), kb, ["x", "y"])).toBe("still_present");
  });
  it("cannot_tell when the cue was not offered or the hazard is unknown", () => {
    expect(verifyFix(task, [], kb, ["other"])).toBe("cannot_tell");
    expect(verifyFix({ ...task, hazard_id: "zzz" }, [], kb, ["x"])).toBe("cannot_tell");
  });
});

describe("cue labels", () => {
  const fromKb = loadKb().flatMap((h) => h.detection_cues);
  const fromFile = readFileSync("eval/cues.txt", "utf8").split(/\s+/).filter(Boolean);
  it("every cue has an English and Spanish label and an icon key", () => {
    for (const cue of new Set([...fromKb, ...fromFile])) {
      expect((en as Record<string, string>)[`cue.${cue}`], `en ${cue}`).toBeTruthy();
      expect((es as Record<string, string>)[`cue.${cue}`], `es ${cue}`).toBeTruthy();
      expect(CUE_ICON[cue], `icon ${cue}`).toBeTruthy();
    }
  });
  it("no label claims safety", () => {
    for (const v of Object.values(en)) expect(v).not.toMatch(/\bsafe\b/i);
  });
});
