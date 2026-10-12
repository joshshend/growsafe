// Visit pack + return link (T22 Part A). Pure logic: no React, no network.
// A pack goes out as a link; the helper ticks items locally and sends a tiny reply link back.
// Same codec rules as plan links: deflate + base64url, strict Zod, size caps, first names only.
import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { z } from "zod";
import { ageMonths, stageForAge } from "../plan/stage";
import type { Plan, Stage } from "../kb/schema";
import { RoomSchema, StageSchema } from "../kb/schema";
import {
  MAX_ENCODED_BYTES,
  MAX_INFLATED_BYTES,
  fromBase64Url,
  isTooLarge,
  toBase64Url,
} from "./codec";

export const VISIT_VERSION = 1 as const;
const NAME_ERR = "Share data is corrupted or not a GrowSafe link.";

const short = (n: number) => z.string().min(1).max(n);
const idStr = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const packIdStr = z.string().regex(/^[A-Za-z0-9_-]{8,32}$/);
// First name only: one word, no spaces, digits or punctuation beyond - and '.
const firstName = z.string().regex(/^[\p{L}\p{M}'’-]{1,30}$/u, "First name only.");
const status = z.enum(["todo", "doing", "done"]);
const at = z.number().int().min(0).max(8.64e15); // epoch ms

export const VisitTaskSchema = z
  .object({
    id: idStr,
    hazardId: short(80),
    room: RoomSchema,
    status,
    updatedAt: at,
  })
  .strict();

export const VisitPackSchema = z
  .object({
    v: z.literal(VISIT_VERSION),
    packId: packIdStr,
    homeName: short(80),
    ageBand: StageSchema,
    tasks: z.array(VisitTaskSchema).max(200),
    from: firstName,
  })
  .strict();

export const ReplyUpdateSchema = z.object({ taskId: idStr, status, at }).strict();

export const ReplySchema = z
  .object({
    v: z.literal(VISIT_VERSION),
    packId: packIdStr,
    by: firstName,
    updates: z.array(ReplyUpdateSchema).max(200),
  })
  .strict();

export type VisitPack = z.infer<typeof VisitPackSchema>;
export type Reply = z.infer<typeof ReplySchema>;
export type TaskStatus = z.infer<typeof status>;

function encode(schema: z.ZodTypeAny, value: unknown, what: string): string {
  const valid = schema.parse(value);
  const out = toBase64Url(deflateSync(strToU8(JSON.stringify(valid)), { level: 9 }));
  if (isTooLarge(out)) {
    throw new Error(
      `This ${what} is too large for a link (limit ${MAX_ENCODED_BYTES} characters).`,
    );
  }
  return out;
}

function decode<S extends z.ZodTypeAny>(schema: S, s: string): z.infer<S> {
  const m = /[?&]d=([^&#]*)/.exec(s);
  const data = (m ? m[1] : s).trim();
  if (!data) throw new Error("No share data found.");
  if (data.length > MAX_ENCODED_BYTES) throw new Error("Share data is too large.");
  let json: string;
  try {
    json = strFromU8(inflateSync(fromBase64Url(data)));
  } catch {
    throw new Error(NAME_ERR);
  }
  if (json.length > MAX_INFLATED_BYTES) throw new Error("Share data is too large.");
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error(NAME_ERR);
  }
  const v = (raw as { v?: unknown } | null)?.v;
  if (v !== VISIT_VERSION) throw new Error(`Unsupported share version: ${String(v)}.`);
  return schema.parse(raw);
}

export const encodeVisitPack = (p: VisitPack): string => encode(VisitPackSchema, p, "visit pack");
export const decodeVisitPack = (s: string): VisitPack => decode(VisitPackSchema, s);
export const encodeReply = (r: Reply): string => encode(ReplySchema, r, "reply");
export const decodeReply = (s: string): Reply => decode(ReplySchema, s);

const base = (origin: string) => origin.replace(/\/+$/, "");
export const visitPackUrl = (origin: string, p: VisitPack): string =>
  `${base(origin)}/#/visit?d=${encodeVisitPack(p)}`;
export const replyUrl = (origin: string, r: Reply): string =>
  `${base(origin)}/#/merge?d=${encodeReply(r)}`;

// Build a pack for one home from the device plan, field by field (allow-list), so nothing
// private can leak. Age band is the youngest child's. `stamps` optionally gives each task's
// last-change time (epoch ms); missing means 0.
export function buildVisitPack(
  plan: Plan,
  homeId: string,
  opts: { from: string; packId: string; now?: Date; stamps?: Record<string, number> },
): VisitPack {
  const home = plan.homes.find((h) => h.id === homeId);
  if (!home) throw new Error("Unknown home.");
  const now = opts.now ?? new Date();
  if (plan.children.length === 0) throw new Error("Add a child first.");
  const youngest = Math.min(...plan.children.map((c) => ageMonths(c, now)));
  const ageBand: Stage = stageForAge(youngest);
  return VisitPackSchema.parse({
    v: VISIT_VERSION,
    packId: opts.packId,
    homeName: home.name,
    ageBand,
    from: opts.from,
    tasks: plan.tasks
      .filter((t) => t.home_id === homeId)
      .map((t) => ({
        id: t.id,
        hazardId: t.hazard_id,
        room: t.room,
        status: t.status,
        updatedAt: opts.stamps?.[t.id] ?? 0,
      })),
  });
}

// Helper side: turn ticked tasks into a reply (only tasks changed since the pack arrived).
export function buildReply(
  pack: VisitPack,
  current: { id: string; status: TaskStatus; updatedAt: number }[],
  by: string,
): Reply {
  const before = new Map(pack.tasks.map((t) => [t.id, t]));
  return ReplySchema.parse({
    v: VISIT_VERSION,
    packId: pack.packId,
    by,
    updates: current
      .filter((c) => {
        const b = before.get(c.id);
        return b && (c.status !== b.status || c.updatedAt > b.updatedAt);
      })
      .map((c) => ({ taskId: c.id, status: c.status, at: c.updatedAt })),
  });
}

export type MergeSummary = { applied: number; ignored: number; by: string };
export type Mergeable = { id: string; status: TaskStatus; updatedAt?: number };

// Apply a reply to local tasks. An update applies only if strictly newer than the local
// updatedAt (missing = 0), so a stale 'todo' can never undo a newer 'done'. Unknown ids are
// ignored; several updates for one task are applied oldest first. Pure and idempotent.
export function mergeReply<T extends Mergeable>(
  localTasks: readonly T[],
  reply: Reply,
): { tasks: T[]; summary: MergeSummary } {
  const r = ReplySchema.parse(reply);
  const byId = new Map(localTasks.map((t) => [t.id, { ...t }]));
  let applied = 0;
  let ignored = 0;
  const ordered = r.updates.map((u, i) => ({ u, i })).sort((a, b) => a.u.at - b.u.at || a.i - b.i);
  for (const { u } of ordered) {
    const t = byId.get(u.taskId);
    if (!t || u.at <= (t.updatedAt ?? 0)) {
      ignored++;
      continue;
    }
    const changed = t.status !== u.status;
    t.status = u.status;
    t.updatedAt = u.at;
    if (changed) applied++;
    else ignored++;
  }
  return {
    tasks: localTasks.map((t) => byId.get(t.id) as T),
    summary: { applied, ignored, by: r.by },
  };
}
