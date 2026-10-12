// Growth preview (T21): drag a slider to see which risks switch on as the child gets older.
import { useMemo, useState } from "react";
import { CaretRight, Minus, Plus } from "@phosphor-icons/react";
import { Link, Navigate } from "react-router-dom";
import "./ahead.css";
import { loadKb } from "../kb";
import { loadStageNotes } from "../kb/stages";
import { PREVIEW_MAX_MONTHS, previewAt, stageForAge, tasksToAdd, type RankedHazard } from "../plan";
import { useStore } from "../store/store";
import { ageMonthsSafe } from "./age";
import { localHazard, monthsText } from "./format";
import { HazardIcon } from "./icons";
import { Severity } from "./parts";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";

function severityOf(r: RankedHazard): number {
  const s = r.reasons.find((x) => x.kind === "severity")?.params.score;
  return typeof s === "number" ? s : 1;
}

export function Ahead() {
  const t = useT();
  const lang = useLang();
  const child = useActiveChild();
  const homes = useStore((s) => s.homes);
  const tasks = useStore((s) => s.tasks);
  const addTasks = useStore((s) => s.addTasks);
  const openTask = useUi((s) => s.openTask);
  const showToast = useUi((s) => s.showToast);
  const [ahead, setAhead] = useState(0);
  const kb = useMemo(() => loadKb(), []);
  const notes = useMemo(() => loadStageNotes(), []);
  const now = useMemo(() => new Date(), []);

  const preview = useMemo(
    () => (child ? previewAt(kb, child, ahead, now) : null),
    [kb, child, ahead, now],
  );
  if (!child || !preview) return <Navigate to="/" replace />;

  const age0 = ageMonthsSafe(child, now);
  const endAge = age0 + PREVIEW_MAX_MONTHS;
  const ageLabel = monthsText(t, preview.ageMonths);
  const heading = ahead === 0 ? t("ahead.today") : ageLabel;
  const atText = t("ahead.at", { name: child.nickname, age: ageLabel });
  const note = notes.get(stageForAge(preview.ageMonths));
  const sinceToday = [...preview.unlocksBy.values()].reduce((n, list) => n + list.length, 0);
  const active = preview.ranked.filter((r) => r.status === "active");
  const toAdd = tasksToAdd(kb, child, homes, ahead, now, tasks);

  const taskFor = (hazardId: string) =>
    tasks.find((x) => x.hazard_id === hazardId && x.childIds.includes(child.id));
  const step = (d: number) => setAhead((a) => Math.min(PREVIEW_MAX_MONTHS, Math.max(0, a + d)));
  const pct = (age: number) =>
    Math.min(100, Math.max(0, ((age - age0) / PREVIEW_MAX_MONTHS) * 100));

  const onAdd = () => {
    addTasks(toAdd);
    showToast({
      message: t(toAdd.length === 1 ? "ahead.added.one" : "ahead.added", { n: toAdd.length }),
    });
  };

  return (
    <div className="flow">
      <h1 className="t-title">{t("ahead.title")}</h1>
      <p className="muted">{t("ahead.lead", { name: child.nickname })}</p>

      <section className="ah-slider" aria-labelledby="ah-age">
        <p id="ah-age" className="ah-age">
          {atText}
        </p>
        <div className="ah-control">
          <button
            type="button"
            className="btn ah-step"
            aria-label={t("ahead.younger")}
            disabled={ahead === 0}
            onClick={() => step(-1)}
          >
            <Minus size={22} weight="bold" aria-hidden="true" />
          </button>
          <input
            type="range"
            className="ah-range"
            min={0}
            max={PREVIEW_MAX_MONTHS}
            step={1}
            value={ahead}
            aria-label={t("ahead.sliderLabel")}
            aria-valuetext={atText}
            onChange={(e) => setAhead(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn ah-step"
            aria-label={t("ahead.older")}
            disabled={ahead === PREVIEW_MAX_MONTHS}
            onClick={() => step(1)}
          >
            <Plus size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
        <div className="ah-scale" aria-hidden="true">
          <span>{monthsText(t, age0)}</span>
          <span>{monthsText(t, endAge)}</span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {t("ahead.live", { name: child.nickname, age: ageLabel, n: preview.newlyActive.length })}
        </p>
      </section>

      <section aria-labelledby="ah-new" className="flow-s">
        <h2 id="ah-new" className="t-section">
          {t("ahead.newHeading", { age: heading })}
        </h2>
        {preview.newlyActive.length > 0 ? (
          <ul className="rows ah-new">
            {preview.newlyActive.map((r) => {
              const h = localHazard(r.hazard, lang);
              const task = taskFor(r.hazard.id);
              const body = (
                <>
                  <span className="row-icon">
                    <HazardIcon name={r.hazard.icon} size={28} />
                  </span>
                  <span className="row-body">
                    <span className="row-title">{t("ahead.starts", { name: h.name })}</span>
                    <span className="row-sub">{h.why}</span>
                  </span>
                  {task && <CaretRight size={20} weight="bold" aria-hidden="true" />}
                </>
              );
              return (
                <li key={r.hazard.id} className="row">
                  {task ? (
                    <button type="button" className="row-link" onClick={() => openTask(task.id)}>
                      {body}
                    </button>
                  ) : (
                    <div className="row-link">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">{t("ahead.newNone")}</p>
        )}
        {preview.dropped.length > 0 && (
          <p className="muted">
            {t("ahead.dropped", {
              names: preview.dropped.map((h) => localHazard(h, lang).name).join(", "),
            })}
          </p>
        )}
        {ahead > 0 && (
          <p className="muted">
            {t(sinceToday === 1 ? "ahead.since.one" : "ahead.since", { n: sinceToday })}
          </p>
        )}
      </section>

      {note && (
        <section aria-labelledby="ah-explore" className="flow-s">
          <h2 id="ah-explore" className="t-section">
            {t("ahead.exploreHeading")}
          </h2>
          <div className="ah-note flow-s">
            <p>{lang === "es" && note.es ? note.es : note.explore}</p>
            <p className="t-small">
              <a href={note.citation.url} target="_blank" rel="noopener noreferrer">
                {t("ahead.source", { title: note.citation.title })}
              </a>
              {note.evidence_status === "verify" && (
                <span className="muted">{` ${t("ahead.verify")}`}</span>
              )}
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="ah-tl" className="flow-s">
        <h2 id="ah-tl" className="t-section">
          {t("ahead.timelineHeading")}
        </h2>
        <p className="muted t-small">{t("ahead.timelineHint", { age: monthsText(t, endAge) })}</p>
        {active.length > 0 ? (
          <ul className="ah-tl">
            {active.map((r) => {
              const h = localHazard(r.hazard, lang);
              const task = taskFor(r.hazard.id);
              const startAge = r.hazard.unlock_age_months;
              const already = startAge <= age0;
              const left = pct(startAge);
              const content = (
                <>
                  <span className="row-icon">
                    <HazardIcon name={r.hazard.icon} size={28} />
                  </span>
                  <span className="ah-tl-text">
                    <span className="ah-tl-name">{h.name}</span>
                    <span className="ah-tl-meta">
                      <Severity score={severityOf(r)} />
                      <span>
                        {already
                          ? t("ahead.already")
                          : t("ahead.from", { age: monthsText(t, Math.ceil(startAge)) })}
                      </span>
                      {!task && <span>{t("ahead.notInPlan")}</span>}
                    </span>
                  </span>
                  {task && <CaretRight size={20} weight="bold" aria-hidden="true" />}
                </>
              );
              return (
                <li key={r.hazard.id} className="ah-tl-item">
                  {task ? (
                    <button type="button" className="ah-tl-main" onClick={() => openTask(task.id)}>
                      {content}
                    </button>
                  ) : (
                    <div className="ah-tl-main">{content}</div>
                  )}
                  <div className="ah-track" aria-hidden="true">
                    <span className="ah-bar" style={{ left: `${left}%`, right: "0%" }} />
                    <span className="ah-mark" style={{ left: `${pct(preview.ageMonths)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">{t("ahead.timelineEmpty")}</p>
        )}
      </section>

      <section className="flow-s">
        {toAdd.length > 0 ? (
          <button type="button" className="btn btn-primary btn-block" onClick={onAdd}>
            {t(toAdd.length === 1 ? "ahead.add.one" : "ahead.add", { n: toAdd.length })}
          </button>
        ) : (
          <p className="muted">{t("ahead.addNone")}</p>
        )}
        <p className="fine">{t("task.notGuarantee")}</p>
        <Link className="btn btn-text" to="/">
          {t("ahead.back")}
        </Link>
      </section>
    </div>
  );
}
