// "Plan my weekend" (T20): choose time and budget, get an ordered list, supplies, totals and a calendar file.
import { useMemo, useState } from "react";
import { CalendarPlus, Check, Clock, Coins, Copy } from "@phosphor-icons/react";
import { Link, Navigate } from "react-router-dom";
import { buildIcs, nextSaturdayMorning } from "../ics/ics";
import { downloadIcs } from "../native/reminder";
import { loadKb } from "../kb";
import { planWeekend, type WeekendPlan } from "../plan";
import { useStore } from "../store/store";
import { buildViews } from "../store/selectors";
import { costText, durationText, localHazard, taskTotals } from "./format";
import { HazardIcon } from "./icons";
import { CheckButton, useSetDone } from "./parts";
import { useActiveChild, useUi } from "./ui-state";
import { useLang, useT, type TFn } from "./useT";

const TIMES = [30, 60, 120, 240];
const BUDGETS: (number | null)[] = [0, 25, 50, 100, null];
const ALL = "all";

interface Result {
  plan: WeekendPlan;
  minutes: number;
}

function Chips<T extends string | number | null>({
  label,
  options,
  value,
  text,
  onPick,
}: {
  label: string;
  options: T[];
  value: T;
  text: (o: T) => string;
  onPick: (o: T) => void;
}) {
  return (
    <section className="flow-s" role="group" aria-label={label}>
      <h2 className="t-strong">{label}</h2>
      <div className="toggle-chips">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            className="toggle-chip"
            aria-pressed={o === value}
            onClick={() => onPick(o)}
          >
            {o === value && <Check size={18} weight="bold" aria-hidden="true" />}
            {text(o)}
          </button>
        ))}
      </div>
    </section>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function Weekend() {
  const t = useT();
  const lang = useLang();
  const child = useActiveChild();
  const homes = useStore((s) => s.homes);
  const tasks = useStore((s) => s.tasks);
  const openTask = useUi((s) => s.openTask);
  const showToast = useUi((s) => s.showToast);
  const setDone = useSetDone();
  const kb = useMemo(() => loadKb(), []);

  const [minutes, setMinutes] = useState(60);
  const [budget, setBudget] = useState<number | null>(25);
  const [home, setHome] = useState<string>(ALL);
  const [result, setResult] = useState<Result | null>(null);

  if (!child) return <Navigate to="/" replace />;

  const mine = tasks.filter((x) => x.childIds.length === 0 || x.childIds.includes(child.id));
  const now = new Date();

  const make = () => {
    const plan = planWeekend({
      tasks: mine,
      kb,
      minutes,
      budgetUsd: budget,
      homeId: home === ALL ? undefined : home,
      children: [child],
      now,
    });
    setResult({ plan, minutes });
  };

  const homeName = (id: string) => homes.find((h) => h.id === id)?.name ?? "";
  const hazardOf = (hazardId: string) => kb.find((h) => h.id === hazardId);

  if (!result) {
    return (
      <div className="flow">
        <h1 className="t-title">{t("weekend.title")}</h1>
        <p className="muted">{t("weekend.lead", { name: child.nickname })}</p>
        <Chips
          label={t("weekend.timeHeading")}
          options={TIMES}
          value={minutes}
          text={(m) => t(`weekend.time.${m}`)}
          onPick={setMinutes}
        />
        <Chips
          label={t("weekend.budgetHeading")}
          options={BUDGETS}
          value={budget}
          text={(b) => (b === null ? t("weekend.noLimit") : t("cost.single", { n: b }))}
          onPick={setBudget}
        />
        {homes.length > 1 && (
          <Chips
            label={t("weekend.homeHeading")}
            options={[ALL, ...homes.map((h) => h.id)]}
            value={home}
            text={(id) => (id === ALL ? t("weekend.allHomes") : homeName(id))}
            onPick={setHome}
          />
        )}
        <button type="button" className="btn btn-primary btn-block" onClick={make}>
          {t("weekend.make")}
        </button>
      </div>
    );
  }

  const { plan } = result;
  const chosenTasks = plan.chosen.map((c) => tasks.find((x) => x.id === c.id) ?? c);
  const views = buildViews({ children: [child], tasks: chosenTasks }, kb, now);
  const multiHome = homes.length > 1;
  const costLine = costText(t, plan.totalCostMin, plan.totalCostMax);
  const nameOf = (hazardId: string) => {
    const h = hazardOf(hazardId);
    return h ? localHazard(h, lang).name : hazardId;
  };

  const listText = () => buildListText(t, plan, nameOf, child.nickname, costLine);
  const onCopy = async () => {
    const ok = await copyText(listText());
    showToast({ message: t(ok ? "weekend.copied" : "weekend.copyFail") });
  };
  const onCalendar = () => {
    const ics = buildIcs({
      title: t("weekend.icsTitle", { name: child.nickname }),
      description: listText(),
      start: nextSaturdayMorning(new Date()),
      minutes: Math.max(30, plan.totalMinutes),
    });
    downloadIcs("growsafe-session.ics", ics);
  };

  let lastRoom = "";
  return (
    <div className="flow">
      <h1 className="t-title">{t("weekend.resultTitle")}</h1>

      {views.length > 0 ? (
        <>
          <div className="chips-line" aria-label={t("weekend.totals")}>
            <span className="fact">{t("weekend.count", { n: views.length })}</span>
            <span className="fact">
              <Clock size={20} weight="regular" aria-hidden="true" />
              {durationText(t, plan.totalMinutes)}
            </span>
            <span className="fact">
              <Coins size={20} weight="regular" aria-hidden="true" />
              {costLine}
            </span>
          </div>
          {plan.leftoverMinutes > 0 && (
            <p className="muted">{t("weekend.left", { n: plan.leftoverMinutes })}</p>
          )}

          <ul className="rows" aria-label={t("weekend.listLabel")}>
            {views.map((v) => {
              const showHead = `${v.task.home_id}|${v.task.room}` !== lastRoom;
              lastRoom = `${v.task.home_id}|${v.task.room}`;
              const done = v.task.status === "done";
              const name = localHazard(v.hazard, lang).name;
              const totals = taskTotals(v.hazard);
              return (
                <li key={v.task.id} className="wk-item">
                  {showHead && (
                    <p className="wk-room">
                      {t(`room.${v.task.room}`)}
                      {multiHome && `, ${homeName(v.task.home_id)}`}
                    </p>
                  )}
                  <div className={`row${done ? " is-done" : ""}`}>
                    <CheckButton
                      done={done}
                      label={t(done ? "task.unmarkLabel" : "task.markLabel", { name })}
                      onToggle={() => setDone(v.task.id, !done)}
                    />
                    <button type="button" className="row-link" onClick={() => openTask(v.task.id)}>
                      <span className="row-icon">
                        <HazardIcon name={v.hazard.icon} size={28} />
                      </span>
                      <span className="row-body">
                        <span className="row-title">{name}</span>
                        <span className="row-sub">
                          {durationText(t, totals.minutes)}, {costText(t, totals.min, totals.max)}
                        </span>
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <section className="flow-s" aria-labelledby="wk-supplies">
            <h2 id="wk-supplies" className="t-section">
              {t("weekend.supplies")}
            </h2>
            {plan.supplies.length > 0 ? (
              <ul className="wk-supplies">
                {plan.supplies.map((s) => (
                  <li key={s.name}>
                    {s.name}
                    {s.count > 1 && (
                      <span className="muted">{` (${t("weekend.usedIn", { n: s.count })})`}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{t("weekend.noSupplies")}</p>
            )}
            <div className="wk-actions">
              <button type="button" className="btn" onClick={onCopy}>
                <Copy size={20} weight="regular" aria-hidden="true" />
                {t("weekend.copy")}
              </button>
              <button type="button" className="btn" onClick={onCalendar}>
                <CalendarPlus size={20} weight="regular" aria-hidden="true" />
                {t("weekend.calendar")}
              </button>
            </div>
          </section>
        </>
      ) : (
        <p className="muted">
          {t(plan.skipped.length > 0 ? "weekend.nothingFits" : "weekend.nothingOpen")}
        </p>
      )}

      {plan.skipped.length > 0 && (
        <details className="disc">
          <summary className="disc-sum">
            <span>{t("weekend.skipped", { n: plan.skipped.length })}</span>
          </summary>
          <div className="disc-body">
            <ul className="rows">
              {plan.skipped.slice(0, 8).map((s) => (
                <li key={s.id} className="row">
                  <button type="button" className="row-link" onClick={() => openTask(s.id)}>
                    <span className="row-body">
                      <span className="row-title">{nameOf(s.hazard_id)}</span>
                      <span className="row-sub">
                        {t(`room.${s.room}`)},{" "}
                        {t(`weekend.skip.${plan.skippedReason[s.id] ?? "time"}`)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      <p className="muted t-small">{t("weekend.rankNote", { name: child.nickname })}</p>
      <p className="fine">{t("task.notGuarantee")}</p>
      <div className="wk-actions">
        <button type="button" className="btn" onClick={() => setResult(null)}>
          {t("weekend.change")}
        </button>
        <Link className="btn btn-text" to="/">
          {t("weekend.backToday")}
        </Link>
      </div>
    </div>
  );
}

function buildListText(
  t: TFn,
  plan: WeekendPlan,
  nameOf: (hazardId: string) => string,
  name: string,
  costLine: string,
): string {
  const lines = [t("weekend.icsTitle", { name }), ""];
  plan.chosen.forEach((task, i) => {
    lines.push(`${i + 1}. ${nameOf(task.hazard_id)} (${t(`room.${task.room}`)})`);
  });
  lines.push("", `${durationText(t, plan.totalMinutes)}, ${costLine}`);
  if (plan.supplies.length > 0) {
    lines.push("", `${t("weekend.supplies")}:`);
    for (const s of plan.supplies) lines.push(`- ${s.name}`);
  }
  return lines.join("\n");
}
