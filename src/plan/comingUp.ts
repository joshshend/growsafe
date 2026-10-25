// "Coming up" strip on Today: the next few CDC checkpoints for a child, and the plan hazards that start
// by each one. Nothing is written here: checkpoints come from src/kb/stages.json, hazards from the KB
// through nextUnlocks, so the strip and the full /ahead preview cannot disagree. Pure, no React.
import type { Child, HazardEntry } from "../kb/schema";
import type { Checkpoint } from "../kb/stages";
import type { RankedHazard } from "./rank";
import { ageMonths } from "./stage";
import { nextUnlocks } from "./unlock";

export const COMING_UP_LINES = 3; // at most this many checkpoints
export const COMING_UP_WINDOW = 12; // and none further away than this many months

export interface ComingUpLine {
  checkpoint: Checkpoint;
  monthsAway: number;
  // Hazards whose risk starts after the previous line (or today) and by this checkpoint, highest priority first.
  hazards: RankedHazard[];
}

export function comingUp(
  kb: HazardEntry[],
  checkpoints: Checkpoint[],
  child: Child,
  now: Date,
): ComingUpLine[] {
  const age = ageMonths(child, now);
  const next = checkpoints
    .filter((c) => c.months > age && c.months - age <= COMING_UP_WINDOW)
    .sort((a, b) => a.months - b.months)
    .slice(0, COMING_UP_LINES);
  if (next.length === 0) return [];
  const upcoming = nextUnlocks(kb, child, now, next[next.length - 1].months - age);
  let from = age;
  return next.map((checkpoint) => {
    const to = checkpoint.months;
    const hazards = upcoming
      .filter((r) => r.hazard.unlock_age_months > from && r.hazard.unlock_age_months <= to)
      .sort((a, b) => b.score - a.score || a.hazard.id.localeCompare(b.hazard.id));
    from = to;
    return { checkpoint, monthsAway: to - age, hazards };
  });
}

export interface StripPick {
  checkpoint: Checkpoint;
  // Every hazard that starts between today and this checkpoint, highest priority first. Empty means milestone only.
  hazards: RankedHazard[];
}

// The one checkpoint the Today strip shows: the first that brings hazards, with everything new by then;
// if none within the window does, the nearest checkpoint with its milestone line only.
export function stripPick(
  kb: HazardEntry[],
  checkpoints: Checkpoint[],
  child: Child,
  now: Date,
): StripPick | null {
  const lines = comingUp(kb, checkpoints, child, now);
  if (lines.length === 0) return null;
  const at = lines.findIndex((l) => l.hazards.length > 0);
  if (at < 0) return { checkpoint: lines[0].checkpoint, hazards: [] };
  const hazards = lines
    .slice(0, at + 1)
    .flatMap((l) => l.hazards)
    .sort((a, b) => b.score - a.score || a.hazard.id.localeCompare(b.hazard.id));
  return { checkpoint: lines[at].checkpoint, hazards };
}
