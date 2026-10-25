import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  CaretDown,
  CaretRight,
  CheckCircle,
  ClipboardText,
  Clock,
  Coins,
} from "@phosphor-icons/react";
import { Link, Navigate } from "react-router-dom";
import { loadKb } from "../kb";
import { nextUnlocks } from "../plan";
import { useStore } from "../store/store";
import { progress } from "../store/selectors";
import { costText, localHazard, monthsText, taskTotals } from "./format";
import { HazardIcon, RoomIcon } from "./icons";
import { Wordmark } from "./Logo";
import { Ring, Severity, TaskRow, useChildViews } from "./parts";
import { ageMonthsSafe } from "./age";
import { useEasy } from "./easy";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT } from "./useT";
import { RecallBanner } from "../recalls/RecallBanner";

const NEXT_LIMIT = 6;

export function Today() {
  const t = useT();
  const lang = useLang();
  const child = useActiveChild();
  const views = useChildViews();
  const setStatus = useStore((s) => s.setStatus);
  const openTask = useUi((s) => s.openTask);
  const homes = useStore((s) => s.homes);
  const easy = useEasy();
  const [skip, setSkip] = useState(0);

  // Rows that were just ticked stay on screen for a moment so the checkmark can be seen.
  const [lingering, setLingering] = useState<string[]>([]);
  const prevOpen = useRef<string[] | null>(null);
  const open = views.filter((v) => v.task.status !== "done" && v.group !== "soon");
  useEffect(() => {
    const now = open.map((v) => v.task.id);
    const before = prevOpen.current;
    prevOpen.current = now;
    if (!before) return;
    // Index 0 is the hero card, which swaps in place, so only list rows linger.
    const gone = views.filter((v) => before.indexOf(v.task.id) > 0 && v.task.status === "done");
    if (gone.length === 0) return;
    const ids = gone.map((v) => v.task.id);
    setLingering((cur) => Array.from(new Set([...cur, ...ids])));
    const timer = window.setTimeout(
      () => setLingering((cur) => cur.filter((id) => !ids.includes(id))),
      700,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views]);

  if (!child) return <Navigate to="/" replace />;

  const hero = open.length ? open[easy ? skip % open.length : 0] : undefined;
  const rest = easy ? [] : open.slice(1);
  const lingerViews = views.filter(
    (v) => lingering.includes(v.task.id) && v.task.status === "done",
  );
  const shownRest = [...rest.slice(0, NEXT_LIMIT), ...lingerViews];
  const total = progress(views);
  const kb = loadKb();
  const now = new Date();
  const upcoming = nextUnlocks(kb, child, now, 6);
  const soonestMonths = upcoming[0]?.unlocksInMonths ?? null;
  const soonViews = views
    .filter((v) => v.group === "soon" && v.task.status !== "done")
    .sort((a, b) => (a.ranked?.unlocksInMonths ?? 99) - (b.ranked?.unlocksInMonths ?? 99));
  const soonTaskMonths = soonViews[0]?.ranked?.unlocksInMonths ?? null;
  const age = ageMonthsSafe(child, now);

  return (
    <div className="flow">
      <RecallBanner />
      <div className="brand-row">
        <Wordmark text={t("app.title")} />
      </div>
      <div className="today-head">
        <h1 className="t-title">{t("today.title", { name: child.nickname })}</h1>
        <Ring
          done={total.done}
          total={total.total}
          label={t("plan.progressLabel")}
          showCount
          size={64}
        />
      </div>

      {hero ? (
        <section className="hero" aria-labelledby="hero-title">
          <span className="hero-icon">
            <HazardIcon name={hero.hazard.icon} size={48} />
          </span>
          <h2 id="hero-title" className="hero-title">
            {localHazard(hero.hazard, lang).name}
          </h2>
          <Severity score={hero.severity} />
          <div className="hero-meta">
            <span className="meta-item">
              <RoomIcon room={hero.task.room} size={22} />
              {t(`room.${hero.task.room}`)}
              {homes.length > 1 && `, ${homes.find((h) => h.id === hero.task.home_id)?.name ?? ""}`}
            </span>
            <span className="meta-item">
              <Clock size={22} weight="duotone" aria-hidden="true" />
              {t("task.minutes", { n: taskTotals(hero.hazard).minutes })}
            </span>
            <span className="meta-item">
              <Coins size={22} weight="duotone" aria-hidden="true" />
              {costText(t, taskTotals(hero.hazard).min, taskTotals(hero.hazard).max)}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              if (hero.task.status === "todo") setStatus(hero.task.id, "doing");
              openTask(hero.task.id);
            }}
          >
            {t(hero.task.status === "doing" ? "today.continue" : "today.start")}
          </button>
          {easy && (
            <div className="easy-actions">
              <button
                type="button"
                className="btn btn-block"
                onClick={() => {
                  setStatus(hero.task.id, "done");
                  setSkip(0);
                }}
              >
                {t("easy.done")}
              </button>
              {open.length > 1 && (
                <button type="button" className="btn btn-block" onClick={() => setSkip(skip + 1)}>
                  {t("easy.next")}
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="done-state" aria-labelledby="done-title">
          <span className="done-state-icon">
            <CheckCircle size={56} weight="duotone" aria-hidden="true" />
          </span>
          <h2 id="done-title" className="t-section">
            {t("today.allDone", { name: child.nickname })}
          </h2>
          <p className="muted">
            {upcoming[0] && soonestMonths !== null
              ? t("today.nextUnlock", {
                  hazard: localHazard(upcoming[0].hazard, lang).name,
                  age: monthsText(t, age + soonestMonths),
                })
              : t("today.nothingNext")}
          </p>
        </section>
      )}

      <Link to="/scan" className="wk-card">
        <span className="wk-card-icon">
          <ClipboardText size={32} weight="duotone" aria-hidden="true" />
        </span>
        <span className="row-body">
          <span className="row-sub">{t("scan.cta.todaySub")}</span>
          <span className="row-title">{t("scan.cta.today")}</span>
        </span>
        <CaretRight size={20} weight="bold" aria-hidden="true" />
      </Link>

      {!easy && open.length > 0 && (
        <Link to="/weekend" className="wk-card">
          <span className="wk-card-icon">
            <CalendarCheck size={32} weight="duotone" aria-hidden="true" />
          </span>
          <span className="row-body">
            <span className="row-sub">{t("weekend.card.title")}</span>
            <span className="row-title">{t("weekend.card.body")}</span>
          </span>
          <CaretRight size={20} weight="bold" aria-hidden="true" />
        </Link>
      )}

      {shownRest.length > 0 && (
        <section aria-labelledby="next-title">
          <div className="section-head">
            <h2 id="next-title" className="t-section">
              {t("today.next")}
            </h2>
          </div>
          <ul className="rows">
            {shownRest.map((v) => (
              <TaskRow key={v.task.id} view={v} />
            ))}
          </ul>
        </section>
      )}

      {!easy && soonViews.length > 0 && soonTaskMonths !== null && (
        <details className="disc">
          <summary className="disc-sum">
            <span>{t("today.comingUp", { age: monthsText(t, age + soonTaskMonths) })}</span>
            <CaretDown className="disc-caret" size={20} weight="bold" aria-hidden="true" />
          </summary>
          <div className="disc-body">
            <ul className="rows">
              {soonViews.slice(0, 6).map((v) => (
                <TaskRow key={v.task.id} view={v} />
              ))}
            </ul>
            <Link to="/ahead" className="btn btn-block">
              {t("ahead.link")}
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}
