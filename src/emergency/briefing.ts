// Sitter briefing content (T6). Pure: picks what to print; wording comes from the KB and i18n keys.
// The emergency card is NOT part of this object. It is read from device storage at print time only.
import type { Child, HazardEntry, Home, Room, Stage, Task } from "../kb/schema";
import { ageMonths, stageForAge } from "../plan";
import { buildViews, type TaskView } from "../store/selectors";

export const TOP_TASKS = 5;
// medicine-storage fix steps worth telling a sitter (put away, store high, visitors' bags, Poison Help).
export const KNOW_HAZARD = "medicine-storage";
export const KNOW_STEP_ORDERS = [1, 2, 3, 5];

export interface Briefing {
  homeName: string;
  rooms: Room[];
  children: { id: string; nickname: string; stage: Stage | null }[];
  top: TaskView[];
  know: HazardEntry | null;
}

export function buildBriefing(
  kb: HazardEntry[],
  home: Home,
  children: Child[],
  tasks: Task[],
  now: Date,
): Briefing {
  const mine = tasks.filter((t) => t.home_id === home.id);
  const open = buildViews({ children, tasks: mine }, kb, now)
    .filter((v) => v.group !== "done" && v.ranked?.status !== "upcoming")
    .sort(
      (a, b) =>
        (b.ranked?.score ?? 0) - (a.ranked?.score ?? 0) || a.hazard.id.localeCompare(b.hazard.id),
    );
  return {
    homeName: home.name,
    rooms: [...home.rooms],
    children: children.map((c) => {
      let stage: Stage | null = null;
      try {
        stage = stageForAge(ageMonths(c, now));
      } catch {
        /* birth date in the future: leave the age band out */
      }
      return { id: c.id, nickname: c.nickname, stage };
    }),
    top: open.slice(0, TOP_TASKS),
    know: kb.find((h) => h.id === KNOW_HAZARD) ?? null,
  };
}

// Non-empty, trimmed lines of a free-text field.
export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
