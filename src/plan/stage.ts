// Age maths for the ranking engine (T4). Pure functions, no React.
// Only birth month + year are stored, so we pretend the birthday is the 15th of that month.
// Stage labels live in en.json under the keys returned by stageLabelKey().
import type { Child, Stage } from "../kb/schema";

const BIRTH_DAY = 15; // assumed day of month

// Whole months old at `now`. Throws if the birth month is after the current month.
export function ageMonths(child: Child, now: Date): number {
  const months =
    (now.getFullYear() - child.birth_year) * 12 + (now.getMonth() + 1 - child.birth_month);
  if (months < 0) {
    throw new Error(
      `Child "${child.nickname}" has a birth date in the future (${child.birth_month}/${child.birth_year}).`,
    );
  }
  // Before the 15th the current month is not complete yet; never go below 0 (born this month).
  return Math.max(0, now.getDate() < BIRTH_DAY ? months - 1 : months);
}

// Age band for an age in months. Ages of 60+ months stay in the last band.
export function stageForAge(ageMonths: number): Stage {
  if (ageMonths < 3) return "0-3m";
  if (ageMonths < 6) return "3-6m";
  if (ageMonths < 12) return "6-12m";
  if (ageMonths < 24) return "12-24m";
  if (ageMonths < 36) return "24-36m";
  return "36-60m";
}

// i18n key for a stage label, e.g. "stage.0-3m".
export function stageLabelKey(stage: Stage): string {
  return `stage.${stage}`;
}
