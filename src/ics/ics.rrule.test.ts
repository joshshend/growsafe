import { describe, expect, it } from "vitest";
import {
  buildIcs,
  buildIcsCalendar,
  monthlyRule,
  nextNthWeekday,
  nextWeekday,
  weeklyRule,
} from "./ics";
import {
  monthlyRoom,
  parseTime,
  planUpdate,
  upcomingPlanDates,
  weeklyCheckin,
  WEEKLY_UID,
} from "./reminders";

const NOW = new Date(2026, 9, 24, 12, 0); // Saturday 24 Oct 2026, noon
const text = {
  title: "Weekly: 10-minute GrowSafe check-in",
  description: "One task, ten minutes.",
};
const unfold = (s: string) => s.replace(/\r\n /g, "");

describe("recurrence rules and start dates", () => {
  it("writes weekly and monthly RRULE values", () => {
    expect(weeklyRule(6)).toBe("FREQ=WEEKLY;BYDAY=SA");
    expect(weeklyRule(0)).toBe("FREQ=WEEKLY;BYDAY=SU");
    expect(monthlyRule(2, 3)).toBe("FREQ=MONTHLY;BYDAY=2WE");
  });
  it("starts on the next matching weekday that is still ahead", () => {
    // It is Saturday noon: Saturday 9:00 has passed, so the next one is a week away.
    expect(nextWeekday(NOW, 6, 9, 0)).toEqual(new Date(2026, 9, 31, 9, 0));
    // Saturday 15:00 is still ahead today.
    expect(nextWeekday(NOW, 6, 15, 0)).toEqual(new Date(2026, 9, 24, 15, 0));
    expect(nextWeekday(NOW, 1, 9, 0)).toEqual(new Date(2026, 9, 26, 9, 0));
  });
  it("starts on the next nth weekday of a month", () => {
    // First Saturday of November 2026 is the 7th; of October it was the 3rd (past).
    expect(nextNthWeekday(NOW, 1, 6, 9, 0)).toEqual(new Date(2026, 10, 7, 9, 0));
    // Fourth Saturday of October is the 24th, but noon has passed, so next month (28 Nov).
    expect(nextNthWeekday(NOW, 4, 6, 9, 0)).toEqual(new Date(2026, 10, 28, 9, 0));
    expect(nextNthWeekday(NOW, 4, 6, 15, 0)).toEqual(new Date(2026, 9, 24, 15, 0));
  });
  it("parses times from a time input", () => {
    expect(parseTime("09:30")).toEqual({ hour: 9, minute: 30 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("")).toBeNull();
  });
});

describe("recurring events in .ics", () => {
  it("writes a weekly event with a floating start, RRULE, UID and alarm", () => {
    const e = weeklyCheckin(text, 6, { hour: 9, minute: 0 }, NOW);
    const out = buildIcs(e);
    expect(out).toContain("DTSTART:20261031T090000\r\n");
    expect(out).toContain("DTEND:20261031T091000\r\n");
    expect(out).not.toContain("TZID");
    expect(out).not.toMatch(/DTSTART[^:]*Z/);
    expect(out).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA\r\n");
    expect(out).toContain(`UID:${WEEKLY_UID}\r\n`);
    expect(out).toContain("DTSTAMP:20261024T");
    expect(out).toContain("SUMMARY:Weekly: 10-minute GrowSafe check-in\r\n");
    expect(out).toContain("BEGIN:VALARM\r\nACTION:DISPLAY\r\n");
    expect(out).toContain("TRIGGER:PT0M\r\nEND:VALARM\r\n");
  });
  it("keeps the RRULE weekday equal to the DTSTART weekday", () => {
    const e = weeklyCheckin(text, 3, { hour: 18, minute: 15 }, NOW);
    expect(e.start.getDay()).toBe(3);
    expect(buildIcs(e)).toContain("BYDAY=WE");
  });
  it("spreads rooms over the first four weeks and uses one UID per room", () => {
    const evs = ["a", "b", "c", "d", "e"].map((k, i) =>
      monthlyRoom(text, k, i, 6, { hour: 9, minute: 0 }, NOW),
    );
    expect(evs.map((e) => e.rrule)).toEqual([
      "FREQ=MONTHLY;BYDAY=1SA",
      "FREQ=MONTHLY;BYDAY=2SA",
      "FREQ=MONTHLY;BYDAY=3SA",
      "FREQ=MONTHLY;BYDAY=4SA",
      "FREQ=MONTHLY;BYDAY=1SA",
    ]);
    expect(new Set(evs.map((e) => e.uid)).size).toBe(5);
    for (const e of evs) expect(e.start.getDay()).toBe(6);
  });
  it("writes one VCALENDAR with several events, CRLF only", () => {
    const evs = [
      weeklyCheckin(text, 6, { hour: 9, minute: 0 }, NOW),
      monthlyRoom(text, "kitchen", 0, 6, { hour: 9, minute: 0 }, NOW),
    ];
    const out = buildIcsCalendar(evs);
    expect(out.match(/BEGIN:VCALENDAR/g)).toHaveLength(1);
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out.match(/END:VEVENT/g)).toHaveLength(2);
    expect(out).toContain("PRODID:-//GrowSafe//Reminders//EN");
    expect(out.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("escapes commas, semicolons and newlines in text but not in the RRULE", () => {
    const out = buildIcs({
      ...weeklyCheckin(text, 6, { hour: 9, minute: 0 }, NOW),
      title: "Re-check: kitchen; stairs, hall",
      description: "Line one\nLine two",
    });
    expect(unfold(out)).toContain("SUMMARY:Re-check: kitchen\\; stairs\\, hall");
    expect(unfold(out)).toContain("DESCRIPTION:Line one\\nLine two");
    expect(out).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA\r\n");
  });
  it("folds long lines at 75 octets and unfolds back to the same text", () => {
    const long = "Update your plan: " + "Ñandú ".repeat(30);
    const out = buildIcs({ ...weeklyCheckin(text, 6, { hour: 9, minute: 0 }, NOW), title: long });
    for (const l of out.split("\r\n"))
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(unfold(out)).toContain(`SUMMARY:${long.replace(/,/g, "\\,")}`);
  });
  it("cannot inject a property through the RRULE", () => {
    const out = buildIcs({
      ...weeklyCheckin(text, 6, { hour: 9, minute: 0 }, NOW),
      rrule: "FREQ=WEEKLY\r\nATTENDEE:mailto:x@example.com",
    });
    expect(out).not.toContain("\r\nATTENDEE:");
  });
  it("still writes the old single event with no RRULE or alarm", () => {
    const out = buildIcs({
      title: "One",
      description: "d",
      start: new Date(2026, 9, 17, 10),
      minutes: 30,
    });
    expect(out).not.toContain("RRULE");
    expect(out).not.toContain("VALARM");
    expect(out).toContain("PRODID:-//GrowSafe//Weekend plan//EN");
  });
});

describe("plan-update dates", () => {
  const mia = { id: "c1", nickname: "Mia", birth_month: 1, birth_year: 2026 };
  it("lists the next milestones after today, birthday taken as the 15th", () => {
    const d = upcomingPlanDates(mia, NOW, 3);
    // Born Jan 2026: 12 months = 15 Jan 2027, 24 = 15 Jan 2028, 36 = 15 Jan 2029 (3 and 6 months are past).
    expect(d.map((x) => x.months)).toEqual([12, 24, 36]);
    expect(d[0]!.date).toEqual(new Date(2027, 0, 15));
  });
  it("writes an all-day event with a date-only DTSTART and a 9:00 alarm", () => {
    const [p] = upcomingPlanDates(mia, NOW, 1);
    const out = buildIcs(
      planUpdate({ title: "Update your plan: Mia turns 1 year", description: "x" }, "c1", p!, NOW),
    );
    expect(out).toContain("DTSTART;VALUE=DATE:20270115\r\n");
    expect(out).toContain("DTEND;VALUE=DATE:20270116\r\n");
    expect(out).toContain("TRIGGER:PT540M\r\n");
    expect(out).not.toContain("RRULE");
  });
  it("returns nothing once every milestone is past", () => {
    expect(upcomingPlanDates({ ...mia, birth_year: 2015 }, NOW)).toEqual([]);
  });
});
