// Zod schemas + types for the knowledge base and the user's plan (T2).
import { z } from "zod";

// How far ahead of a risk starting a task should appear (months). Used by the ranking engine (T4).
export const LEAD_TIME_MONTHS = 2;

export const ROOMS = [
  "living_room",
  "bedroom",
  "nursery",
  "kitchen",
  "bathroom",
  "stairs",
  "outdoors",
  "car",
  "garage",
] as const;
export const STAGES = ["0-3m", "3-6m", "6-12m", "12-24m", "24-36m", "36-60m"] as const;

export const RoomSchema = z.enum(ROOMS); // where in the home the hazard lives
export const StageSchema = z.enum(STAGES); // child age band

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date YYYY-MM-DD");

export const SeveritySchema = z.object({
  score: z.number().int().min(1).max(5), // 1 = minor, 5 = most severe for this stage
  rationale: z.string().min(1), // one line on why this score
});

export const InjuryEvidenceSchema = z.object({
  cause_category: z.string().min(1), // e.g. "furniture tip-over"
  age_band: z.string().min(1), // age group the statistic covers
  source: z.enum(["CDC", "CPSC", "AAP", "PoisonHelp", "other"]), // who published it
  year: z.string().min(1), // year or range of years, e.g. "2020-2022"
  url: z.string().url(), // where the number comes from
  note: z.string(), // the figure itself and any caveat
});

export const FixStepSchema = z.object({
  order: z.number().int().min(1), // position in the sequence
  text: z.string().min(1), // what to do
  cost_usd_min: z.number().min(0), // low estimate of cost
  cost_usd_max: z.number().min(0), // high estimate of cost
  minutes: z.number().min(0), // time the step takes
  tools: z.array(z.string()), // tools needed (may be empty)
  optional: z.boolean().optional(), // true = conditional or alternative step; left out of time/cost totals (absent = false)
});

export const CitationSchema = z.object({
  title: z.string().min(1), // page or document title
  publisher: z.string().min(1), // organization
  url: z.string().url(), // link (validator requires https)
  accessed: isoDate, // date the link was last checked
});

export const SpanishSchema = z.object({
  name: z.string(), // translated name
  why_it_matters: z.string(), // translated explanation
  fix_steps_text: z.array(z.string()), // translated step texts, same order as fix_steps
  blind_spots: z.array(z.string()), // translated blind_spots, same order
  verify_rule: z.string(), // translated verify_rule
  reminder_text: z.string().optional(), // translated reminder.text (when the entry has a reminder)
  severity_rationale: z.record(StageSchema, z.string()), // translated severity[stage].rationale
  reviewed_by: z.string(), // fluent reviewer's name, or "machine translation, not yet reviewed by a fluent speaker"
  reviewed_on: isoDate.nullable(), // review date; null until a fluent speaker has reviewed it
});

export const HazardEntrySchema = z
  .object({
    id: kebab, // unique stable key
    name: z.string().min(1), // short display name
    rooms: z.array(RoomSchema).min(1), // rooms where it applies
    stages: z.array(StageSchema).min(1), // stages where it applies
    severity: z.record(StageSchema, SeveritySchema), // per-stage severity score + rationale
    injury_evidence: z.array(InjuryEvidenceSchema), // statistics; only empty when evidence_status is "verify"
    evidence_status: z.enum(["sourced", "verify"]), // "verify" = a human must re-check
    unlock_age_months: z.number().min(0), // age at which the risk begins
    detection_cues: z.array(z.string().min(1)), // labels the photo scanner must output
    why_it_matters: z.string().min(1), // plain language, at most 2 sentences
    fix_steps: z.array(FixStepSchema).min(1), // ordered fixes
    reminder: z.object({ every_days: z.number().int().min(1), text: z.string() }).optional(), // recurring re-check
    verify_rule: z.string().min(1), // what a check-off or re-scan confirms
    blind_spots: z.array(z.string()), // things a photo cannot show
    citations: z.array(CitationSchema).min(1), // sources, at least one
    icon: z.string().min(1), // icon key for the UI
    es: SpanishSchema.optional(), // Spanish text (machine-translated until reviewed_on is set)
  })
  .superRefine((e, ctx) => {
    if (e.evidence_status === "sourced" && e.injury_evidence.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["injury_evidence"],
        message: 'empty injury_evidence requires evidence_status "verify"',
      });
    }
  });

export const FindingSchema = z.object({
  cue: z.string().min(1), // a detection cue label
  confidence: z.number().min(0).max(1), // model confidence
  note: z.string().optional(), // optional free text
});

export const ChildSchema = z.object({
  id: z.string().min(1), // local id
  nickname: z.string().min(1), // first name or nickname only
  birth_month: z.number().int().min(1).max(12), // month only, no exact date
  birth_year: z.number().int().min(1990).max(2100), // year
});

export const HomeSchema = z.object({
  id: z.string().min(1), // local id
  name: z.string().min(1), // e.g. "Grandma's house"
  rooms: z.array(RoomSchema), // rooms in this home
  // Rooms the person has checked: checkedAt (ISO) and the cues they ticked. Missing = not checked yet.
  checks: z
    .record(z.string(), z.object({ checkedAt: z.string(), cues: z.array(z.string()).default([]) }))
    .optional(),
});

export const TaskSchema = z.object({
  id: z.string().min(1), // local id
  hazard_id: z.string().min(1), // links to HazardEntry.id
  home_id: z.string().min(1), // which home
  room: RoomSchema, // which room
  childIds: z.array(z.string()).default([]), // children this task protects (one task is shared across children)
  status: z.enum(["todo", "doing", "done"]), // progress
  owner: z.string().optional(), // who is doing it
  due: isoDate.optional(), // due date
});

export const PlanSchema = z.object({
  children: z.array(ChildSchema),
  homes: z.array(HomeSchema),
  tasks: z.array(TaskSchema),
});

export type Room = z.infer<typeof RoomSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type HazardEntry = z.infer<typeof HazardEntrySchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Child = z.infer<typeof ChildSchema>;
export type Home = z.infer<typeof HomeSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;
