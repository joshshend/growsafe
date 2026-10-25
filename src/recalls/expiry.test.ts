import { describe, expect, it } from "vitest";
import { expiryStatus } from "./expiry";

const NOW = new Date(2026, 9, 24); // 24 Oct 2026

describe("expiryStatus", () => {
  it("returns null with no usable date", () => {
    expect(expiryStatus(undefined, NOW)).toBeNull();
    expect(expiryStatus("", NOW)).toBeNull();
    expect(expiryStatus("next year", NOW)).toBeNull();
    expect(expiryStatus("2026-02-31", NOW)).toBeNull();
  });
  it("is expired the day after, not on the day", () => {
    expect(expiryStatus("2026-10-23", NOW)).toEqual({ kind: "expired" });
    expect(expiryStatus("2026-10-24", NOW)).toEqual({ kind: "soon" });
  });
  it("counts whole months", () => {
    expect(expiryStatus("2026-11-23", NOW)).toEqual({ kind: "soon" });
    expect(expiryStatus("2026-11-24", NOW)).toEqual({ kind: "months", months: 1 });
    expect(expiryStatus("2027-12-24", NOW)).toEqual({ kind: "months", months: 14 });
    expect(expiryStatus("2027-12-23", NOW)).toEqual({ kind: "months", months: 13 });
  });
});
