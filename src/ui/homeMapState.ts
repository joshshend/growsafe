// Home map: what each room looks like on the drawing (pure, no React).
//   unchecked: nobody has said what is in the room yet (empty hatch)
//   open:      fixes still to do; `intensity` 1-4 says how strongly to tint it (count and severity)
//   done:      checked and nothing is left to do (ticked)
import type { Task } from "../kb/schema";

export type RoomState =
  | { kind: "unchecked" }
  | {
      kind: "open";
      open: number;
      done: number;
      total: number;
      weight: number;
      intensity: 1 | 2 | 3 | 4;
    }
  | { kind: "done"; total: number };

export interface MapTask {
  status: Task["status"];
  severity: number; // 1-5
}

// Severity-weighted tint: one mild fix is faint, a few serious ones are strong. No red anywhere.
export function intensityOf(weight: number): 1 | 2 | 3 | 4 {
  if (weight <= 2) return 1;
  if (weight <= 6) return 2;
  if (weight <= 12) return 3;
  return 4;
}

export function roomState(checked: boolean, tasks: MapTask[]): RoomState {
  const total = tasks.length;
  if (total === 0) return checked ? { kind: "done", total: 0 } : { kind: "unchecked" };
  const open = tasks.filter((t) => t.status !== "done");
  if (open.length === 0) return { kind: "done", total };
  const weight = open.reduce((sum, t) => sum + Math.min(5, Math.max(1, Math.round(t.severity))), 0);
  return {
    kind: "open",
    open: open.length,
    done: total - open.length,
    total,
    weight,
    intensity: intensityOf(weight),
  };
}

// "{n} fixes open across {m} rooms": totals over the rooms that exist in the home.
export function mapSummary(states: RoomState[]): { open: number; rooms: number; checked: number } {
  let open = 0;
  let rooms = 0;
  let checked = 0;
  for (const s of states) {
    if (s.kind !== "unchecked") checked += 1;
    if (s.kind === "open") {
      open += s.open;
      rooms += 1;
    }
  }
  return { open, rooms, checked };
}
