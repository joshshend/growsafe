// Allow-list redaction (T7): build the shared plan field by field so nothing else can leak.
// Dropped on purpose: emergency cards, full names, birth month/year, addresses, photos, notes.
import { ageMonths, stageForAge } from "../plan/stage";
import type { Plan } from "../kb/schema";
import { SHARE_VERSION, SharedPlanSchema, type SharedPlan } from "./schema";

export function redact(plan: Plan, now: Date = new Date()): SharedPlan {
  const out: SharedPlan = {
    v: SHARE_VERSION,
    children: plan.children.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      ageBand: stageForAge(ageMonths(c, now)),
    })),
    homes: plan.homes.map((h) => ({ id: h.id, name: h.name, rooms: [...h.rooms] })),
    tasks: plan.tasks.map((t) => ({
      id: t.id,
      hazard_id: t.hazard_id,
      home_id: t.home_id,
      room: t.room,
      childIds: [...(t.childIds ?? [])],
      status: t.status,
      ...(t.owner ? { owner: t.owner } : {}),
      ...(t.due ? { due: t.due } : {}),
    })),
  };
  return SharedPlanSchema.parse(out);
}
