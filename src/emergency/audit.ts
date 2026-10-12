// Medicine and chemical storage check (T6). Pure: items come from the knowledge base, never from code.
// Yes/no/not-applicable answers decide whether the matching plan tasks are done.
import type { HazardEntry, Task } from "../kb/schema";

export const AUDIT_HAZARDS = ["medicine-storage", "cleaning-laundry-packs"] as const;
export type Answer = "yes" | "no" | "na";

export interface AuditItem {
  id: string; // `${hazardId}:${order}`
  hazardId: string;
  order: number; // fix_steps[].order in the KB entry
}

export function auditItems(kb: HazardEntry[]): AuditItem[] {
  const out: AuditItem[] = [];
  for (const id of AUDIT_HAZARDS) {
    const h = kb.find((x) => x.id === id);
    if (!h) continue;
    for (const s of [...h.fix_steps].sort((a, b) => a.order - b.order))
      out.push({ id: `${id}:${s.order}`, hazardId: id, order: s.order });
  }
  return out;
}

export interface TaskChange {
  taskId: string;
  status: Task["status"];
}

// Any "no" keeps the hazard's tasks open (a finished task is reopened). Every item answered with no "no"
// and at least one "yes" completes them. Partial answers change nothing.
export function auditChanges(
  tasks: Task[],
  homeId: string,
  items: AuditItem[],
  answers: Record<string, Answer>,
): TaskChange[] {
  const changes: TaskChange[] = [];
  for (const hazardId of new Set(items.map((i) => i.hazardId))) {
    const mine = items.filter((i) => i.hazardId === hazardId);
    const given = mine.map((i) => answers[i.id]);
    const anyNo = given.includes("no");
    const complete = given.every(Boolean) && given.includes("yes");
    for (const task of tasks) {
      if (task.home_id !== homeId || task.hazard_id !== hazardId) continue;
      if (anyNo && task.status === "done") changes.push({ taskId: task.id, status: "todo" });
      else if (!anyNo && complete && task.status !== "done")
        changes.push({ taskId: task.id, status: "done" });
    }
  }
  return changes;
}

export function auditProgress(
  items: AuditItem[],
  answers: Record<string, Answer>,
): { answered: number; total: number } {
  return { answered: items.filter((i) => answers[i.id]).length, total: items.length };
}
