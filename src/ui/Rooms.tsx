import { CaretLeft, Plus } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { progress } from "../store/selectors";
import { RoomIcon } from "./icons";
import { Ring, TaskRow, useChildViews } from "./parts";
import { useT } from "./useT";
import { GearSection } from "../recalls/GearSection";

export function Rooms() {
  const t = useT();
  const homes = useStore((s) => s.homes);
  const views = useChildViews();
  return (
    <div className="flow">
      <h1 className="t-title">{t("rooms.title")}</h1>
      {homes.map((h) => (
        <section key={h.id} className="flow-s" aria-labelledby={`home-${h.id}`}>
          {homes.length > 1 && (
            <h2 id={`home-${h.id}`} className="t-section">
              {h.name}
            </h2>
          )}
          <ul className="tiles">
            {h.rooms.map((r) => {
              const p = progress(views.filter((v) => v.task.home_id === h.id && v.task.room === r));
              return (
                <li key={r} className="tiles-item">
                  <Link to={`/room/${h.id}/${r}`} className="tile">
                    <span className="tile-icon">
                      <RoomIcon room={r} size={36} />
                    </span>
                    <span className="tile-ring">
                      <Ring done={p.done} total={p.total} size={28} stroke={4} />
                    </span>
                    <span>
                      <span className="tile-name block">{t(`room.${r}`)}</span>
                      <span className="tile-count">{t("plan.progress", p)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <GearSection />
      <Link to="/home/new" className="btn btn-block">
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
        <h1 className="t-title">{t("room.notFound")}</h1>
        <Link className="btn btn-primary btn-block" to="/rooms">
          {t("room.backToRooms")}
        </Link>
      </div>
    );
  }
  const mine = views.filter((v) => v.task.home_id === home.id && v.task.room === room);
  const open = mine.filter((v) => v.task.status !== "done");
  const done = mine.filter((v) => v.task.status === "done");
  const p = progress(mine);
  const label = t(`room.${room}`);
  return (
    <div className="flow">
      <Link to="/rooms" className="back">
        <CaretLeft size={20} weight="bold" aria-hidden="true" />
        {t("rooms.title")}
      </Link>
      <div className="today-head">
        <div className="flow-s">
          <h1 className="t-title">{label}</h1>
          <p className="muted">{home.name}</p>
        </div>
        <Ring
          done={p.done}
          total={p.total}
          size={64}
          label={t("room.progressLabel", { room: label })}
          showCount
        />
      </div>
      <Link to={`/scan?home=${home.id}&room=${room}`} className="btn btn-block">
        {t("scan.cta")}
      </Link>
      {mine.length === 0 && <p className="muted">{t("room.empty")}</p>}
      {open.length > 0 && (
        <section aria-labelledby="open">
          <h2 id="open" className="t-section section-head">
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
          <h2 id="dn" className="t-section section-head">
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
