// Minimal iCalendar (.ics) writer (RFC 5545). One event, no network. Pure functions.
export interface IcsEvent {
  title: string;
  description: string;
  start: Date; // local wall-clock time, written as a floating time
  minutes: number;
  now?: Date; // DTSTAMP (tests pass a fixed value)
}

const pad = (n: number) => String(n).padStart(2, "0");

function local(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
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

export function buildIcs(e: IcsEvent): string {
  const end = new Date(e.start.getTime() + Math.max(1, e.minutes) * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GrowSafe//Weekend plan//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid(e)}`,
    `DTSTAMP:${utc(e.now ?? new Date())}`,
    `DTSTART:${local(e.start)}`,
    `DTEND:${local(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

// Next Saturday at 10:00 local time (today if it is Saturday and before 10:00).
export function nextSaturdayMorning(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  let add = (6 - d.getDay() + 7) % 7;
  if (add === 0 && now.getTime() >= d.getTime()) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}
