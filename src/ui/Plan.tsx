import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useStore } from "../store/store";
import { progress, type Group } from "../store/selectors";
import { ageText } from "./format";
import { Progress, TaskRow, useViews } from "./parts";
import { useT } from "./useT";

const ORDER: Group[] = ["first", "month", "soon"];

export function Plan() {
  const t = useT();
  const children = useStore((s) => s.children);
  const homes = useStore((s) => s.homes);
  const removeChild = useStore((s) => s.removeChild);
  const removeHome = useStore((s) => s.removeHome);
  const views = useViews();
  const [homeId, setHomeId] = useState<string>("all");
  const [room, setRoom] = useState<string>("all");

  if (children.length === 0 || homes.length === 0) return <Navigate to="/" replace />;

  const inHome = views.filter((v) => homeId === "all" || v.task.home_id === homeId);
  const roomsHere = Array.from(new Set(inHome.map((v) => v.task.room)));
  const activeRoom = (roomsHere as string[]).includes(room) ? room : "all";
  const shown = inHome.filter((v) => activeRoom === "all" || v.task.room === activeRoom);
  const multiHome = homes.length > 1;
  const now = new Date();
  const total = progress(inHome);
  const doneViews = shown.filter((v) => v.group === "done");
  const openRoomHome = homeId !== "all" ? homeId : homes.length === 1 ? homes[0]!.id : null;

  function pickHome(id: string) {
    setHomeId(id);
    setRoom("all");
  }
  function confirmRemove(name: string, fn: () => void) {
    if (window.confirm(t("plan.confirmRemove", { name }))) fn();
  }

  return (
    <div className="stack">
      <h1>{t("plan.title")}</h1>
      <div className="card">
        <Progress done={total.done} total={total.total} label={t("plan.progressLabel")} />
      </div>

      {multiHome && (
        <div role="group" aria-label={t("plan.filterHome")} className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={homeId === "all"}
            onClick={() => pickHome("all")}
          >
            {t("plan.all")}
          </button>
          {homes.map((h) => (
            <button
              key={h.id}
              type="button"
              className="chip"
              aria-pressed={homeId === h.id}
              onClick={() => pickHome(h.id)}
            >
              {h.name}
            </button>
          ))}
        </div>
      )}

      <div role="group" aria-label={t("plan.filterRoom")} className="chips">
        <button
          type="button"
          className="chip"
          aria-pressed={activeRoom === "all"}
          onClick={() => setRoom("all")}
        >
          {t("plan.allRooms")}
        </button>
        {roomsHere.map((r) => {
          const p = progress(inHome.filter((v) => v.task.room === r));
          return (
            <button
              key={r}
              type="button"
              className="chip"
              aria-pressed={activeRoom === r}
              onClick={() => setRoom(r)}
            >
              {t(`room.${r}`)} <span className="chip-count">{`${p.done}/${p.total}`}</span>
            </button>
          );
        })}
      </div>

      {activeRoom !== "all" && openRoomHome && (
        <Link className="btn" to={`/room/${openRoomHome}/${activeRoom}`}>
          {t("plan.openRoom", { room: t(`room.${activeRoom}`) })}
        </Link>
      )}

      {shown.length === 0 && <p className="muted">{t("plan.empty")}</p>}

      {ORDER.map((g) => {
        const items = shown.filter((v) => v.group === g);
        if (items.length === 0) return null;
        return (
          <section key={g} className="stack-s" aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`}>
              {t(`group.${g}`)} <span className="count">{items.length}</span>
            </h2>
            <p className="muted">{t(`group.${g}Hint`)}</p>
            <ul className="tasks">
              {items.map((v) => (
                <TaskRow key={v.task.id} view={v} showWhere={multiHome || activeRoom === "all"} />
              ))}
            </ul>
          </section>
        );
      })}

      {doneViews.length > 0 && (
        <details className="done-group">
          <summary>
            {t("group.done")} <span className="count">{doneViews.length}</span>
          </summary>
          <ul className="tasks">
            {doneViews.map((v) => (
              <TaskRow key={v.task.id} view={v} showWhere={multiHome || activeRoom === "all"} />
            ))}
          </ul>
        </details>
      )}

      <section className="card stack-s" aria-labelledby="family">
        <h2 id="family">{t("plan.family")}</h2>
        <ul className="family">
          {children.map((c) => (
            <li key={c.id}>
              <span>{t("plan.childAge", { name: c.nickname, age: ageText(t, c, now) })}</span>
              <button
                type="button"
                className="btn ghost small"
                aria-label={t("plan.removeChild", { name: c.nickname })}
                onClick={() => confirmRemove(c.nickname, () => removeChild(c.id))}
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
          {homes.map((h) => (
            <li key={h.id}>
              <span>
                {h.name}, {t("plan.roomsCount", { n: h.rooms.length })}
              </span>
              <button
                type="button"
                className="btn ghost small"
                aria-label={t("plan.removeHome", { name: h.name })}
                onClick={() => confirmRemove(h.name, () => removeHome(h.id))}
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
        <div className="row2">
          <Link to="/child/new" className="btn">
            {t("plan.addChild")}
          </Link>
          <Link to="/home/new" className="btn">
            {t("plan.addHome")}
          </Link>
        </div>
      </section>
    </div>
  );
}
