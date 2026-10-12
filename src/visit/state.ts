// Visit pack logic for the UI (T22 Part B). Pure: no React, no storage. Wraps src/share/visit.ts.
import {
  buildReply,
  mergeReply,
  type MergeSummary,
  type Reply,
  type VisitPack,
} from "../share/visit";

export type Status = "todo" | "doing" | "done";

export interface HelperTask {
  id: string;
  status: Status;
  updatedAt: number;
}
// The helper's own copy. It lives on the helper's phone only, under its own storage key.
export interface HelperState {
  pack: VisitPack;
  by: string;
  tasks: HelperTask[];
}

export const initHelper = (pack: VisitPack, by = ""): HelperState => ({
  pack,
  by,
  tasks: pack.tasks.map((t) => ({ id: t.id, status: t.status, updatedAt: t.updatedAt })),
});

// Tick or untick one item. Unknown ids change nothing. Returns a new state.
export function tick(s: HelperState, id: string, done: boolean, now: number): HelperState {
  const status: Status = done ? "done" : "todo";
  return {
    ...s,
    tasks: s.tasks.map((t) =>
      t.id === id && t.status !== status
        ? { ...t, status, updatedAt: Math.max(now, t.updatedAt + 1) }
        : t,
    ),
  };
}

export const setBy = (s: HelperState, by: string): HelperState => ({ ...s, by });

export function progress(s: HelperState): { done: number; total: number } {
  return { done: s.tasks.filter((t) => t.status === "done").length, total: s.tasks.length };
}

// Items changed since the pack arrived. 0 means there is nothing to send back yet.
export function changedCount(s: HelperState): number {
  return buildReply(s.pack, s.tasks, "Helper").updates.length;
}

export const helperReply = (s: HelperState): Reply => buildReply(s.pack, s.tasks, s.by);

// Accept a restored state only if it belongs to this pack (never trust stored data blindly).
export function restoreHelper(pack: VisitPack, saved: unknown): HelperState {
  const fresh = initHelper(pack);
  const s = saved as Partial<HelperState> | null;
  if (!s || !Array.isArray(s.tasks) || s.pack?.packId !== pack.packId) return fresh;
  const byId = new Map(s.tasks.map((t) => [t?.id, t]));
  return {
    pack,
    by: typeof s.by === "string" ? s.by : "",
    tasks: fresh.tasks.map((t) => {
      const o = byId.get(t.id);
      const ok =
        o &&
        (o.status === "todo" || o.status === "doing" || o.status === "done") &&
        Number.isFinite(o.updatedAt);
      return ok ? { id: t.id, status: o.status, updatedAt: o.updatedAt } : t;
    }),
  };
}

// What the parent keeps about a pack it sent: no task text, just enough to spot later edits.
export interface SentPack {
  packId: string;
  homeId: string;
  homeName: string;
  helper: string; // label typed by the parent, e.g. "Grandma" (stays on this phone)
  sentAt: number;
  snapshot: Record<string, Status>;
  mergedAt?: number;
}

export function sentRecord(
  pack: VisitPack,
  homeId: string,
  helper: string,
  sentAt: number,
): SentPack {
  return {
    packId: pack.packId,
    homeId,
    homeName: pack.homeName,
    helper: helper.trim(),
    sentAt,
    snapshot: Object.fromEntries(pack.tasks.map((t) => [t.id, t.status])),
  };
}

export interface LocalTask {
  id: string;
  status: Status;
}
export interface MergePreview {
  changes: { id: string; status: Status }[];
  finished: number; // changes that mark a task done
  summary: MergeSummary;
}

// Work out what a reply would change, without changing anything. A task the parent edited after
// sending counts as newer than the reply, so the parent's own edit wins.
export function previewMerge(
  tasks: readonly LocalTask[],
  sent: SentPack | undefined,
  reply: Reply,
  now: number,
): MergePreview {
  const stamped = tasks.map((t) => ({
    ...t,
    updatedAt: !sent ? 0 : sent.snapshot[t.id] !== t.status ? now : sent.sentAt,
  }));
  const { tasks: merged, summary } = mergeReply(stamped, reply);
  const before = new Map(tasks.map((t) => [t.id, t.status]));
  const changes = merged
    .filter((t) => before.get(t.id) !== t.status)
    .map((t) => ({ id: t.id, status: t.status }));
  return { changes, finished: changes.filter((c) => c.status === "done").length, summary };
}
