// Minimal iCalendar (.ics) writer (RFC 5545). No network. Pure functions.
// Times are written as floating local times (no TZID), so "Saturday 9:00" stays 9:00 wherever the phone is.
export interface IcsEvent {
  title: string;
  description: string;
  start: Date; // local wall-clock time, written as a floating time (or a calendar date when allDay)
  minutes: number;
  now?: Date; // DTSTAMP (tests pass a fixed value)
  rrule?: string; // recurrence value without the "RRULE:" prefix, e.g. "FREQ=WEEKLY;BYDAY=SA"
  allDay?: boolean; // DTSTART;VALUE=DATE, one day long (minutes is ignored)
  uid?: string; // fixed id so adding the same file again updates the event instead of duplicating it
  alarmMinutes?: number; // adds a display alarm this many minutes after the start (0 = at the start)
}

const pad = (n: number) => String(n).padStart(2, "0");

function local(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
function localDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function utc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets are folded with CRLF + space.
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // continuation lines start with a space
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

// Stable id so re-downloading the same plan does not create a different event.
function uid(e: IcsEvent): string {
  let h = 5381;
  for (const ch of `${e.title}|${e.description}|${local(e.start)}`) h = (h * 33) ^ ch.charCodeAt(0);
  return `${(h >>> 0).toString(36)}@growsafe.local`;
}

function eventLines(e: IcsEvent, stamp: Date): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${e.uid ?? uid(e)}`, `DTSTAMP:${utc(stamp)}`];
  if (e.allDay) {
    const next = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${localDate(e.start)}`, `DTEND;VALUE=DATE:${localDate(next)}`);
  } else {
    const end = new Date(e.start.getTime() + Math.max(1, e.minutes) * 60000);
    lines.push(`DTSTART:${local(e.start)}`, `DTEND:${local(end)}`);
  }
  // The RRULE value is not text, so it is not escaped; line breaks are stripped so it cannot inject properties.
  if (e.rrule) lines.push(`RRULE:${e.rrule.replace(/[\r\n]+/g, "")}`);
  lines.push(`SUMMARY:${escapeText(e.title)}`, `DESCRIPTION:${escapeText(e.description)}`);
  if (e.alarmMinutes !== undefined) {
    const m = Math.max(0, Math.round(e.alarmMinutes));
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(e.title)}`,
      `TRIGGER:PT${m}M`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT");
  return lines;
}

function wrap(events: IcsEvent[], product: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//GrowSafe//${product}//EN`,
    "CALSCALE:GREGORIAN",
    ...events.flatMap((e) => eventLines(e, e.now ?? new Date())),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function buildIcs(e: IcsEvent): string {
  return wrap([e], "Weekend plan");
}

// Several events (some repeating) in one file, for the Reminders screen.
export function buildIcsCalendar(events: IcsEvent[]): string {
  return wrap(events, "Reminders");
}

// RFC 5545 weekday codes, indexed like Date.getDay().
export const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

// Every week on `day` (0 = Sunday ... 6 = Saturday).
export function weeklyRule(day: number): string {
  return `FREQ=WEEKLY;BYDAY=${WEEKDAY_CODES[day]}`;
}

// Every month on the nth (1 to 4) `day`. Avoids day-of-month 29 to 31, which some months do not have.
export function monthlyRule(nth: number, day: number): string {
  return `FREQ=MONTHLY;BYDAY=${nth}${WEEKDAY_CODES[day]}`;
}

// First `day` at hour:minute that is still ahead of `now` (today if the time has not passed).
// DTSTART should itself match the RRULE, so repeating events start on this date.
export function nextWeekday(now: Date, day: number, hour: number, minute: number): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d;
}

// First nth `day` of a month at hour:minute that is still ahead of `now`.
export function nextNthWeekday(
  now: Date,
  nth: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  for (let m = 0; m < 3; m++) {
    const first = new Date(now.getFullYear(), now.getMonth() + m, 1, hour, minute, 0);
    first.setDate(1 + ((day - first.getDay() + 7) % 7) + (nth - 1) * 7);
    if (first.getTime() > now.getTime()) return first;
  }
  throw new Error("unreachable: a later month always has an nth weekday");
}

// Next Saturday at 10:00 local time (today if it is Saturday and before 10:00).
export function nextSaturdayMorning(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  let add = (6 - d.getDay() + 7) % 7;
  if (add === 0 && now.getTime() >= d.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}
