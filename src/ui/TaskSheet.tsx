// Task detail: bottom sheet on phones, side panel on wide screens.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CaretDown } from "@phosphor-icons/react";
import { remindMe, reminderDate, type ReminderChoice } from "../native/reminder";
import { useStore } from "../store/store";
import { costText, localHazard, reasonText, taskTotals } from "./format";
import { useEasy } from "./easy";
import { ReadAloudButton } from "./ReadAloudButton";
import { Severity, useChildViews, useSetDone } from "./parts";
import { Sheet } from "./Sheet";
import { useUi } from "./ui-state";
import { useLang, useT } from "./useT";

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const easy = useEasy();
  if (easy)
    return (
      <section className="disc-body">
        <h3 className="lbl">{title}</h3>
        {children}
      </section>
    );
  return (
    <details className="disc">
      <summary className="disc-sum">
        <span>{title}</span>
        <CaretDown className="disc-caret" size={20} weight="bold" aria-hidden="true" />
      </summary>
      <div className="disc-body">{children}</div>
    </details>
  );
}

function RemindSheet({
  taskId,
  title,
  onClose,
}: {
  taskId: string;
  title: string;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const showToast = useUi((s) => s.showToast);
  const [custom, setCustom] = useState("");
  async function pick(choice: ReminderChoice) {
    const date = reminderDate(choice, new Date(), custom);
    if (!date) {
      showToast({ message: t("remind.pickDate") });
      return;
    }
    const text = t("remind.notification", { name: title });
    const r = await remindMe({ taskId, title: text, description: text, date });
    if (r === "scheduled") {
      const when = date.toLocaleDateString(lang, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      showToast({ message: t("remind.scheduled", { when }) });
    } else if (r === "denied") showToast({ message: t("remind.denied") });
    else showToast({ message: t("remind.ics") });
    onClose();
  }
  return (
    <Sheet title={t("remind.title")} onClose={onClose}>
      <button type="button" className="btn btn-block" onClick={() => void pick("tomorrow")}>
        {t("remind.tomorrow")}
      </button>
      <button type="button" className="btn btn-block" onClick={() => void pick("weekend")}>
        {t("remind.weekend")}
      </button>
      <div className="field">
        <label className="field-label" htmlFor="remind-date">
          {t("remind.date")}
        </label>
        <div className="form-row">
          <input
            id="remind-date"
            type="date"
            className="input"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button type="button" className="btn" onClick={() => void pick("custom")}>
            {t("remind.set")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function AssignSheet({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const t = useT();
  const task = useStore((s) => s.tasks.find((x) => x.id === taskId));
  const owners = useStore((s) => s.owners);
  const setOwner = useStore((s) => s.setOwner);
  const setDue = useStore((s) => s.setDue);
  const [newOwner, setNewOwner] = useState("");
  if (!task) return null;
  function addOwner(e: FormEvent) {
    e.preventDefault();
    if (!newOwner.trim()) return;
    setOwner(taskId, newOwner);
    setNewOwner("");
  }
  return (
    <Sheet title={t("assign.title")} onClose={onClose}>
      <div className="field">
        <label className="field-label" htmlFor="owner">
          {t("task.whoDoes")}
        </label>
        <select
          id="owner"
          className="input"
          value={task.owner ?? ""}
          onChange={(e) => setOwner(taskId, e.target.value || undefined)}
        >
          <option value="">{t("task.nobody")}</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      <form className="field" onSubmit={addOwner}>
        <label className="field-label" htmlFor="newowner">
          {t("task.newOwner")}
        </label>
        <div className="form-row">
          <input
            id="newowner"
            className="input"
            value={newOwner}
            maxLength={30}
            autoComplete="off"
            onChange={(e) => setNewOwner(e.target.value)}
          />
          <button type="submit" className="btn">
            {t("assign.addPerson")}
          </button>
        </div>
      </form>
      <div className="field">
        <label className="field-label" htmlFor="due">
          {t("task.dueDate")}
        </label>
        <input
          id="due"
          type="date"
          className="input"
          value={task.due ?? ""}
          onChange={(e) => setDue(taskId, e.target.value || undefined)}
        />
        {task.due && (
          <button type="button" className="btn btn-text" onClick={() => setDue(taskId, undefined)}>
            {t("task.clearDue")}
          </button>
        )}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
        {t("common.done")}
      </button>
    </Sheet>
  );
}

export function TaskSheet() {
  const t = useT();
  const lang = useLang();
  const id = useUi((s) => s.openTaskId);
  const openTask = useUi((s) => s.openTask);
  const views = useChildViews();
  const homes = useStore((s) => s.homes);
  const setDone = useSetDone();
  const setStatus = useStore((s) => s.setStatus);
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState(false);
  const [reminding, setReminding] = useState(false);
  const close = () => openTask(null);
  const view = views.find((v) => v.task.id === id);

  if (!view) {
    return (
      <Sheet title={t("task.notFound")} onClose={close}>
        <button type="button" className="btn btn-block" onClick={close}>
          {t("common.close")}
        </button>
      </Sheet>
    );
  }
  const { task, hazard, ranked, severity } = view;
  const local = localHazard(hazard, lang);
  const home = homes.find((h) => h.id === task.home_id);
  const steps = [...hazard.fix_steps].sort((a, b) => a.order - b.order);
  const totals = taskTotals(hazard);
  const tools = Array.from(new Set(steps.flatMap((s) => s.tools)));
  const done = task.status === "done";
  const assignText = [task.owner, task.due ? t("task.due", { date: task.due }) : ""]
    .filter(Boolean)
    .join(", ");
  // "Living room · 10 min · $10 to $25" (the home's name only when there is more than one home).
  const where =
    homes.length > 1
      ? t("task.where", { room: t(`room.${task.room}`), home: home?.name ?? "" })
      : t(`room.${task.room}`);
  const eyebrow = [
    where,
    t("task.minutes", { n: totals.minutes }),
    costText(t, totals.min, totals.max),
  ].join(" · ");

  return (
    <>
      <Sheet
        title={local.name}
        eyebrow={eyebrow}
        onClose={close}
        footer={
          <div className="sheet-actions">
            {done ? (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setStatus(task.id, "todo")}
              >
                {t("task.markNotDone")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setDone(task.id, true);
                    close();
                  }}
                >
                  <svg className="btn-tick" viewBox="0 0 22 22" aria-hidden="true">
                    <path d="M4 11.5l5 5L18.5 5" />
                  </svg>
                  {t("task.markDone")}
                </button>
                <button type="button" className="btn btn-quiet" onClick={close}>
                  {t("task.notTonight")}
                </button>
              </>
            )}
          </div>
        }
      >
        <Severity score={severity} />

        <section className="sheet-sec">
          <h3 className="lbl">{t("task.why")}</h3>
          <p className="t2">{local.why}</p>
          {ranked && (
            <Disclosure title={t("task.rank")}>
              <ul className="bullets">
                {ranked.reasons.map((r) => (
                  <li key={r.kind}>
                    {reasonText(
                      t,
                      r,
                      r.kind === "severity" ? local.rationale(String(r.params.stage)) : undefined,
                    )}
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </section>

        {tools.length > 0 && (
          <section className="sheet-sec">
            <h3 className="lbl">{t("task.need")}</h3>
            <p className="t2">{tools.join(", ")}</p>
          </section>
        )}

        <section className="sheet-sec">
          <h3 className="lbl">{t("task.steps")}</h3>
          <ReadAloudButton task={task} />
          <ol className="steps" aria-label={t("task.steps")}>
            {steps.map((s, i) => (
              <li key={s.order} className="step">
                <p className="t2">{local.steps[i]}</p>
                {s.tools.length > 0 && (
                  <p className="step-note">{t("task.needs", { tools: s.tools.join(", ") })}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <div>
          <button type="button" className="link-row" onClick={() => setAssigning(true)}>
            <span>
              {t("task.assign")}
              <span className="row-sub block">{assignText || t("task.notAssigned")}</span>
            </span>
          </button>
          <button type="button" className="link-row" onClick={() => setReminding(true)}>
            <span>
              {t("remind.row")}
              <span className="row-sub block">{t("remind.rowSub")}</span>
            </span>
          </button>
          {hazard.detection_cues.length > 0 && home && (
            <button
              type="button"
              className="link-row"
              onClick={() => {
                close();
                navigate(`/scan?home=${task.home_id}&room=${task.room}&task=${task.id}`);
              }}
            >
              <span>
                {t("scan.recheck.row")}
                <span className="row-sub block">{t("scan.recheck.rowSub")}</span>
              </span>
            </button>
          )}
          <Disclosure title={t("task.check")}>
            <p>{local.verify}</p>
            {local.reminder && (
              <p className="muted">
                {t("task.reminder", { days: hazard.reminder?.every_days ?? 0 })} {local.reminder}
              </p>
            )}
            {local.blindSpots.length > 0 && (
              <>
                <p className="t-strong">{t("task.blind")}</p>
                <ul className="bullets">
                  {local.blindSpots.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </>
            )}
          </Disclosure>
          <Disclosure title={t("task.sources")}>
            <ul className="bullets">
              {hazard.citations.map((c) => (
                <li key={c.url}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer">
                    {c.title}
                    <span className="sr-only"> ({t("task.opensNew")})</span>
                  </a>
                  <span className="fine block">{c.publisher}</span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>

        <p className="fine">{t("task.notGuarantee")}</p>
      </Sheet>
      {assigning && <AssignSheet taskId={task.id} onClose={() => setAssigning(false)} />}
      {reminding && (
        <RemindSheet taskId={task.id} title={local.name} onClose={() => setReminding(false)} />
      )}
    </>
  );
}
