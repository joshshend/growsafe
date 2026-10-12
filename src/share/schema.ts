// Shape of a plan that leaves the device (T7). Strict: unknown keys are rejected on import.
import { z } from "zod";
import { RoomSchema, StageSchema } from "../kb/schema";

export const SHARE_VERSION = 1 as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const short = (n: number) => z.string().min(1).max(n);

export const SharedChildSchema = z
  .object({ id: short(64), nickname: short(60), ageBand: StageSchema })
  .strict();

export const SharedHomeSchema = z
  .object({ id: short(64), name: short(80), rooms: z.array(RoomSchema).max(20) })
  .strict();

export const SharedTaskSchema = z
  .object({
    id: short(64),
    hazard_id: short(80),
    home_id: short(64),
    room: RoomSchema,
    childIds: z.array(short(64)).max(20),
    status: z.enum(["todo", "doing", "done"]),
    owner: short(60).optional(),
    due: isoDate.optional(),
  })
  .strict();

export const SharedPlanSchema = z
  .object({
    v: z.literal(SHARE_VERSION),
    children: z.array(SharedChildSchema).max(20),
    homes: z.array(SharedHomeSchema).max(20),
    tasks: z.array(SharedTaskSchema).max(500),
  })
  .strict();

export type SharedPlan = z.infer<typeof SharedPlanSchema>;
