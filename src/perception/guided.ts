// Guided room check (T9-lite): the user taps what they see; the knowledge base decides what that means.
// Pure logic, no React. No vision or AI: a "finding" is just a cue the person ticked (confidence 1).
import type { Child, Finding, HazardEntry, Home, Room, Task } from "../kb/schema";
import { rankHazards, taskId } from "../plan";

export interface RoomCue {
  cue: string;
  hazardId: string; // highest-ranked hazard that lists this cue (used for grouping)
  hazardIds: string[]; // every active or upcoming hazard in the room that lists it
  score: number; // score of that top hazard
}

// Union of detection cues from the active and upcoming hazards for this room and child,
// deduped, in order of hazard rank.
export function cuesForRoom(kb: HazardEntry[], room: Room, child: Child, now: Date): RoomCue[] {
  const out = new Map<string, RoomCue>();
  for (const r of rankHazards(kb, child, now, { rooms: [room] })) {
    for (const cue of r.hazard.detection_cues) {
      const seen = out.get(cue);
      if (seen) {
        if (!seen.hazardIds.includes(r.hazard.id)) seen.hazardIds.push(r.hazard.id);
      } else {
        out.set(cue, { cue, hazardId: r.hazard.id, hazardIds: [r.hazard.id], score: r.score });
      }
    }
  }
  return [...out.values()];
}

export function findingsFromTaps(taps: string[]): Finding[] {
  return [...new Set(taps.filter((c) => c.length > 0))].map((cue) => ({ cue, confidence: 1 }));
}

// Tasks for the ticked cues. Ids come from the plan's own taskId(), so they merge with the plan.
export function findingsToTasks(
  findings: Finding[],
  kb: HazardEntry[],
  home: Home,
  room: Room,
  childIds: string[] = [],
): Task[] {
  const cues = new Set(findings.map((f) => f.cue));
  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const h of kb) {
    if (!h.rooms.includes(room) || !h.detection_cues.some((c) => cues.has(c))) continue;
    const id = taskId(home.id, room, h.id);
    if (seen.has(id)) continue;
    seen.add(id);
    tasks.push({
      id,
      hazard_id: h.id,
      home_id: home.id,
      room,
      childIds: [...childIds],
      status: "todo",
    });
  }
  return tasks;
}

// Did the cues for this task's hazard get ticked again? `offered` is the list of cues the person was shown.
export function verifyFix(
  task: Task,
  findingsAfter: Finding[],
  kb: HazardEntry[],
  offered: string[],
): "fixed" | "still_present" | "cannot_tell" {
  const hazard = kb.find((h) => h.id === task.hazard_id);
  if (!hazard) return "cannot_tell";
  const shown = hazard.detection_cues.filter((c) => offered.includes(c));
  if (shown.length === 0) return "cannot_tell";
  const ticked = new Set(findingsAfter.map((f) => f.cue));
  return shown.some((c) => ticked.has(c)) ? "still_present" : "fixed";
}
