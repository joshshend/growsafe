// Growth preview (T21): "what changes if the child were N months older". Pure functions, no React.
// Reuses rankHazards with a shifted `now`, so the preview and the real plan can never disagree.
import type { Child, HazardEntry, Home, Task } from "../kb/schema";
import { buildPlan } from "./build";
import { rankHazards, type RankedHazard } from "./rank";
import { ageMonths } from "./stage";

export const PREVIEW_MAX_MONTHS = 18;

export interface Preview {
  monthsAhead: number;
  ageMonths: number; // the child's age at monthsAhead
  ranked: RankedHazard[]; // the plan at that age
  newlyActive: RankedHazard[]; // not active one month earlier, active now
  dropped: HazardEntry[]; // active one month earlier, no longer ranked
  unlocksBy: Map<number, RankedHazard[]>; // key = months from today (1..monthsAhead) the risk starts
}

// `now` moved forward by whole months. The day is clamped so the 15th-of-month rule in ageMonths
// sees exactly `months` more months of age.
export function shiftMonths(now: Date, months: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(now.getDate(), last));
  return d;
}

export function previewAt(
  kb: HazardEntry[],
  child: Child,
  monthsAhead: number,
  now: Date,
): Preview {
  const n = Math.max(0, Math.round(monthsAhead));
  const age0 = ageMonths(child, now);
  const at = shiftMonths(now, n);
  const age = ageMonths(child, at);
  const ranked = rankHazards(kb, child, at);

  // One month earlier (nothing to compare with for a newborn).
  const prev = age > 0 ? rankHazards(kb, child, shiftMonths(now, n - 1)) : [];
  const prevActive = new Map(
    prev.filter((r) => r.status === "active").map((r) => [r.hazard.id, r]),
  );
  const rankedIds = new Set(ranked.map((r) => r.hazard.id));

  const newlyActive = ranked.filter((r) => r.status === "active" && !prevActive.has(r.hazard.id));
  const dropped = [...prevActive.values()]
    .filter((r) => !rankedIds.has(r.hazard.id))
    .map((r) => r.hazard);

  const unlocksBy = new Map<number, RankedHazard[]>();
  const starting = ranked
    .filter((r) => r.status === "active" && r.hazard.unlock_age_months > age0)
    .map((r) => ({ r, month: Math.max(1, Math.ceil(r.hazard.unlock_age_months - age0)) }))
    .sort((a, b) => a.month - b.month);
  for (const { r, month } of starting) {
    const list = unlocksBy.get(month) ?? [];
    list.push(r);
    unlocksBy.set(month, list);
  }
  return { monthsAhead: n, ageMonths: age, ranked, newlyActive, dropped, unlocksBy };
}

// Tasks for risks that start by `monthsAhead` and are not in the plan yet (for "Add these now").
// A task that exists for another child is returned too, so the add can attach this child to it.
export function tasksToAdd(
  kb: HazardEntry[],
  child: Child,
  homes: Home[],
  monthsAhead: number,
  now: Date,
  existing: Task[],
): Task[] {
  const wanted = buildPlan(
    kb,
    [child],
    homes,
    shiftMonths(now, Math.max(0, Math.round(monthsAhead))),
  );
  const have = new Map(existing.map((t) => [t.id, t]));
  return wanted.filter((t) => !have.get(t.id)?.childIds.includes(child.id));
}
