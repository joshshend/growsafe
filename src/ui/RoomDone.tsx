// The all-done moment: a full-screen page that opens when the last open task in a room is ticked.
// It reads only what the app already knows (task status per room); nothing new is stored.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/store";
import { progress, type TaskView } from "../store/selectors";
import { ageText, taskTotals } from "./format";
import { DoneDoorframe } from "./illustrations";
import { useChildViews } from "./parts";
import { useModalDialog } from "./Sheet";
import { useActiveChild } from "./ui-state";
import { useLang, useT } from "./useT";

type Shown = { homeId: string; room: string };
const keyOf = (v: TaskView) => `${v.task.home_id}|${v.task.room}`;

// Watches room completion. Opens only when a room goes from "something left" to "all done" while on screen:
// not on first load, not when switching child, not for empty rooms.
export function RoomDone() {
  const views = useChildViews();
  const child = useActiveChild();
  const [shown, setShown] = useState<Shown | null>(null);
  const prev = useRef<{ child: string | null; map: Map<string, boolean> } | null>(null);

  useEffect(() => {
    const groups = new Map<string, { done: number; total: number }>();
    for (const v of views) {
      const g = groups.get(keyOf(v)) ?? { done: 0, total: 0 };
      g.total += 1;
      if (v.task.status === "done") g.done += 1;
      groups.set(keyOf(v), g);
    }
    const cur = new Map<string, boolean>();
    for (const [k, g] of groups) cur.set(k, g.total > 0 && g.done === g.total);
    const before = prev.current;
    const who = child?.id ?? null;
    prev.current = { child: who, map: cur };
    if (!before || before.child !== who) {
      setShown(null);
      return;
    }
    let fresh: string | null = null;
    for (const [k, complete] of cur) if (complete && before.map.get(k) === false) fresh = k;
    setShown((open) => {
      if (fresh) {
        const [homeId = "", room = ""] = fresh.split("|");
        return { homeId, room };
      }
      // Undo (or a new task) made the room unfinished again: close the page.
      return open && cur.get(`${open.homeId}|${open.room}`) !== true ? null : open;
    });
  }, [views, child]);

  if (!shown || !child) return null;
  return <DonePage shown={shown} views={views} onClose={() => setShown(null)} />;
}

function DonePage({
  shown,
  views,
  onClose,
}: {
  shown: Shown;
  views: TaskView[];
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const child = useActiveChild()!;
  const homes = useStore((s) => s.homes);
  const { ref, onKeyDown } = useModalDialog(onClose);

  const roomName = t(`room.${shown.room}`);
  const total = progress(views);
  // Next room worth doing: same home first, in the order the home lists its rooms, then other homes.
  const open = views.filter((v) => v.task.status !== "done" && v.group !== "soon");
  const order = [
    ...homes.filter((h) => h.id === shown.homeId),
    ...homes.filter((h) => h.id !== shown.homeId),
  ].flatMap((h) => h.rooms.map((r) => ({ homeId: h.id, room: r as string })));
  const next = order.find(
    (o) =>
      !(o.homeId === shown.homeId && o.room === shown.room) &&
      open.some((v) => v.task.home_id === o.homeId && v.task.room === o.room),
  );
  const nextOpen = next
    ? open.filter((v) => v.task.home_id === next.homeId && v.task.room === next.room)
    : [];
  const nextMinutes = nextOpen.reduce((sum, v) => sum + taskTotals(v.hazard).minutes, 0);
  const date = new Date().toLocaleDateString(lang, { month: "short", day: "numeric" });

  return createPortal(
    <div
      ref={ref}
      className="alldone"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alldone-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="alldone-bar">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
      <div className="alldone-body">
        <div className="alldone-art">
          <DoneDoorframe animate decorative />
        </div>
        <p className="lbl">
          {roomName} ·{" "}
          {t("plan.childAge", { name: child.nickname, age: ageText(t, child, new Date()) })} ·{" "}
          {date}
        </p>
        <h2 id="alldone-title" className="d4">
          {t("done.title", { room: roomName })}
        </h2>
        <p className="t2 muted alldone-text">
          {t("done.body")}{" "}
          {next
            ? t("done.next", {
                room: t(`room.${next.room}`),
                n: nextOpen.length,
                min: nextMinutes,
              })
            : t("done.everything")}
        </p>
        <p className="t2b">{t("plan.progress", total)}</p>
      </div>
      <div className="alldone-actions">
        {next ? (
          <>
            <Link
              to={`/room/${next.homeId}/${next.room}`}
              className="btn btn-primary btn-block"
              onClick={onClose}
            >
              {t("done.start", { room: t(`room.${next.room}`) })}
            </Link>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                onClose();
                nav("/");
              }}
            >
              {t("weekend.backToday")}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              onClose();
              nav("/");
            }}
          >
            {t("weekend.backToday")}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
