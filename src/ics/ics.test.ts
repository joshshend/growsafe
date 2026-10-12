import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, fold, nextSaturdayMorning } from "./ics";

describe("ics", () => {
  it("writes one event with CRLF lines", () => {
    const out = buildIcs({
      title: "Safety session",
      description: "1. Anchor shelf, bookcase\n2. Outlet covers",
      start: new Date(2026, 9, 17, 10, 0),
      minutes: 90,
      now: new Date(Date.UTC(2026, 9, 12, 12, 0, 0)),
    });
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("DTSTART:20261017T100000");
    expect(out).toContain("DTEND:20261017T113000");
    expect(out).toContain("DTSTAMP:20261012T120000Z");
    expect(out).toContain("shelf\\, bookcase\\n2.");
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(out.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it("escapes and folds", () => {
    expect(escapeText("a;b,c\\d")).toBe("a\\;b\\,c\\\\d");
    const folded = fold("X:" + "é".repeat(80));
    for (const l of folded.split("\r\n"))
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe("X:" + "é".repeat(80));
  });
  it("picks the next Saturday morning", () => {
    expect(nextSaturdayMorning(new Date(2026, 9, 12, 9)).getDate()).toBe(17);
    expect(nextSaturdayMorning(new Date(2026, 9, 17, 8)).getDate()).toBe(17);
    expect(nextSaturdayMorning(new Date(2026, 9, 17, 11)).getDate()).toBe(24);
  });
});
