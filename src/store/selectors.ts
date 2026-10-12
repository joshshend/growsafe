// Derived views over the store (pure, no React): ranked task rows, groups and progress.
import type { Child, HazardEntry, Room, Task } from "../kb/schema";
import { rankWithLead, type RankedHazard } from "../plan";

export type Group = "first" | "month" | "soon" | "done";
const FAR_MONTHS = 72;
export const FIRST_LIMIT = 5; // "Do first" shows at most this many open tasks

export interface TaskView {
  task: Task;
  hazard: HazardEntry;
  ranked: RankedHazard | null; // best ranking across the children this task protects
  severity: number; // 1-5
  group: Group;
}

export function buildViews(
  input: { children: Child[]; tasks: Task[] },
  kb: HazardEntry[],
  now: Date,
): TaskView[] {
  const hazards = new Map(kb.map((h) => [h.id, h]));
  const cache = new Map<string, RankedHazard[]>();
  const rankedFor = (child: Child, room: Room): RankedHazard[] => {
    const key = `${child.id}|${room}`;
    let r = cache.get(key);
    if (!r) {
      try {
        // Long look-ahead so tasks added early from the growth preview still rank as "upcoming".
        r = rankWithLead(kb, child, now, FAR_MONTHS, { rooms: [room] });
      } catch {
        r = [];
      }
      cache.set(key, r);
    }
    return r;
  };

  let firstCount = 0;
  const views: TaskView[] = [];
  for (const task of input.tasks) {
    const hazard = hazards.get(task.hazard_id);
    if (!hazard) continue;
    let ranked: RankedHazard | null = null;
    for (const id of task.childIds) {
      const child = input.children.find((c) => c.id === id);
      if (!child) continue;
      const r = rankedFor(child, task.room).find((x) => x.hazard.id === hazard.id);
      if (r && (!ranked || r.score > ranked.score)) ranked = r;
    }
    const sev = ranked?.reasons.find((r) => r.kind === "severity")?.params.score;
    const severity = typeof sev === "number" ? sev : 1;

    let group: Group;
    if (task.status === "done") group = "done";
    else if (ranked?.status === "upcoming") group = "soon";
    else if (severity >= 4 && firstCount < FIRST_LIMIT) {
      group = "first";
      firstCount++;
    } else group = "month";
    views.push({ task, hazard, ranked, severity, group });
  }
  return views;
}

export function progress(views: { task: Task }[]): { done: number; total: number } {
  return { done: views.filter((v) => v.task.status === "done").length, total: views.length };
}
