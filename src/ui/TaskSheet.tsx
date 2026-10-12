// Task detail: bottom sheet on phones, side panel on wide screens.
import { useState, type FormEvent } from "react";
import { CaretDown, CaretRight, Clock, Coins } from "@phosphor-icons/react";
import { useStore } from "../store/store";
import { costText, localHazard, reasonText, taskTotals } from "./format";
import { useEasy } from "./easy";
import { RoomIcon } from "./icons";
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
        <h3 className="t-strong">{title}</h3>
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
  const [assigning, setAssigning] = useState(false);
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
  const done = task.status === "done";
  const assignText = [task.owner, task.due ? t("task.due", { date: task.due }) : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Sheet
        title={local.name}
        onClose={close}
        footer={
          done ? (
            <button
              type="button"
              className="btn btn-block"
              onClick={() => setStatus(task.id, "todo")}
            >
              {t("task.markNotDone")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setDone(task.id, true);
                close();
              }}
            >
              {t("task.markDone")}
            </button>
          )
        }
      >
        <div className="flow-s">
          <span className="meta-item muted">
            <RoomIcon room={task.room} size={22} />
            {t("task.where", { room: t(`room.${task.room}`), home: home?.name ?? "" })}
          </span>
          <div className="chips-line">
            <span className="fact">
              <Clock size={20} weight="duotone" aria-hidden="true" />
              {t("task.minutes", { n: totals.minutes })}
            </span>
            <span className="fact">
              <Coins size={20} weight="duotone" aria-hidden="true" />
              {costText(t, totals.min, totals.max)}
            </span>
            <Severity score={severity} />
          </div>
        </div>

        <ReadAloudButton task={task} />

        <ol className="steps" aria-label={t("task.steps")}>
          {steps.map((s, i) => (
            <li key={s.order} className="step">
              <p>{local.steps[i]}</p>
              {s.tools.length > 0 && (
                <p className="step-note">{t("task.needs", { tools: s.tools.join(", ") })}</p>
              )}
            </li>
          ))}
        </ol>

        <div>
          <button type="button" className="link-row" onClick={() => setAssigning(true)}>
            <span>
              {t("task.assign")}
              <span className="row-sub block">{assignText || t("task.notAssigned")}</span>
            </span>
            <CaretRight size={20} weight="bold" aria-hidden="true" />
          </button>
          <Disclosure title={t("task.why")}>
            <p>{local.why}</p>
            {ranked && (
              <ul className="bullets">
                {ranked.reasons.map((r) => (
                  <li key={r.kind}>{reasonText(t, r)}</li>
                ))}
              </ul>
            )}
          </Disclosure>
          <Disclosure title={t("task.check")}>
            <p>{hazard.verify_rule}</p>
            {hazard.reminder && (
              <p className="muted">
                {t("task.reminder", { days: hazard.reminder.every_days })} {hazard.reminder.text}
              </p>
            )}
            {hazard.blind_spots.length > 0 && (
              <>
                <p className="t-strong">{t("task.blind")}</p>
                <ul className="bullets">
                  {hazard.blind_spots.map((b) => (
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
    </>
  );
}
