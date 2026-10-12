// Turns hazards + children + homes into a task list (T4). One task per hazard per home room.
// Several children share a task (childIds); the task id ignores children so adding a child keeps progress.
// Re-building keeps status/owner/due of tasks that already exist.
import type { Child, HazardEntry, Home, Task } from "../kb/schema";
import { rankHazards } from "./rank";

// Small deterministic string hash (cyrb53) -> base36. Not cryptographic; just a stable id.
function hash(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function taskId(homeId: string, room: string, hazardId: string): string {
  return `t_${hash(`${homeId}|${room}|${hazardId}`)}`;
}

export function buildPlan(
  kb: HazardEntry[],
  children: Child[],
  homes: Home[],
  now: Date,
  existingTasks: Task[] = [],
): Task[] {
  const previous = new Map(existingTasks.map((t) => [t.id, t]));
  const built: { task: Task; score: number }[] = [];

  for (const home of homes) {
    for (const room of home.rooms) {
      const byHazard = new Map<string, { childIds: string[]; score: number }>();
      for (const child of children) {
        // Only hazards relevant to this room (hazard.rooms contains it).
        for (const r of rankHazards(kb, child, now, { rooms: [room] })) {
          const entry = byHazard.get(r.hazard.id) ?? { childIds: [], score: 0 };
          entry.childIds.push(child.id);
          entry.score = Math.max(entry.score, r.score); // dedupe across children: keep the max score
          byHazard.set(r.hazard.id, entry);
        }
      }
      for (const [hazardId, { childIds, score }] of byHazard) {
        const id = taskId(home.id, room, hazardId);
        const old = previous.get(id);
        const task: Task = {
          id,
          hazard_id: hazardId,
          home_id: home.id,
          room,
          childIds,
          status: old?.status ?? "todo",
          ...(old?.owner !== undefined && { owner: old.owner }),
          ...(old?.due !== undefined && { due: old.due }),
        };
        built.push({ task, score });
      }
    }
  }

  // Best tasks first; id keeps the order deterministic.
  built.sort((a, b) => b.score - a.score || a.task.id.localeCompare(b.task.id));
  return built.map((b) => b.task);
}
