// Check-in reminders as calendar events (no push notifications: GrowSafe has no accounts and no server).
// Pure functions. The Reminders screen translates the words and passes them in; this file only does dates and rules.
import type { Child } from "../kb/schema";
import { monthlyRule, nextNthWeekday, nextWeekday, weeklyRule, type IcsEvent } from "./ics";

export interface TimeOfDay {
  hour: number;
  minute: number;
}
export const DEFAULT_DAY = 6; // Saturday
export const DEFAULT_TIME: TimeOfDay = { hour: 9, minute: 0 };

// "09:30" from an <input type="time"> -> { hour: 9, minute: 30 }. Null if it is not a valid time.
export function parseTime(text: string): TimeOfDay | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

// Stable ids: adding the file again updates these events in most calendar apps instead of piling up copies.
export const WEEKLY_UID = "growsafe-weekly-checkin@growsafe.local";
export const monthlyUid = (roomKey: string) => `growsafe-monthly-${roomKey}@growsafe.local`;
export const planUid = (childId: string, months: number) =>
  `growsafe-plan-${childId}-${months}m@growsafe.local`;

export function weeklyCheckin(
  text: { title: string; description: string },
  day: number,
  time: TimeOfDay,
  now: Date,
): IcsEvent {
  return {
    ...text,
    uid: WEEKLY_UID,
    start: nextWeekday(now, day, time.hour, time.minute),
    minutes: 10,
    rrule: weeklyRule(day),
    alarmMinutes: 0,
    now,
  };
}

// `index` spreads several rooms over the first four weeks of the month so they do not all land on one day.
export function monthlyRoom(
  text: { title: string; description: string },
  roomKey: string,
  index: number,
  day: number,
  time: TimeOfDay,
  now: Date,
): IcsEvent {
  const nth = (index % 4) + 1;
  return {
    ...text,
    uid: monthlyUid(roomKey),
    start: nextNthWeekday(now, nth, day, time.hour, time.minute),
    minutes: 10,
    rrule: monthlyRule(nth, day),
    alarmMinutes: 0,
    now,
  };
}

// Ages (months) where the plan is worth a look: the stage bands in src/plan/stage.ts, then each birthday to age 5.
export const PLAN_MILESTONES = [3, 6, 12, 24, 36, 48, 60];

export interface PlanDate {
  months: number;
  date: Date;
}
// The next `count` milestones for a child, as calendar dates. Only the birth month and year are stored, so the
// birthday is taken as the 15th (the same assumption the plan uses).
export function upcomingPlanDates(child: Child, now: Date, count = 3): PlanDate[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return PLAN_MILESTONES.map((months) => ({
    months,
    date: new Date(child.birth_year, child.birth_month - 1 + months, 15),
  }))
    .filter((p) => p.date.getTime() >= today.getTime())
    .slice(0, count);
}

export function planUpdate(
  text: { title: string; description: string },
  childId: string,
  p: PlanDate,
  now: Date,
): IcsEvent {
  return {
    ...text,
    uid: planUid(childId, p.months),
    start: p.date,
    minutes: 0,
    allDay: true,
    alarmMinutes: 9 * 60, // a display alarm at 9:00 on the day
    now,
  };
}
