// Test helpers: build tiny hazard entries and children without touching the real KB.
import type { Child, HazardEntry, Room, Stage } from "../kb/schema";

export function hz(
  id: string,
  o: {
    sev?: Partial<Record<Stage, number>>;
    unlock?: number;
    rooms?: Room[];
    sourced?: boolean;
    cost?: number;
  } = {},
): HazardEntry {
  const sev = o.sev ?? { "6-12m": 3, "12-24m": 3 };
  const severity: HazardEntry["severity"] = {};
  for (const [stage, score] of Object.entries(sev)) {
    severity[stage as Stage] = { score: score as number, rationale: "r" };
  }
  const sourced = o.sourced ?? false;
  return {
    id,
    name: id,
    rooms: o.rooms ?? ["living_room"],
    stages: Object.keys(sev) as Stage[],
    severity,
    injury_evidence: sourced
      ? [
          {
            cause_category: "c",
            age_band: "a",
            source: "CDC",
            year: "2020",
            url: "https://x.org",
            note: "n",
          },
        ]
      : [],
    evidence_status: sourced ? "sourced" : "verify",
    unlock_age_months: o.unlock ?? 0,
    detection_cues: [],
    why_it_matters: "w",
    fix_steps: [
      {
        order: 1,
        text: "t",
        cost_usd_min: o.cost ?? 0,
        cost_usd_max: (o.cost ?? 0) + 5,
        minutes: 5,
        tools: [],
      },
    ],
    verify_rule: "v",
    blind_spots: [],
    citations: [{ title: "t", publisher: "p", url: "https://x.org", accessed: "2026-10-01" }],
    icon: "i",
  };
}

// A child who is exactly `months` old on 2026-10-20 (birthday assumed the 15th).
export const NOW = new Date(2026, 9, 20);
export function childAged(id: string, months: number): Child {
  const d = new Date(2026, 9 - months, 1);
  return { id, nickname: id, birth_month: d.getMonth() + 1, birth_year: d.getFullYear() };
}
