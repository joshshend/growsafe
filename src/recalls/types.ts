// Types for "My gear": the products a family owns, and the recall matches found for them.
import { z } from "zod";

export const GEAR_TYPES = [
  "crib",
  "bassinet",
  "car_seat",
  "booster",
  "high_chair",
  "stroller",
  "play_yard",
  "bouncer_swing",
  "baby_gate",
  "changing_table",
] as const;
export const GearTypeSchema = z.enum(GEAR_TYPES);
export type GearType = z.infer<typeof GearTypeSchema>;

// One possible match from the CPSC recall list. It is only ever a "possible match": the model number decides.
export const RecallMatchSchema = z.object({
  recallId: z.string().min(1),
  recallNumber: z.string(),
  title: z.string().min(1),
  date: z.string(), // YYYY-MM-DD, or "" when the notice has no date
  hazard: z.string(), // first hazard line from the notice, may be empty
  url: z.string().url().startsWith("https://"), // the official notice
  modelMentioned: z.boolean(), // the model the user typed appears in the notice text
});
export type RecallMatch = z.infer<typeof RecallMatchSchema>;

export const GearItemSchema = z.object({
  id: z.string().min(1),
  homeId: z.string().min(1),
  type: GearTypeSchema,
  brand: z.string().min(1),
  model: z.string().optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  secondHand: z.boolean(),
  labelDate: z.string().optional(), // free text: the date printed on the label (car seats)
  expires: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(), // car seats: expiry date from the label, YYYY-MM-DD, typed by the person
  lastChecked: z.string().optional(), // ISO time of the last successful recall check
  recallMatches: z.array(RecallMatchSchema).optional(), // result of that check ([] = nothing found)
  dismissed: z.array(z.string()).optional(), // recall ids the user marked "not my product"
  answers: z.record(z.enum(["yes", "no"])).optional(), // checklist item id -> answer
});
export type GearItem = z.infer<typeof GearItemSchema>;

export const GearListSchema = z.array(GearItemSchema);

// Matches the user has not dismissed.
export function activeMatches(g: GearItem): RecallMatch[] {
  const hide = new Set(g.dismissed ?? []);
  return (g.recallMatches ?? []).filter((m) => !hide.has(m.recallId));
}
