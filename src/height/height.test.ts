import { describe, expect, it } from "vitest";
import {
  checkMark,
  cmToIn,
  demoMarks,
  growthSince,
  inToCm,
  isIsoDate,
  layoutDoorframe,
  newestFirst,
  parseHeight,
  todayIso,
  unitLimits,
  type HeightMark,
} from "./height";

const m = (id: string, date: string, cm: number): HeightMark => ({ id, date, cm });

describe("conversion", () => {
  it("converts inches and centimetres to one decimal", () => {
    expect(inToCm(30)).toBe(76.2);
    expect(inToCm(38.5)).toBe(97.8);
    expect(cmToIn(76.2)).toBe(30);
    expect(cmToIn(100)).toBe(39.4);
    expect(unitLimits("cm")).toEqual({ min: 2, max: 200 });
    expect(unitLimits("in")).toEqual({ min: 0.8, max: 78.7 });
  });
  it("parses typed numbers, including a comma", () => {
    expect(parseHeight(" 98,5 ")).toBe(98.5);
    expect(parseHeight("30")).toBe(30);
    for (const bad of ["", "abc", "-5", "1e3", "12.", "1.2.3"]) expect(parseHeight(bad)).toBeNull();
  });
});

describe("validation", () => {
  const today = "2026-10-24";
  it("accepts a good mark and stores centimetres", () => {
    expect(
      checkMark({ height: "98.5", unit: "cm", date: "2026-10-01", note: " birthday " }, today),
    ).toEqual({
      ok: true,
      mark: { date: "2026-10-01", cm: 98.5, note: "birthday" },
    });
    const r = checkMark({ height: "30", unit: "in", date: today }, today);
    expect(r).toEqual({ ok: true, mark: { date: today, cm: 76.2 } });
  });
  it("rejects heights outside 2 to 200 cm, in either unit", () => {
    const bad = (height: string, unit: "cm" | "in") =>
      checkMark({ height, unit, date: today }, today);
    expect(bad("1.9", "cm")).toEqual({ ok: false, error: "height" });
    expect(bad("200.1", "cm")).toEqual({ ok: false, error: "height" });
    expect(bad("0.7", "in")).toEqual({ ok: false, error: "height" });
    expect(bad("79", "in")).toEqual({ ok: false, error: "height" });
    expect(bad("2", "cm").ok).toBe(true);
    expect(bad("200", "cm").ok).toBe(true);
    expect(bad("", "cm")).toEqual({ ok: false, error: "height" });
  });
  it("rejects bad and future dates, but accepts today", () => {
    const d = (date: string) => checkMark({ height: "80", unit: "cm", date }, today);
    expect(d("2026-10-25")).toEqual({ ok: false, error: "future" });
    expect(d("2026-02-30")).toEqual({ ok: false, error: "date" });
    expect(d("")).toEqual({ ok: false, error: "date" });
    expect(d(today).ok).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
  });
  it("trims notes to 80 characters and drops empty ones", () => {
    const r = checkMark({ height: "80", unit: "cm", date: today, note: "x".repeat(200) }, today);
    expect(r.ok && r.mark.note?.length).toBe(80);
    const e = checkMark({ height: "80", unit: "cm", date: today, note: "   " }, today);
    expect(e.ok && "note" in e.mark).toBe(false);
  });
  it("formats today as a local yyyy-mm-dd", () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("ordering and arithmetic", () => {
  it("sorts newest first; the later-added mark wins on the same day", () => {
    const list = [m("a", "2026-01-01", 70), m("b", "2026-03-01", 74), m("c", "2026-03-01", 75)];
    expect(newestFirst(list).map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("only subtracts: grew X since the mark before", () => {
    expect(growthSince([m("a", "2026-01-01", 70)])).toBeNull();
    expect(growthSince([m("a", "2026-01-01", 70.2), m("b", "2026-03-01", 74.9)])).toEqual({
      diffCm: 4.7,
      since: "2026-01-01",
    });
    expect(growthSince([m("a", "2026-01-01", 70), m("b", "2026-03-01", 69.5)])?.diffCm).toBe(-0.5);
  });
});

describe("doorframe layout", () => {
  it("places ticks in proportion to centimetres, taller marks higher", () => {
    const l = layoutDoorframe([
      { id: "a", cm: 70 },
      { id: "b", cm: 80 },
      { id: "c", cm: 90 },
    ]);
    const y = Object.fromEntries(l.ticks.map((t) => [t.id, t.y]));
    expect(y.a! - y.b!).toBeCloseTo(y.b! - y.c!, 5);
    expect(y.a!).toBeGreaterThan(y.b!);
    expect(l.floorY).toBeNull(); // frame starts at 60 cm, not the floor
  });
  it("never lets labels overlap and grows the drawing to fit them", () => {
    const marks = Array.from({ length: 25 }, (_, i) => ({ id: `m${i}`, cm: 80 + i * 0.1 }));
    const l = layoutDoorframe(marks);
    for (let i = 1; i < l.ticks.length; i++)
      expect(l.ticks[i]!.labelY - l.ticks[i - 1]!.labelY).toBeGreaterThanOrEqual(20 - 1e-9);
    expect(l.height).toBeGreaterThan(l.ticks[l.ticks.length - 1]!.labelY);
  });
  it("copes with no marks and with a single mark near the floor", () => {
    expect(layoutDoorframe([]).ticks).toEqual([]);
    const l = layoutDoorframe([{ id: "a", cm: 4 }]);
    expect(l.floorY).not.toBeNull();
    expect(l.ruler[0]!.value).toBe(0);
  });
  it("uses an inch ruler when asked", () => {
    const l = layoutDoorframe([{ id: "a", cm: 76.2 }], { unit: "in" });
    expect(l.ruler.every((r) => r.value % 4 === 0)).toBe(true);
  });
});

describe("demo marks", () => {
  it("gives the sample children four past, in-range marks and nobody else", () => {
    const now = new Date(2026, 9, 24);
    const mia = demoMarks("demo-mia", now);
    expect(mia).toHaveLength(4);
    for (const x of mia) {
      expect(x.date <= todayIso(now)).toBe(true);
      expect(checkMark({ height: String(x.cm), unit: "cm", date: x.date }, todayIso(now)).ok).toBe(
        true,
      );
    }
    expect(demoMarks("someone-else", now)).toEqual([]);
  });
});
