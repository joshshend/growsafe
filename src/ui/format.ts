// Small formatting helpers shared by screens. All wording comes from i18n keys.
import type { Reason } from "../plan";
import type { Child, HazardEntry } from "../kb/schema";
import { ageMonths } from "../plan";
import type { Lang } from "../i18n/t";
import type { TFn } from "./useT";

export function costText(t: TFn, min: number, max: number): string {
  if (max <= 0) return t("cost.free");
  const lo = Math.round(min);
  const hi = Math.round(max);
  return lo === hi ? t("cost.single", { n: hi }) : t("cost.range", { min: lo, max: hi });
}

export function ageText(t: TFn, child: Child, now: Date): string {
  try {
    return monthsText(t, ageMonths(child, now));
  } catch {
    return "";
  }
}

// Turns a ranking Reason (i18n key + params from src/plan) into a plain, friendly sentence.
export function reasonText(t: TFn, r: Reason, rationale?: string): string {
  switch (r.kind) {
    case "severity":
      return t(r.text, {
        ...r.params,
        ...(rationale ? { rationale } : {}),
        stage: t(`stage.${String(r.params.stage)}`),
      });
    case "unlock":
      return t(Number(r.params.months) === 1 ? `${r.text}.one` : r.text, r.params);
    case "cost": {
      const min = Math.round(Number(r.params.min));
      const max = Math.round(Number(r.params.max));
      return max <= 0 ? t("reason.cost.free") : t(r.text, { min, max });
    }
    default:
      return t(r.text, r.params);
  }
}

export interface LocalHazard {
  name: string;
  why: string;
  steps: string[];
  verify: string;
  reminder: string | null;
  blindSpots: string[];
  rationale: (stage: string) => string | undefined; // severity rationale for a stage
}

// Spanish text from the KB when it exists (machine-translated until reviewed), otherwise English.
export function localHazard(h: HazardEntry, lang: Lang): LocalHazard {
  const steps = [...h.fix_steps].sort((a, b) => a.order - b.order);
  const es = lang === "es" ? h.es : undefined;
  if (es && es.name) {
    return {
      name: es.name,
      why: es.why_it_matters || h.why_it_matters,
      steps: steps.map((s, i) => es.fix_steps_text[i] || s.text),
      verify: es.verify_rule || h.verify_rule,
      reminder: h.reminder ? es.reminder_text || h.reminder.text : null,
      blindSpots: h.blind_spots.map((b, i) => es.blind_spots[i] || b),
      rationale: (stage) =>
        es.severity_rationale[stage as keyof typeof es.severity_rationale] ??
        h.severity[stage as keyof typeof h.severity]?.rationale,
    };
  }
  return {
    name: h.name,
    why: h.why_it_matters,
    steps: steps.map((s) => s.text),
    verify: h.verify_rule,
    reminder: h.reminder ? h.reminder.text : null,
    blindSpots: h.blind_spots,
    rationale: (stage) => h.severity[stage as keyof typeof h.severity]?.rationale,
  };
}

export function taskTotals(h: HazardEntry): { min: number; max: number; minutes: number } {
  return h.fix_steps.reduce(
    (a, s) => ({
      min: a.min + s.cost_usd_min,
      max: a.max + s.cost_usd_max,
      minutes: a.minutes + s.minutes,
    }),
    { min: 0, max: 0, minutes: 0 },
  );
}

export function monthsText(t: TFn, months: number): string {
  if (months < 24) return months === 1 ? t("age.months.one") : t("age.months", { n: months });
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? t("age.years", { y }) : t("age.yearsMonths", { y, m });
}
