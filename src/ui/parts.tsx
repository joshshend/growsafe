// Small shared UI pieces.
import { Link } from "react-router-dom";
import { loadKb } from "../kb";
import { useMemo } from "react";
import { useStore } from "../store/store";
import { buildViews, type TaskView } from "../store/selectors";
import { iconFor, localHazard } from "./format";
import { useLang, useT } from "./useT";

// All ranked task views for the current family.
export function useViews(): TaskView[] {
  const children = useStore((s) => s.children);
  const tasks = useStore((s) => s.tasks);
  return useMemo(() => buildViews({ children, tasks }, loadKb(), new Date()), [children, tasks]);
}

export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const t = useT();
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="progress">
      <div
        className="bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={t("plan.progress", { done, total })}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="progress-text">{t("plan.progress", { done, total })}</p>
    </div>
  );
}

// Severity shown as dots plus a word, so meaning never depends on color.
export function Severity({ score }: { score: number }) {
  const t = useT();
  const s = Math.min(5, Math.max(1, Math.round(score)));
  const word = t(`sev.${s}`);
  return (
    <span className="sev" aria-label={t("sev.label", { word })}>
      <span aria-hidden="true" className="dots">
        {"●".repeat(s)}
        {"○".repeat(5 - s)}
      </span>
      <span aria-hidden="true">{word}</span>
    </span>
  );
}

export function TaskRow({ view, showWhere }: { view: TaskView; showWhere?: boolean }) {
  const t = useT();
  const lang = useLang();
  const setStatus = useStore((s) => s.setStatus);
  const homes = useStore((s) => s.homes);
  const { task, hazard, severity } = view;
  const name = localHazard(hazard, lang).name;
  const done = task.status === "done";
  const home = homes.find((h) => h.id === task.home_id);
  const meta: string[] = [];
  if (showWhere)
    meta.push(t("task.where", { room: t(`room.${task.room}`), home: home?.name ?? "" }));
  if (task.status === "doing") meta.push(t("task.status.doing"));
  if (task.owner) meta.push(t("task.owner", { name: task.owner }));
  if (task.due) meta.push(t("task.due", { date: task.due }));
  return (
    <li className={`task${done ? " is-done" : ""}`}>
      <button
        type="button"
        className="toggle"
        aria-pressed={done}
        aria-label={t("task.doneToggle", { name })}
        onClick={() => setStatus(task.id, done ? "todo" : "done")}
      >
        <span aria-hidden="true">{done ? "✓" : ""}</span>
      </button>
      <Link to={`/task/${task.id}`} className="task-main">
        <span className="task-title">
          <span aria-hidden="true" className="task-icon">
            {iconFor(hazard.icon)}
          </span>
          {name}
        </span>
        {meta.length > 0 && <span className="task-meta">{meta.join(" · ")}</span>}
        <Severity score={severity} />
      </Link>
    </li>
  );
}
