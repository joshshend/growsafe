// Room check state (pure, no React). A room is only "checked" after the person says what is in it;
// hazards are never assumed. Tasks come from the cues they confirm (src/perception/guided.ts).
import type { Child, HazardEntry, Home, Room, Task } from "../kb/schema";
import { cuesForRoom, findingsFromTaps, findingsToTasks, type RoomCue } from "../perception/guided";

export const RECHECK_DAYS = 30;

export type RoomStatus = "unchecked" | "checked";

export function roomCheckOf(home: Home, room: Room) {
  return home.checks?.[room];
}

export function isChecked(home: Home, room: Room): boolean {
  return roomCheckOf(home, room) !== undefined;
}

// Re-check is due when the last check is more than RECHECK_DAYS old.
export function recheckDue(home: Home, room: Room, now: Date): boolean {
  const c = roomCheckOf(home, room);
  if (!c) return false;
  const at = Date.parse(c.checkedAt);
  if (Number.isNaN(at)) return false;
  return now.getTime() - at > RECHECK_DAYS * 864e5;
}

// First room (in home order) that has not been checked yet.
export function firstUnchecked(homes: Home[]): { home: Home; room: Room } | null {
  for (const home of homes) {
    for (const room of home.rooms) if (!isChecked(home, room)) return { home, room };
  }
  return null;
}

export function anyChecked(homes: Home[]): boolean {
  return homes.some((h) => Object.keys(h.checks ?? {}).length > 0);
}

// Cues to pre-tick when the tap list is re-opened: the earlier taps, plus every cue of a hazard that
// already has a task in this room but no earlier tap (photo scan, growth preview).
export function prefillCues(
  kb: HazardEntry[],
  home: Home,
  room: Room,
  tasks: Task[],
  offered: string[],
): string[] {
  const out = new Set(roomCheckOf(home, room)?.cues ?? []);
  for (const t of tasks) {
    if (t.home_id !== home.id || t.room !== room) continue;
    const h = kb.find((x) => x.id === t.hazard_id);
    if (!h || h.detection_cues.some((c) => out.has(c))) continue;
    for (const c of h.detection_cues) out.add(c);
  }
  const shown = new Set(offered);
  return [...out].filter((c) => shown.has(c));
}

export interface RoomCheckResult {
  tasks: Task[]; // the full task list after the check
  added: Task[]; // tasks for the ticked cues (new or already there)
  fresh: number; // how many of those are new
  removed: number; // untouched to-do tasks dropped because their cues were unticked
  home: Home;
}

// Saves a room check: adds tasks for ticked cues, removes untouched to-do tasks whose cues were
// unticked (never done/doing tasks, never ones with an owner or due date), and stamps checkedAt.
export function applyRoomCheck(args: {
  kb: HazardEntry[];
  home: Home;
  room: Room;
  cues: string[];
  child: Child;
  tasks: Task[];
  now: Date;
}): RoomCheckResult {
  const { kb, home, room, child, tasks, now } = args;
  const offered = cuesForRoom(kb, room, child, now);
  const scoped = kb.filter((h) => offered.some((c: RoomCue) => c.hazardIds.includes(h.id)));
  const cues = [...new Set(args.cues.filter((c) => c.length > 0))];
  const made = findingsToTasks(findingsFromTaps(cues), scoped, home, room, [child.id]);
  const madeHazards = new Set(made.map((m) => m.hazard_id));
  const scopedIds = new Set(scoped.map((h) => h.id));

  const before = new Map(tasks.map((t) => [t.id, t]));
  const fresh = made.filter((m) => !before.has(m.id)).length;
  const isRemovable = (t: Task) =>
    t.home_id === home.id &&
    t.room === room &&
    t.status === "todo" &&
    !t.owner &&
    !t.due &&
    scopedIds.has(t.hazard_id) &&
    !madeHazards.has(t.hazard_id);
  const kept = tasks.filter((t) => !isRemovable(t));
  const removed = tasks.length - kept.length;

  const byId = new Map(kept.map((t) => [t.id, t]));
  for (const m of made) {
    const old = byId.get(m.id);
    byId.set(
      m.id,
      old ? { ...old, childIds: Array.from(new Set([...old.childIds, ...m.childIds])) } : m,
    );
  }
  const nextHome: Home = {
    ...home,
    checks: { ...(home.checks ?? {}), [room]: { checkedAt: now.toISOString(), cues } },
  };
  return { tasks: [...byId.values()], added: made, fresh, removed, home: nextHome };
}

// "Nothing here needs fixing": checked, zero tasks (untouched to-do tasks are cleared like an edit would).
export function markChecked(home: Home, room: Room, now: Date): Home {
  return {
    ...home,
    checks: { ...(home.checks ?? {}), [room]: { checkedAt: now.toISOString(), cues: [] } },
  };
}

// Saves from before room checks have no `checks`. Auto-made to-do tasks (no progress, owner or due) in
// those homes are dropped, because the app only guessed them; anything the person touched stays, and a
// room that keeps tasks counts as checked as of `now`. Homes that already have `checks` are untouched.
export function migrateChecks(
  homes: Home[],
  tasks: Task[],
  now: Date,
): { homes: Home[]; tasks: Task[] } {
  const legacy = new Set(homes.filter((h) => h.checks === undefined).map((h) => h.id));
  if (legacy.size === 0) return { homes, tasks };
  const isGear = (t: Task) => t.hazard_id.startsWith("gear:"); // gear checklist tasks are the person's own answers
  const touched = (t: Task) => isGear(t) || t.status !== "todo" || !!t.owner || !!t.due;
  const keep = tasks.filter((t) => !legacy.has(t.home_id) || touched(t));
  const nextHomes = homes.map((h): Home => {
    if (!legacy.has(h.id)) return h;
    const checks: NonNullable<Home["checks"]> = {};
    for (const room of h.rooms)
      if (keep.some((t) => t.home_id === h.id && t.room === room && !isGear(t)))
        checks[room] = { checkedAt: now.toISOString(), cues: [] };
    return { ...h, checks };
  });
  return { homes: nextHomes, tasks: keep };
}
