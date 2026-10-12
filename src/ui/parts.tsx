// Shared UI pieces: ranked views for the active child, progress ring, severity, check button and task row.
import { useMemo } from "react";
import { Check, Info, Warning, WarningDiamond, WarningOctagon } from "@phosphor-icons/react";
import { loadKb } from "../kb";
import { useStore } from "../store/store";
import { buildViews, type TaskView } from "../store/selectors";
import { costText, localHazard, taskTotals } from "./format";
import { HazardIcon } from "./icons";
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
    if (done) showToast({ message: t("toast.done"), undo: () => setStatus(taskId, "todo") });
    else showToast(null);
  };
}

export function Ring({
  done,
  total,
  size = 56,
  stroke = 6,
  label,
  showCount = false,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  label?: string;
  showCount?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = total === 0 ? 0 : done / total;
  const props = label
    ? {
        role: "progressbar" as const,
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": total,
        "aria-valuenow": done,
      }
    : { "aria-hidden": true as const };
  return (
    <div className="ring" style={{ width: size, height: size }} {...props}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      {showCount && <span className="ring-label">{`${done}/${total}`}</span>}
    </div>
  );
}

// Severity is always an icon plus a word, never colour alone.
export function Severity({ score }: { score: number }) {
  const t = useT();
  const s = Math.min(5, Math.max(1, Math.round(score)));
  const word = t(`sev.${s}`);
  const Icon = s >= 5 ? WarningOctagon : s === 4 ? WarningDiamond : s === 3 ? Warning : Info;
  return (
    <span className="hero-sev" aria-label={t("sev.label", { word })}>
      <Icon size={20} weight="duotone" aria-hidden="true" />
      <span aria-hidden="true">{word}</span>
    </span>
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
        <Check className="check-tick" size={18} weight="bold" />
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
  const sub: string[] = [];
  if (showRoom) sub.push(t(`room.${task.room}`));
  if (task.status === "doing") sub.push(t("task.status.doing"));
  return (
    <li className={`row${done ? " is-done" : ""}`}>
      <CheckButton
        done={done}
        label={t(done ? "task.unmarkLabel" : "task.markLabel", { name })}
        onToggle={() => setDone(task.id, !done)}
      />
      <button type="button" className="row-link" onClick={() => openTask(task.id)}>
        <span className="row-icon">
          <HazardIcon name={hazard.icon} size={28} />
        </span>
        <span className="row-body">
          <span className="row-title">{name}</span>
          {sub.length > 0 && <span className="row-sub">{sub.join(", ")}</span>}
        </span>
        <span className="row-end">{costText(t, totals.min, totals.max)}</span>
      </button>
    </li>
  );
}
