// Ranks hazards for one child at one date (T4). Score = severity*10 + evidence + unlock boost.
// Every result carries `reasons` (translation keys + params) so the UI can explain the order.
import {
  LEAD_TIME_MONTHS,
  type Child,
  type HazardEntry,
  type Room,
  type Stage,
} from "../kb/schema";
import { ageMonths, stageForAge } from "./stage";

export interface Reason {
  kind: "severity" | "evidence" | "unlock" | "cost";
  text: string; // i18n key
  params: Record<string, string | number>;
}

export interface RankedHazard {
  hazard: HazardEntry;
  stage: Stage; // the child's current stage
  score: number;
  reasons: Reason[];
  unlocksInMonths: number | null; // null when the risk has already started
  status: "active" | "upcoming";
}

const SEVERITY_WEIGHT = 10;
const SOURCED_BOOST = 3;
const UNLOCK_BOOST = 5;

// Cheapest total cost of doing every fix step (used for tie-breaks).
export function minCost(h: HazardEntry): number {
  return h.fix_steps.reduce((sum, s) => sum + s.cost_usd_min, 0);
}
function maxCost(h: HazardEntry): number {
  return h.fix_steps.reduce((sum, s) => sum + s.cost_usd_max, 0);
}

// Same as rankHazards but with a custom look-ahead window (nextUnlocks uses this).
export function rankWithLead(
  kb: HazardEntry[],
  child: Child,
  now: Date,
  leadMonths: number,
  opts?: { rooms?: Room[] },
): RankedHazard[] {
  const age = ageMonths(child, now);
  const stage = stageForAge(age);
  const out: RankedHazard[] = [];

  for (const hazard of kb) {
    // Optional room filter: keep hazards that live in at least one requested room.
    if (opts?.rooms && !hazard.rooms.some((r) => opts.rooms!.includes(r))) continue;

    const started = hazard.unlock_age_months <= age;
    const soon = !started && hazard.unlock_age_months - age <= leadMonths;
    if (!started && !soon) continue;

    // Active: severity for today's stage. Upcoming: severity for the stage the child will be in then.
    const sevStage = started ? stage : stageForAge(hazard.unlock_age_months);
    const severity = hazard.severity[sevStage];
    if (!severity) continue;

    const sourced = hazard.evidence_status === "sourced";
    const unlocksInMonths = started ? null : hazard.unlock_age_months - age;
    const score =
      severity.score * SEVERITY_WEIGHT + (sourced ? SOURCED_BOOST : 0) + (soon ? UNLOCK_BOOST : 0);

    const reasons: Reason[] = [
      {
        kind: "severity",
        text: "reason.severity",
        params: { score: severity.score, stage: sevStage, rationale: severity.rationale },
      },
      {
        kind: "evidence",
        text: sourced ? "reason.evidence.sourced" : "reason.evidence.verify",
        params: {},
      },
    ];
    if (soon) {
      reasons.push({ kind: "unlock", text: "reason.unlock", params: { months: unlocksInMonths! } });
    }
    reasons.push({
      kind: "cost",
      text: "reason.cost",
      params: { min: minCost(hazard), max: maxCost(hazard) },
    });

    out.push({
      hazard,
      stage,
      score,
      reasons,
      unlocksInMonths,
      status: started ? "active" : "upcoming",
    });
  }

  // Highest score first; ties: cheaper fix first, then alphabetical id.
  return out.sort(
    (a, b) =>
      b.score - a.score ||
      minCost(a.hazard) - minCost(b.hazard) ||
      a.hazard.id.localeCompare(b.hazard.id),
  );
}

export function rankHazards(
  kb: HazardEntry[],
  child: Child,
  now: Date,
  opts?: { rooms?: Room[] },
): RankedHazard[] {
  return rankWithLead(kb, child, now, LEAD_TIME_MONTHS, opts);
}
