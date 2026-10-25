// Height marks ("Mia's doorframe"). Pure functions, no React.
// This is a record, not an assessment: no percentiles, no "normal" range, no advice. Only conversion,
// validation, ordering and plain subtraction.

export type HeightUnit = "cm" | "in";
export interface HeightMark {
  id: string;
  date: string; // yyyy-mm-dd, the day it was measured
  cm: number; // always stored in centimetres, one decimal
  note?: string;
}

export const MIN_CM = 2;
export const MAX_CM = 200;
export const MAX_NOTE = 80;
export const CM_PER_IN = 2.54;

const round1 = (n: number) => Math.round(n * 10) / 10;
export const inToCm = (inches: number) => round1(inches * CM_PER_IN);
export const cmToIn = (cm: number) => round1(cm / CM_PER_IN);
export const toUnit = (cm: number, unit: HeightUnit) => (unit === "cm" ? round1(cm) : cmToIn(cm));
export const unitLimits = (unit: HeightUnit) => ({
  min: toUnit(MIN_CM, unit),
  max: toUnit(MAX_CM, unit),
});

// Accepts "98.5", "98,5" and surrounding spaces. Null for anything else.
export function parseHeight(text: string): number | null {
  const s = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return (
    d.getFullYear() === Number(m[1]) &&
    d.getMonth() === Number(m[2]) - 1 &&
    d.getDate() === Number(m[3])
  );
}

// Today as yyyy-mm-dd in the phone's local time.
export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export type MarkError = "height" | "date" | "future";
export type Checked =
  | { ok: true; mark: { date: string; cm: number; note?: string } }
  | { ok: false; error: MarkError };

// Turns what was typed into a mark, or says which field is wrong. `today` is yyyy-mm-dd.
export function checkMark(
  input: { height: string; unit: HeightUnit; date: string; note?: string },
  today: string,
): Checked {
  const typed = parseHeight(input.height);
  if (typed === null) return { ok: false, error: "height" };
  const cm = input.unit === "cm" ? round1(typed) : inToCm(typed);
  if (cm < MIN_CM || cm > MAX_CM) return { ok: false, error: "height" };
  if (!isIsoDate(input.date)) return { ok: false, error: "date" };
  if (input.date > today) return { ok: false, error: "future" };
  const note = (input.note ?? "").trim().slice(0, MAX_NOTE);
  return { ok: true, mark: { date: input.date, cm, ...(note ? { note } : {}) } };
}

// Newest first. Two marks on one day: the one added later comes first.
export function newestFirst(marks: HeightMark[]): HeightMark[] {
  return marks
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.date === b.m.date ? b.i - a.i : a.m.date < b.m.date ? 1 : -1))
    .map((x) => x.m);
}

export interface Growth {
  diffCm: number; // newest minus the one before it
  since: string; // date of the one before it
}
// Plain subtraction between the two newest marks. Null with fewer than two.
export function growthSince(marks: HeightMark[]): Growth | null {
  const sorted = newestFirst(marks);
  const [latest, before] = sorted;
  if (!latest || !before) return null;
  return { diffCm: round1(latest.cm - before.cm), since: before.date };
}

// --- Doorframe drawing ---------------------------------------------------------------------------

export interface TickPlace {
  id: string;
  cm: number;
  y: number; // where the pencil mark sits
  labelY: number; // where its label sits (pushed down so labels never overlap)
}
export interface DoorLayout {
  height: number; // svg height
  ticks: TickPlace[];
  ruler: { value: number; y: number }[]; // numbers down the left side, in the chosen unit
  floorY: number | null; // set only when the bottom of the frame is the floor (0 cm)
}
export interface LayoutOptions {
  unit?: HeightUnit;
  minHeight?: number;
  padTop?: number;
  padBottom?: number;
  maxPxPerCm?: number;
  minSpanCm?: number;
  labelGap?: number;
}

// Positions are proportional to centimetres. The frame shows only the range that has marks (to the next 10 cm
// above and below), so a toddler's marks are not squeezed into the bottom of a 2 m door.
export function layoutDoorframe(
  marks: { id: string; cm: number }[],
  o: LayoutOptions = {},
): DoorLayout {
  const unit = o.unit ?? "cm";
  const minHeight = o.minHeight ?? 400;
  const padTop = o.padTop ?? 28;
  const padBottom = o.padBottom ?? 28;
  const maxPx = o.maxPxPerCm ?? 7;
  const minSpan = o.minSpanCm ?? 40;
  const gap = o.labelGap ?? 20;

  const cms = marks.map((m) => m.cm);
  const lo = cms.length ? Math.min(...cms) : 60;
  const hi = cms.length ? Math.max(...cms) : 100;
  const base = Math.max(0, Math.floor((lo - 5) / 10) * 10);
  let top = Math.ceil((hi + 5) / 10) * 10;
  if (top - base < minSpan) top = base + Math.ceil(minSpan / 10) * 10;
  const span = top - base;
  const ppc = Math.min(maxPx, (minHeight - padTop - padBottom) / span);
  const yOf = (cm: number) => padTop + (top - cm) * ppc;

  const sorted = marks.map((m) => ({ id: m.id, cm: m.cm, y: yOf(m.cm) })).sort((a, b) => a.y - b.y);
  let prev = -Infinity;
  const ticks = sorted.map((t) => {
    const labelY = Math.max(t.y, prev + gap);
    prev = labelY;
    return { ...t, labelY };
  });

  const step = unit === "cm" ? 10 : 4;
  const factor = unit === "cm" ? 1 : CM_PER_IN;
  const ruler: DoorLayout["ruler"] = [];
  for (let v = Math.ceil(base / factor / step) * step; v * factor <= top; v += step)
    ruler.push({ value: v, y: yOf(v * factor) });

  const lastLabel = ticks.length ? ticks[ticks.length - 1]!.labelY : 0;
  const height = Math.ceil(Math.max(padTop + span * ppc + padBottom, lastLabel + padBottom, 240));
  return { height, ticks, ruler, floorY: base === 0 ? yOf(0) : null };
}

// --- Demo data -------------------------------------------------------------------------------------

const daysAgo = (now: Date, n: number) =>
  todayIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));

// A few plausible marks for the sample family (ids from loadDemo in the store). They are example data only.
export function demoMarks(childId: string, now: Date): HeightMark[] {
  const rows: Record<string, [number, number][]> = {
    "demo-mia": [
      [150, 65],
      [90, 68.5],
      [45, 70.5],
      [7, 72],
    ],
    "demo-noah": [
      [180, 78.5],
      [120, 81],
      [60, 83.5],
      [10, 85],
    ],
  };
  return (rows[childId] ?? []).map(([ago, cm], i) => ({
    id: `seed-${childId}-${i}`,
    date: daysAgo(now, ago),
    cm,
  }));
}
