// Check-in reminders (T26). No push notifications (GrowSafe has no accounts or server), so this makes a calendar
// file with repeating events; the person's own calendar app does the reminding.
import { useMemo, useState } from "react";
import { CalendarPlus, CaretLeft, Check } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { buildIcsCalendar, type IcsEvent } from "../ics/ics";
import {
  DEFAULT_DAY,
  DEFAULT_TIME,
  monthlyRoom,
  parseTime,
  planUpdate,
  upcomingPlanDates,
  weeklyCheckin,
} from "../ics/reminders";
import { downloadIcs } from "../native/reminder";
import { useStore } from "../store/store";
import { monthsText } from "./format";
import { useUi } from "./ui-state";
import { useLang, useT } from "./useT";

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Monday first, like most calendars

export function Reminders() {
  const t = useT();
  const lang = useLang();
  const homes = useStore((s) => s.homes);
  const children = useStore((s) => s.children);
  const showToast = useUi((s) => s.showToast);

  const [weekly, setWeekly] = useState(true);
  const [day, setDay] = useState(DEFAULT_DAY);
  const [time, setTime] = useState("09:00");
  const [rooms, setRooms] = useState<string[]>([]);
  const [plan, setPlan] = useState(false);

  const dayName = (d: number) =>
    new Date(2026, 0, 4 + d).toLocaleDateString(lang, { weekday: "long" }); // 4 Jan 2026 is a Sunday
  const roomChoices = useMemo(
    () =>
      homes.flatMap((h) =>
        h.rooms.map((r) => ({
          key: `${h.id}-${r}`,
          label:
            homes.length > 1
              ? t("reminders.room.withHome", { room: t(`room.${r}`), home: h.name })
              : t(`room.${r}`),
          name: t(`room.${r}`),
        })),
      ),
    [homes, t],
  );

  const parsed = parseTime(time) ?? DEFAULT_TIME;
  const build = (): IcsEvent[] => {
    const now = new Date();
    const out: IcsEvent[] = [];
    if (weekly)
      out.push(
        weeklyCheckin(
          { title: t("reminders.ics.weekly.title"), description: t("reminders.ics.weekly.desc") },
          day,
          parsed,
          now,
        ),
      );
    roomChoices
      .filter((r) => rooms.includes(r.key))
      .forEach((r, i) =>
        out.push(
          monthlyRoom(
            {
              title: t("reminders.ics.monthly.title", { room: r.name.toLocaleLowerCase(lang) }),
              description: t("reminders.ics.monthly.desc"),
            },
            r.key,
            i,
            day,
            parsed,
            now,
          ),
        ),
      );
    if (plan)
      for (const c of children)
        for (const p of upcomingPlanDates(c, now)) {
          const vars = { name: c.nickname, age: monthsText(t, p.months) };
          out.push(
            planUpdate(
              {
                title: t("reminders.ics.plan.title", vars),
                description: t("reminders.ics.plan.desc", vars),
              },
              c.id,
              p,
              now,
            ),
          );
        }
    return out;
  };
  const count = build().length;

  const toggleRoom = (key: string) =>
    setRooms((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  const add = () => {
    const events = build();
    if (events.length === 0) return;
    downloadIcs("growsafe-reminders.ics", buildIcsCalendar(events));
    showToast({ message: t("reminders.ready") });
  };

  return (
    <div className="flow">
      <Link to="/settings" className="back">
        <CaretLeft size={20} weight="bold" aria-hidden="true" />
        {t("settings.title")}
      </Link>
      <h1 className="t-title">{t("reminders.title")}</h1>
      <p>{t("reminders.lead")}</p>
      <p className="muted">{t("reminders.times")}</p>

      <section className="flow-s" aria-labelledby="rm-weekly">
        <h2 id="rm-weekly" className="t-section">
          {t("reminders.weekly.heading")}
        </h2>
        <div className="setting">
          <span id="rm-weekly-on">
            {t("reminders.weekly.toggle")}
            <span className="row-sub block">{t("reminders.weekly.hint")}</span>
          </span>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={weekly}
            aria-labelledby="rm-weekly-on"
            onClick={() => setWeekly(!weekly)}
          />
        </div>
        <div className="flow-s" role="group" aria-labelledby="rm-day">
          <span id="rm-day" className="field-label">
            {t("reminders.day")}
          </span>
          <div className="toggle-chips">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className="toggle-chip"
                aria-pressed={day === d}
                onClick={() => setDay(d)}
              >
                {day === d && <Check size={18} weight="bold" aria-hidden="true" />}
                {dayName(d)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="rm-time">
            {t("reminders.time")}
          </label>
          <input
            id="rm-time"
            className="input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </section>

      <section className="flow-s" aria-labelledby="rm-monthly">
        <h2 id="rm-monthly" className="t-section">
          {t("reminders.monthly.heading")}
        </h2>
        {roomChoices.length === 0 ? (
          <p className="muted">{t("reminders.monthly.none")}</p>
        ) : (
          <>
            <p className="muted">{t("reminders.monthly.hint")}</p>
            <div className="toggle-chips" role="group" aria-labelledby="rm-monthly">
              {roomChoices.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className="toggle-chip"
                  aria-pressed={rooms.includes(r.key)}
                  onClick={() => toggleRoom(r.key)}
                >
                  {rooms.includes(r.key) && <Check size={18} weight="bold" aria-hidden="true" />}
                  {r.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flow-s" aria-labelledby="rm-plan">
        <h2 id="rm-plan" className="t-section">
          {t("reminders.plan.heading")}
        </h2>
        {children.length === 0 ? (
          <p className="muted">{t("reminders.plan.none")}</p>
        ) : (
          <>
            <div className="setting">
              <span id="rm-plan-on">
                {t("reminders.plan.toggle")}
                <span className="row-sub block">{t("reminders.plan.hint")}</span>
              </span>
              <button
                type="button"
                role="switch"
                className="switch"
                aria-checked={plan}
                aria-labelledby="rm-plan-on"
                onClick={() => setPlan(!plan)}
              />
            </div>
          </>
        )}
      </section>

      <div className="form-actions">
        <p role="status" className="muted">
          {count === 0
            ? t("reminders.nothing")
            : count === 1
              ? t("reminders.count.one")
              : t("reminders.count", { n: count })}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={count === 0}
          onClick={add}
        >
          <CalendarPlus size={22} weight="regular" aria-hidden="true" />
          {t("reminders.add")}
        </button>
      </div>
    </div>
  );
}
