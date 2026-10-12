import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../store/store";
import type { Task } from "../kb/schema";
import { costText, iconFor, localHazard, reasonText } from "./format";
import { Severity, useViews } from "./parts";
import { useLang, useT } from "./useT";

const STATUSES: Task["status"][] = ["todo", "doing", "done"];

export function TaskPage() {
  const t = useT();
  const lang = useLang();
  const { id } = useParams();
  const views = useViews();
  const homes = useStore((s) => s.homes);
  const children = useStore((s) => s.children);
  const owners = useStore((s) => s.owners);
  const setStatus = useStore((s) => s.setStatus);
  const setOwner = useStore((s) => s.setOwner);
  const setDue = useStore((s) => s.setDue);
  const [newOwner, setNewOwner] = useState("");

  const view = views.find((v) => v.task.id === id);
  if (!view) {
    return (
      <div className="stack">
        <h1>{t("task.notFound")}</h1>
        <Link className="btn primary" to="/plan">
          {t("common.goHome")}
        </Link>
      </div>
    );
  }
  const { task, hazard, ranked, severity } = view;
  const local = localHazard(hazard, lang);
  const home = homes.find((h) => h.id === task.home_id);
  const names = task.childIds
    .map((cid) => children.find((c) => c.id === cid)?.nickname)
    .filter(Boolean)
    .join(", ");
  const steps = [...hazard.fix_steps].sort((a, b) => a.order - b.order);
  const totalMin = steps.reduce((n, s) => n + s.cost_usd_min, 0);
  const totalMax = steps.reduce((n, s) => n + s.cost_usd_max, 0);
  const totalMinutes = steps.reduce((n, s) => n + s.minutes, 0);

  function addOwner(e: FormEvent) {
    e.preventDefault();
    if (!newOwner.trim()) return;
    setOwner(task.id, newOwner);
    setNewOwner("");
  }

  return (
    <article className="stack">
      <Link to="/plan" className="back">
        ← {t("common.back")}
      </Link>
      <header className="stack-s">
        <p className="eyebrow">
          {t("task.where", { room: t(`room.${task.room}`), home: home?.name ?? "" })}
        </p>
        <h1>
          <span aria-hidden="true">{iconFor(hazard.icon)} </span>
          {local.name}
        </h1>
        <div className="meta-line">
          <Severity score={severity} />
          {names && <span className="muted">{t("task.protects", { names })}</span>}
        </div>
      </header>

      <section className="card stack-s" aria-labelledby="st">
        <h2 id="st">{t("task.status")}</h2>
        <div role="group" aria-label={t("task.status")} className="seg">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={task.status === s}
              onClick={() => setStatus(task.id, s)}
            >
              {t(`task.status.${s}`)}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="owner">{t("task.whoDoes")}</label>
          <select
            id="owner"
            value={task.owner ?? ""}
            onChange={(e) => setOwner(task.id, e.target.value || undefined)}
          >
            <option value="">{t("task.nobody")}</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <form className="inline-form" onSubmit={addOwner}>
          <div className="field grow">
            <label htmlFor="newowner">{t("task.newOwner")}</label>
            <input
              id="newowner"
              value={newOwner}
              maxLength={30}
              autoComplete="off"
              onChange={(e) => setNewOwner(e.target.value)}
            />
          </div>
          <button type="submit" className="btn">
            {t("common.add")}
          </button>
        </form>
        <div className="inline-form">
          <div className="field grow">
            <label htmlFor="due">{t("task.dueDate")}</label>
            <input
              id="due"
              type="date"
              value={task.due ?? ""}
              onChange={(e) => setDue(task.id, e.target.value || undefined)}
            />
          </div>
          {task.due && (
            <button type="button" className="btn ghost" onClick={() => setDue(task.id, undefined)}>
              {t("task.clearDue")}
            </button>
          )}
        </div>
      </section>

      <section className="stack-s" aria-labelledby="why">
        <h2 id="why">{t("task.why")}</h2>
        <p>{local.why}</p>
      </section>

      <section className="stack-s" aria-labelledby="todo">
        <h2 id="todo">{t("task.steps")}</h2>
        <p className="muted">
          {t("task.totalLine", {
            cost: costText(t, totalMin, totalMax),
            time: t("task.minutes", { n: totalMinutes }),
          })}
        </p>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.order}>
              <p>{local.steps[i]}</p>
              <p className="muted small">
                {costText(t, s.cost_usd_min, s.cost_usd_max)} ·{" "}
                {t("task.minutes", { n: s.minutes })}
                {s.tools.length > 0 && ` · ${s.tools.join(", ")}`}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {ranked && (
        <section className="card stack-s" aria-labelledby="rank">
          <h2 id="rank">{t("ranks.title")}</h2>
          <ul className="reasons">
            {ranked.reasons.map((r) => (
              <li key={r.kind}>{reasonText(t, r)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="stack-s" aria-labelledby="chk">
        <h2 id="chk">{t("task.check")}</h2>
        <p>{hazard.verify_rule}</p>
        {hazard.reminder && (
          <p className="muted">
            {t("task.reminder", { days: hazard.reminder.every_days })}: {hazard.reminder.text}
          </p>
        )}
        {hazard.blind_spots.length > 0 && (
          <>
            <h3>{t("task.blind")}</h3>
            <ul className="plain">
              {hazard.blind_spots.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="stack-s" aria-labelledby="src">
        <h2 id="src">{t("task.sources")}</h2>
        <ul className="plain sources">
          {hazard.citations.map((c) => (
            <li key={c.url}>
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {c.title}
                <span className="sr-only"> ({t("task.opensNew")})</span>
              </a>
              <span className="muted small block">{c.publisher}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
