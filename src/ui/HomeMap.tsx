// Home map: the top of the Rooms tab. A pencil cutaway of the house where every room is a link and its fill
// shows where it stands. The room list below stays the keyboard-first, screen-reader-first way in.
import type { Home, Room } from "../kb/schema";
import { isChecked } from "../plan/roomCheck";
import type { TaskView } from "../store/selectors";
import { HomeCutaway, type CutawayRoom } from "./illustrations";
import { mapSummary, roomState, type RoomState } from "./homeMapState";
import { useT } from "./useT";
import "./homemap.css";

const ALL: Room[] = [
  "living_room",
  "bedroom",
  "nursery",
  "kitchen",
  "bathroom",
  "stairs",
  "outdoors",
  "car",
  "garage",
];

export function HomeMap({ home, views }: { home: Home; views: TaskView[] }) {
  const t = useT();
  const rooms: Partial<Record<Room, CutawayRoom>> = {};
  const names: Record<string, string> = {};
  const states: RoomState[] = [];
  for (const r of ALL) {
    names[r] = t(`room.${r}`);
    if (!home.rooms.includes(r)) continue;
    const mine = views.filter((v) => v.task.home_id === home.id && v.task.room === r);
    const state = roomState(
      isChecked(home, r),
      mine.map((v) => ({ status: v.task.status, severity: v.severity })),
    );
    states.push(state);
    const room = names[r];
    const ariaLabel =
      state.kind === "unchecked"
        ? t("homemap.aria.unchecked", { room })
        : state.kind === "open"
          ? t("homemap.aria.open", { room, done: state.done, total: state.total })
          : state.total === 0
            ? t("homemap.aria.clear", { room })
            : t("homemap.aria.done", { room, total: state.total });
    rooms[r] = { state, href: `/room/${home.id}/${r}`, ariaLabel };
  }
  const { open, rooms: openRooms, checked } = mapSummary(states);
  const summary =
    checked === 0
      ? t("homemap.start")
      : open === 0
        ? t("homemap.none")
        : openRooms === 1
          ? t(open === 1 ? "homemap.summaryOne" : "homemap.summaryRoom", { n: open })
          : t("homemap.summary", { n: open, m: openRooms });
  return (
    <div className="hm-wrap">
      <p className="t2b hm-summary">{summary}</p>
      <HomeCutaway rooms={rooms} names={names} label={t("homemap.label", { home: home.name })} />
      <ul className="hm-legend t1 muted" aria-hidden="true">
        <li>
          <span className="hm-sw hm-sw-unchecked" />
          {t("homemap.legend.unchecked")}
        </li>
        <li>
          <span className="hm-sw hm-sw-open" />
          {t("homemap.legend.open")}
        </li>
        <li>
          <span className="hm-sw hm-sw-done" />
          {t("homemap.legend.done")}
        </li>
      </ul>
    </div>
  );
}
