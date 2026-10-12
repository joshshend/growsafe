import { Link, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import { progress } from "../store/selectors";
import { Progress, TaskRow, useViews } from "./parts";
import { useT } from "./useT";

export function RoomPage() {
  const t = useT();
  const { homeId, room } = useParams();
  const home = useStore((s) => s.homes.find((h) => h.id === homeId));
  const views = useViews();
  if (!home || !room || !(home.rooms as string[]).includes(room)) {
    return (
      <div className="stack">
        <h1>{t("room.notFound")}</h1>
        <Link className="btn primary" to="/plan">
          {t("common.goHome")}
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
    <div className="stack">
      <Link to="/plan" className="back">
        ← {t("common.back")}
      </Link>
      <header className="stack-s">
        <p className="eyebrow">{home.name}</p>
        <h1>{label}</h1>
      </header>
      <div className="card">
        <Progress done={p.done} total={p.total} label={t("room.progressLabel", { room: label })} />
      </div>
      {mine.length === 0 && <p className="muted">{t("room.empty")}</p>}
      {open.length > 0 && (
        <section className="stack-s" aria-labelledby="open">
          <h2 id="open">{t("room.checklist")}</h2>
          <ul className="tasks">
            {open.map((v) => (
              <TaskRow key={v.task.id} view={v} />
            ))}
          </ul>
        </section>
      )}
      {done.length > 0 && (
        <section className="stack-s" aria-labelledby="dn">
          <h2 id="dn">{t("group.done")}</h2>
          <ul className="tasks">
            {done.map((v) => (
              <TaskRow key={v.task.id} view={v} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
