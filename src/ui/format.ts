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
export function reasonText(t: TFn, r: Reason): string {
  switch (r.kind) {
    case "severity":
      return t(r.text, { ...r.params, stage: t(`stage.${String(r.params.stage)}`) });
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
}

// Spanish text from the KB when a reviewed translation exists, otherwise English.
export function localHazard(h: HazardEntry, lang: Lang): LocalHazard {
  const steps = [...h.fix_steps].sort((a, b) => a.order - b.order);
  if (lang === "es" && h.es && h.es.name) {
    return {
      name: h.es.name,
      why: h.es.why_it_matters,
      steps: steps.map((s, i) => h.es?.fix_steps_text[i] ?? s.text),
    };
  }
  return { name: h.name, why: h.why_it_matters, steps: steps.map((s) => s.text) };
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
