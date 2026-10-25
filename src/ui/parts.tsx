// Shared UI pieces: ranked views for the active child, severity, check button and task row.
import { lightTap } from "../native/haptics";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { loadKb } from "../kb";
import { useStore } from "../store/store";
import { buildViews, type TaskView } from "../store/selectors";
import { costText, durationText, localHazard, taskTotals } from "./format";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";

// Ranked task views for the child on screen (ranking uses only that child's age).
export function useChildViews(): TaskView[] {
  const child = useActiveChild();
  const tasks = useStore((s) => s.tasks);
  return useMemo(() => {
    if (!child) return [];
    const mine = tasks.filter((t) => t.childIds.length === 0 || t.childIds.includes(child.id));
    return buildViews({ children: [child], tasks: mine }, loadKb(), new Date());
  }, [child, tasks]);
}

// Marks a task done (with an undo toast) or puts it back.
export function useSetDone() {
  const t = useT();
  const setStatus = useStore((s) => s.setStatus);
  const showToast = useUi((s) => s.showToast);
  return (taskId: string, done: boolean) => {
    setStatus(taskId, done ? "done" : "todo");
    if (done) void lightTap();
    if (done) showToast({ message: t("toast.done"), undo: () => setStatus(taskId, "todo") });
    else showToast(null);
  };
}

// Severity is always a word, never colour or an icon alone. Quiet text; the full phrase is the accessible name.
export function Severity({ score }: { score: number }) {
  const t = useT();
  const s = Math.min(5, Math.max(1, Math.round(score)));
  const word = t(`sev.${s}`);
  return (
    <span className="sev" aria-label={t("sev.label", { word })}>
      <span aria-hidden="true">{t("sev.label", { word })}</span>
    </span>
  );
}

// "< Rooms": the plain back link at the top of a detail page.
export function BackLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="back">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
        <path d="M14 5l-7 7 7 7" />
      </svg>
      {children}
    </Link>
  );
}

// The drawn tick used by every check box (path from docs/design/gs.css .tk).
export function Tick({ className = "check-tick" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <path d="M4 11.5l5 5L18.5 5" />
    </svg>
  );
}

export function CheckButton({
  done,
  label,
  onToggle,
}: {
  done: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="check"
      aria-pressed={done}
      aria-label={label}
      onClick={onToggle}
    >
      <span className="check-mark" aria-hidden="true">
        <Tick />
      </span>
    </button>
  );
}

export function TaskRow({ view, showRoom = true }: { view: TaskView; showRoom?: boolean }) {
  const t = useT();
  const lang = useLang();
  const setDone = useSetDone();
  const openTask = useUi((s) => s.openTask);
  const { task, hazard } = view;
  const name = localHazard(hazard, lang).name;
  const done = task.status === "done";
  const totals = taskTotals(hazard);
  // Finished rows are just the name. Open rows: "Nursery · 15 min" (or "15 min · $8 to $20" inside a room).
  const sub: string[] = [];
  if (!done) {
    if (showRoom) sub.push(t(`room.${task.room}`));
    if (task.status === "doing") sub.push(t("task.status.doing"));
    sub.push(durationText(t, totals.minutes));
    if (!showRoom) sub.push(costText(t, totals.min, totals.max));
  }
  return (
    <li className={`row${done ? " is-done" : ""}`}>
      <CheckButton
        done={done}
        label={t(done ? "task.unmarkLabel" : "task.markLabel", { name })}
        onToggle={() => setDone(task.id, !done)}
      />
      <button type="button" className="row-link" onClick={() => openTask(task.id)}>
        <span className="row-body">
          <span className="row-title">{name}</span>
          {sub.length > 0 && <span className="row-sub">{sub.join(" · ")}</span>}
        </span>
      </button>
    </li>
  );
}
