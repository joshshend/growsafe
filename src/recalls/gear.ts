// Checklists per gear type, and how a "no" answer becomes a normal task. Pure, no React.
import { z } from "zod";
import raw from "./checklists.json";
import { STAGES, type HazardEntry, type Task } from "../kb/schema";
import { GEAR_TYPES, GearTypeSchema, type GearItem, type GearType } from "./types";
import { kindOf } from "./products";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const ChecklistItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: z.string().min(1), // short task name shown in the plan
  q: z.string().min(1), // yes/no question; "yes" is the good answer
  fix: z.string().min(1), // what to do when the answer is "no"
  es: z
    .object({ title: z.string().min(1), q: z.string().min(1), fix: z.string().min(1) })
    .optional(), // Spanish (machine-translated)
  source: z.object({
    title: z.string().min(1),
    publisher: z.string().min(1),
    url: z.string().url().startsWith("https://"),
    accessed: isoDate,
  }),
});
export const ChecklistsSchema = z.object({
  version: z.literal(1),
  types: z.record(GearTypeSchema, z.array(ChecklistItemSchema).min(5).max(8)),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

// Rules shared with the KB validator: no bare "safe", no dosing, no firearm text, https sources.
const SAFE = /\bsafe\b/i;
const DOSING = /\bmg\b|\bml\b|dose of/i;
const FIREARM = /firearm|\bguns?\b/i;
export function checklistErrors(data: unknown): string[] {
  const p = ChecklistsSchema.safeParse(data);
  if (!p.success) return p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const out: string[] = [];
  for (const type of GEAR_TYPES) {
    if (!p.data.types[type]) out.push(`${type}: missing checklist`);
    const ids = new Set<string>();
    for (const it of p.data.types[type] ?? []) {
      if (ids.has(it.id)) out.push(`${type}.${it.id}: duplicate id`);
      ids.add(it.id);
      for (const [k, v] of [
        ["title", it.title],
        ["q", it.q],
        ["fix", it.fix],
      ] as const) {
        if (SAFE.test(v)) out.push(`${type}.${it.id}.${k}: contains the word "safe"`);
        if (DOSING.test(v)) out.push(`${type}.${it.id}.${k}: contains dosing words`);
        if (FIREARM.test(v)) out.push(`${type}.${it.id}.${k}: firearm text`);
      }
    }
  }
  return out;
}

let cache: Record<GearType, ChecklistItem[]> | null = null;
export function loadChecklists(): Record<GearType, ChecklistItem[]> {
  if (!cache) {
    const p = ChecklistsSchema.parse(raw);
    cache = p.types as Record<GearType, ChecklistItem[]>;
  }
  return cache;
}
export const checklistFor = (type: GearType): ChecklistItem[] => loadChecklists()[type];

// ---- tasks -------------------------------------------------------------------------------------

export const GEAR_PREFIX = "gear:";
export const gearHazardId = (type: GearType, itemId: string) => `${GEAR_PREFIX}${type}:${itemId}`;
export const gearTaskId = (gearId: string, itemId: string) => `t_gear_${gearId}_${itemId}`;
export const isGearHazard = (id: string) => id.startsWith(GEAR_PREFIX);

// A hazard-shaped record for a checklist item, so the normal task views and sheet can show it.
export function gearHazard(hazardId: string): HazardEntry | null {
  if (!isGearHazard(hazardId)) return null;
  const [type, itemId] = hazardId.slice(GEAR_PREFIX.length).split(":");
  const parsed = GearTypeSchema.safeParse(type);
  if (!parsed.success) return null;
  const item = checklistFor(parsed.data).find((i) => i.id === itemId);
  if (!item) return null;
  const kind = kindOf(parsed.data);
  const severity = Object.fromEntries(
    STAGES.map((s) => [s, { score: 2, rationale: "From your gear checklist." }]),
  ) as HazardEntry["severity"];
  return {
    id: hazardId,
    name: item.title,
    rooms: [kind.room],
    stages: [...STAGES],
    severity,
    injury_evidence: [],
    evidence_status: "verify",
    unlock_age_months: 0,
    detection_cues: [],
    why_it_matters: `Checklist question: ${item.q}`,
    fix_steps: [
      { order: 1, text: item.fix, cost_usd_min: 0, cost_usd_max: 0, minutes: 10, tools: [] },
    ],
    verify_rule:
      "Answer yes to this question on the gear checklist after you have made the change.",
    blind_spots: [],
    citations: [{ ...item.source }],
    icon: kind.icon,
    es: item.es && {
      name: item.es.title,
      why_it_matters: `Pregunta de la lista: ${item.es.q}`,
      fix_steps_text: [item.es.fix],
      blind_spots: [],
      verify_rule:
        "Responda que sí a esta pregunta en la lista de revisión del equipo después de hacer el cambio.",
      severity_rationale: Object.fromEntries(
        STAGES.map((s) => [s, "De su lista de revisión del equipo."]),
      ) as Record<(typeof STAGES)[number], string>,
      reviewed_by: "machine translation, not yet reviewed by a fluent speaker",
      reviewed_on: null,
    },
  };
}

// Tasks implied by a gear item's "no" answers (status/owner/due of existing tasks are kept by the caller).
export function tasksForGear(g: GearItem): Task[] {
  const room = kindOf(g.type).room;
  return checklistFor(g.type)
    .filter((i) => g.answers?.[i.id] === "no")
    .map((i) => ({
      id: gearTaskId(g.id, i.id),
      hazard_id: gearHazardId(g.type, i.id),
      home_id: g.homeId,
      room,
      childIds: [],
      status: "todo" as const,
    }));
}

// Replaces one gear item's tasks: new "no" answers add tasks, "yes" answers (and removed gear) drop them.
export function syncGearTasks(tasks: Task[], gear: GearItem[], gearId: string): Task[] {
  const prefix = `t_gear_${gearId}_`;
  const old = new Map(tasks.filter((t) => t.id.startsWith(prefix)).map((t) => [t.id, t]));
  const g = gear.find((x) => x.id === gearId);
  const next = g ? tasksForGear(g).map((t) => old.get(t.id) ?? t) : [];
  return [...tasks.filter((t) => !t.id.startsWith(prefix)), ...next];
}

// Gear tasks that must survive a plan rebuild: the gear and its home still exist and the answer is still "no".
export function keepGearTasks(tasks: Task[], gear: GearItem[], homeIds: string[]): Task[] {
  const live = new Set(
    gear.filter((g) => homeIds.includes(g.homeId)).flatMap((g) => tasksForGear(g).map((t) => t.id)),
  );
  return tasks.filter((t) => isGearHazard(t.hazard_id) && live.has(t.id));
}
