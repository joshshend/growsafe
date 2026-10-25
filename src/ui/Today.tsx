import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Link, Navigate } from "react-router-dom";
import { loadKb } from "../kb";
import { nextUnlocks } from "../plan";
import { useStore } from "../store/store";
import { progress } from "../store/selectors";
import { costText, localHazard, monthsText, taskTotals } from "./format";
import { ChildChip } from "./ChildChip";
import { DoneDoorframe } from "./illustrations";
import { TaskRow, useChildViews } from "./parts";
import { ProgressMarks } from "./ProgressMarks";
import { firstSentence } from "./readAloud";
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
  // "Show me a different one" steps through the open tasks in ranked order.
  const [skip, setSkip] = useState(0);

  const open = views.filter((v) => v.task.status !== "done" && v.group !== "soon");
  const heroIdx = open.length ? skip % open.length : 0;
  const hero = open[heroIdx];
  const heroId = hero?.task.id;

  // Rows that were just ticked stay on screen for a moment so the checkmark can be seen.
  const [lingering, setLingering] = useState<string[]>([]);
  const prevOpen = useRef<string[] | null>(null);
  const prevHero = useRef<string | undefined>(undefined);
  useEffect(() => {
    const now = open.map((v) => v.task.id);
    const before = prevOpen.current;
    const heroBefore = prevHero.current;
    prevOpen.current = now;
    prevHero.current = heroId;
    if (!before) return;
    // The task shown as "Right now" swaps in place, so only list rows linger.
    const gone = views.filter(
      (v) => before.includes(v.task.id) && v.task.id !== heroBefore && v.task.status === "done",
    );
    if (gone.length === 0) return;
    const ids = gone.map((v) => v.task.id);
    setLingering((cur) => Array.from(new Set([...cur, ...ids])));
    const timer = window.setTimeout(
      () => setLingering((cur) => cur.filter((id) => !ids.includes(id))),
      700,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, heroId]);

  if (!child) return <Navigate to="/" replace />;

  const rest = easy ? [] : open.filter((_, i) => i !== heroIdx);
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

  const heroLocal = hero ? localHazard(hero.hazard, lang) : null;
  const heroTotals = hero ? taskTotals(hero.hazard) : null;
  const heroWhere = hero
    ? [
        t(`room.${hero.task.room}`),
        homes.length > 1 ? homes.find((h) => h.id === hero.task.home_id)?.name : "",
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="flow today">
      <RecallBanner />
      <div className="today-who">
        <ChildChip />
      </div>

      {hero && heroLocal && heroTotals ? (
        <section className="hero" aria-labelledby="hero-title">
          <p className="lbl">{t("today.rightNow")}</p>
          <h1 id="hero-title" className="d4">
            {heroLocal.name}
          </h1>
          {heroLocal.why && <p className="t2">{firstSentence(heroLocal.why)}</p>}
          <p className="t1 muted">
            {[
              heroWhere,
              t("task.minutes", { n: heroTotals.minutes }),
              costText(t, heroTotals.min, heroTotals.max),
            ].join(" · ")}
          </p>
          <div className="hero-actions">
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
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => {
                  setStatus(hero.task.id, "done");
                  setSkip(0);
                }}
              >
                {t("easy.done")}
              </button>
            )}
            {open.length > 1 && (
              <button
                type="button"
                className="btn btn-quiet hero-skip"
                onClick={() => setSkip(skip + 1)}
              >
                {t("easy.next")}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="done-state" aria-labelledby="done-title">
          <div className="done-state-art">
            <DoneDoorframe decorative />
          </div>
          <h1 id="done-title" className="d4">
            {t("today.allDone", { name: child.nickname })}
          </h1>
          <p className="t2 muted">
            {upcoming[0] && soonestMonths !== null
              ? t("today.nextUnlock", {
                  hazard: localHazard(upcoming[0].hazard, lang).name,
                  age: monthsText(t, age + soonestMonths),
                })
              : t("today.nothingNext")}
          </p>
        </section>
      )}

      <div className="today-count">
        <div className="d5">{total.done}</div>
        <div className="today-count-text">
          <div className="t2b">{t("today.countOf", { total: total.total })}</div>
        </div>
        {!easy && total.total > 0 && (
          <ProgressMarks
            progressbar
            done={total.done}
            total={total.total}
            label={t("plan.progressLabel")}
          />
        )}
      </div>

      {shownRest.length > 0 && (
        <section aria-labelledby="next-title">
          <h2 id="next-title" className="lbl">
            {t("today.next")}
          </h2>
          <ul className="rows">
            {shownRest.map((v) => (
              <TaskRow key={v.task.id} view={v} />
            ))}
          </ul>
        </section>
      )}

      <div className="rows">
        <Link to="/scan" className="row">
          <span className="row-body">
            <span className="row-title">{t("scan.cta.today")}</span>
            <span className="row-sub">{t("scan.cta.todaySub")}</span>
          </span>
        </Link>
        {!easy && open.length > 0 && (
          <Link to="/weekend" className="row">
            <span className="row-body">
              <span className="row-title">{t("weekend.card.body")}</span>
              <span className="row-sub">{t("weekend.card.title")}</span>
            </span>
          </Link>
        )}
      </div>

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
            <Link to="/ahead" className="btn btn-secondary btn-block">
              {t("ahead.link")}
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}
