// .growsafe.json export/import (T7). Same redaction and validation as links.
import type { Plan } from "../kb/schema";
import { redact } from "./redact";
import { SharedPlanSchema, type SharedPlan } from "./schema";

export const FILE_EXTENSION = ".growsafe.json";

export function exportPlanFile(plan: Plan, now: Date = new Date()): { name: string; text: string } {
  return {
    name: `growsafe-plan${FILE_EXTENSION}`,
    text: JSON.stringify(redact(plan, now), null, 2),
  };
}

export function importPlanFile(text: string): SharedPlan {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not a GrowSafe plan.");
  }
  const v = (raw as { v?: unknown } | null)?.v;
  if (v !== 1) throw new Error(`Unsupported plan file version: ${String(v)}.`);
  return SharedPlanSchema.parse(raw);
}
