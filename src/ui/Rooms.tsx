import { Plus } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
import type { Room } from "../kb/schema";
import { useStore } from "../store/store";
import { isChecked, recheckDue } from "../plan/roomCheck";
import { progress } from "../store/selectors";
import { ageText, localHazard, taskTotals } from "./format";
import { RoomIllustration } from "./illustrations";
import { BackLink, TaskRow, useChildViews } from "./parts";
import { ProgressMarks } from "./ProgressMarks";
import { useActiveChild } from "./ui-state";
import { useLang, useT } from "./useT";
import { GearSection } from "../recalls/GearSection";
import { DemoBanner } from "./DemoBanner";
import { HomeMap } from "./HomeMap";

export function Rooms() {
  const t = useT();
  const lang = useLang();
  const homes = useStore((s) => s.homes);
  const child = useActiveChild();
  const views = useChildViews();
  const all = progress(views);
  return (
    <div className="flow">
      <DemoBanner />
      <div>
        <h1 className="d4">{t("rooms.title")}</h1>
        {child && (
          <p className="t2 muted">
            {t("plan.childAge", { name: child.nickname, age: ageText(t, child, new Date()) })}
            {" · "}
            {t("plan.progress", all)}
          </p>
        )}
      </div>
      {homes.map((h) => (
        <section key={h.id} aria-labelledby={`home-${h.id}`}>
          {homes.length > 1 && (
            <h2 id={`home-${h.id}`} className="lbl room-home">
              {h.name}
            </h2>
          )}
          <HomeMap home={h} views={views} />
          <ul className="rows">
            {h.rooms.map((r) => {
              const mine = views.filter((v) => v.task.home_id === h.id && v.task.room === r);
              const p = progress(mine);
              const label = t(`room.${r}`);
              const nextUp = mine.find((v) => v.task.status !== "done");
              const checked = isChecked(h, r);
              const due = recheckDue(h, r, new Date());
              const sub = !checked
                ? t("rooms.notChecked")
                : [
                    p.total === 0 ? t("rooms.checkedEmpty") : t("plan.progress", p),
                    nextUp ? t("rooms.next", { name: localHazard(nextUp.hazard, lang).name }) : "",
                    due ? t("rooms.recheckDue") : "",
                  ]
                    .filter(Boolean)
                    .join(" · ");
              return (
                <li key={r} className="room-li">
                  <Link to={`/room/${h.id}/${r}`} className="row room-row">
                    <span className="row-main">
                      <span className="d3">{label}</span>
                      <span className="row-sub">{sub}</span>
                    </span>
                    {p.total > 0 && (
                      <ProgressMarks decorative done={p.done} total={p.total} label={label} />
                    )}
                  </Link>
                  {!checked && (
                    <Link
                      to={`/scan?home=${h.id}&room=${r}`}
                      className="btn btn-secondary room-check"
                    >
                      {t("rooms.checkThis")}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="card scan-card">
        <div className="scan-card-text">
          <p className="t2b">{t("scan.cta.today")}</p>
          <p className="t1 muted">{t("scan.cta.todaySub")}</p>
        </div>
        <Link to="/scan" className="btn btn-secondary">
          {t("scan.cta.button")}
        </Link>
      </div>
      <GearSection />
      <Link to="/home/new" className="btn btn-secondary btn-block">
        <Plus size={20} weight="bold" aria-hidden="true" />
        {t("plan.addHome")}
      </Link>
    </div>
  );
}

export function RoomPage() {
  const t = useT();
  const { homeId, room } = useParams();
  const home = useStore((s) => s.homes.find((h) => h.id === homeId));
  const views = useChildViews();
  if (!home || !room || !(home.rooms as string[]).includes(room)) {
    return (
      <div className="flow">
        <h1 className="d4">{t("room.notFound")}</h1>
        <Link className="btn btn-primary btn-block" to="/rooms">
          {t("room.backToRooms")}
        </Link>
      </div>
    );
  }
  const checked = isChecked(home, room as Room);
  const due = recheckDue(home, room as Room, new Date());
  const mine = views.filter((v) => v.task.home_id === home.id && v.task.room === room);
  const open = mine.filter((v) => v.task.status !== "done");
  const done = mine.filter((v) => v.task.status === "done");
  const p = progress(mine);
  const label = t(`room.${room}`);
  const minutesLeft = open.reduce((sum, v) => sum + taskTotals(v.hazard).minutes, 0);
  return (
    <div className="flow room-page">
      <BackLink to="/rooms">{t("rooms.title")}</BackLink>
      <div className="room-head">
        <div className="room-head-text">
          <h1 className="d4">{label}</h1>
          <p className="t2">{t("plan.progress", p)}</p>
          {minutesLeft > 0 && (
            <p className="t1 muted">{t("room.minutesLeft", { n: minutesLeft })}</p>
          )}
          <p className="t1 muted">{home.name}</p>
        </div>
        <div className="room-head-art">
          <RoomIllustration room={room} decorative />
        </div>
      </div>
      <Link
        to={`/scan?home=${home.id}&room=${room}`}
        className={`btn btn-block ${checked ? "btn-secondary" : "btn-primary"}`}
      >
        {t(checked ? "rooms.whatsIn" : "rooms.checkThis")}
      </Link>
      {due && <p className="t1 muted">{t("rooms.recheckDue")}</p>}
      {!checked && (
        <>
          <p className="muted">{t("rooms.uncheckedBody")}</p>
          <button
            type="button"
            className="btn btn-quiet btn-block"
            onClick={() => useStore.getState().markRoomChecked(home.id, room as Room)}
          >
            {t("rooms.nothingNeeds")}
          </button>
        </>
      )}
      {checked && mine.length === 0 && <p className="muted">{t("rooms.checkedEmpty")}</p>}
      {open.length > 0 && (
        <section aria-labelledby="open">
          <h2 id="open" className="lbl">
            {t("room.checklist")}
          </h2>
          <ul className="rows">
            {open.map((v) => (
              <TaskRow key={v.task.id} view={v} showRoom={false} />
            ))}
          </ul>
        </section>
      )}
      {done.length > 0 && (
        <section aria-labelledby="dn">
          <h2 id="dn" className="lbl">
            {t("group.done")}
          </h2>
          <ul className="rows">
            {done.map((v) => (
              <TaskRow key={v.task.id} view={v} showRoom={false} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
