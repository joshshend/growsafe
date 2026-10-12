// "Coming up" list (T4): hazards whose risk starts within the next N months.
import type { Child, HazardEntry } from "../kb/schema";
import { rankWithLead, type RankedHazard } from "./rank";

// Upcoming hazards only, soonest first (ties keep the score order from rankWithLead).
export function nextUnlocks(
  kb: HazardEntry[],
  child: Child,
  now: Date,
  horizonMonths: number,
): RankedHazard[] {
  return rankWithLead(kb, child, now, horizonMonths)
    .filter((r) => r.status === "upcoming")
    .sort((a, b) => a.unlocksInMonths! - b.unlocksInMonths!); // stable sort keeps score order on ties
}
