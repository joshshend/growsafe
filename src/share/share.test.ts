import { describe, expect, it } from "vitest";
import { deflateSync, strToU8 } from "fflate";
import type { Plan } from "../kb/schema";
import { decodePlan, encodePlan, isTooLarge, shareUrl } from "./codec";
import { exportPlanFile, importPlanFile } from "./file";
import { redact } from "./redact";

const toB64u = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const NOW = new Date(2026, 9, 20);

// The device plan may carry extra private fields; redact must drop them.
const plan = {
  children: [
    {
      id: "c1",
      nickname: "Mia",
      birth_month: 3,
      birth_year: 2025,
      fullName: "Mia Quillfeather Zorbonski",
      birthdate: "2025-03-07",
    },
  ],
  homes: [
    {
      id: "h1",
      name: "Home",
      rooms: ["kitchen", "nursery"],
      address: "4417 Marigold Lane, Austin TX",
    },
  ],
  tasks: [
    {
      id: "t1",
      hazard_id: "tv-furniture-tip-over",
      home_id: "h1",
      room: "nursery",
      childIds: ["c1"],
      status: "doing",
      owner: "Sam",
      due: "2026-11-01",
      notes: "call landlord about wall studs",
      photo: "data:image/png;base64,AAAA",
    },
  ],
  emergencyCards: { c1: { allergies: "penicillin", pediatrician: "Dr. Xylophone 555-0199" } },
} as unknown as Plan;

describe("redact", () => {
  const shared = redact(plan, NOW);
  it("keeps allowed fields and converts birth date to an age band", () => {
    expect(shared.v).toBe(1);
    expect(shared.children).toEqual([{ id: "c1", nickname: "Mia", ageBand: "12-24m" }]);
    expect(shared.tasks[0]).toMatchObject({ owner: "Sam", due: "2026-11-01", room: "nursery" });
  });
  it("never leaks private data, even after encode and decode", () => {
    const decoded = JSON.stringify(decodePlan(encodePlan(shared)));
    const raw = JSON.stringify(shared);
    for (const s of [
      "Quillfeather",
      "Zorbonski",
      "2025-03-07",
      "Marigold",
      "penicillin",
      "Xylophone",
      "landlord",
      "data:image",
      "birth_",
      "emergency",
    ]) {
      expect(decoded).not.toContain(s);
      expect(raw).not.toContain(s);
    }
    // the compressed output must not contain the secrets as plain text either
    const enc = encodePlan(shared);
    expect(enc).not.toContain("Quillfeather");
  });
});

describe("codec", () => {
  const shared = redact(plan, NOW);
  it("round-trips data string and full link", () => {
    expect(decodePlan(encodePlan(shared))).toEqual(shared);
    const url = shareUrl("https://growsafe.example/", shared);
    expect(url.startsWith("https://growsafe.example/#/import?d=")).toBe(true);
    expect(decodePlan(url)).toEqual(shared);
  });
  it("rejects garbage, tampering, empty input", () => {
    for (const bad of ["", "not base64 !!", "AAAA", "abc", encodePlan(shared).slice(0, 20)]) {
      expect(() => decodePlan(bad)).toThrow();
    }
    const enc = encodePlan(shared);
    const flipped = enc.slice(0, 10) + (enc[10] === "A" ? "B" : "A") + enc.slice(11);
    expect(() => decodePlan(flipped)).toThrow();
  });
  it("rejects unknown version and unknown keys", () => {
    const mk = (o: object) => toB64u(deflateSync(strToU8(JSON.stringify(o))));
    expect(() => decodePlan(mk({ ...shared, v: 2 }))).toThrow(/version/i);
    expect(() => decodePlan(mk({ ...shared, emergency: {} }))).toThrow();
    expect(() =>
      decodePlan(mk({ ...shared, tasks: [{ ...shared.tasks[0], status: "x" }] })),
    ).toThrow();
  });
  it("flags oversized links", () => {
    const big = {
      ...shared,
      tasks: Array.from({ length: 400 }, (_, i) => ({
        ...shared.tasks[0],
        id: `task-${i}-${Math.random().toString(36).slice(2)}`,
        owner: Math.random().toString(36).repeat(3),
      })),
    };
    expect(isTooLarge(encodePlan(big))).toBe(true);
    expect(isTooLarge(encodePlan(shared))).toBe(false);
  });
});

describe("file", () => {
  it("exports redacted and imports back", () => {
    const f = exportPlanFile(plan, NOW);
    expect(f.name.endsWith(".growsafe.json")).toBe(true);
    expect(f.text).not.toMatch(/Quillfeather|Marigold|penicillin|2025-03-07/);
    expect(importPlanFile(f.text)).toEqual(redact(plan, NOW));
  });
  it("rejects bad files", () => {
    expect(() => importPlanFile("nope")).toThrow();
    expect(() => importPlanFile('{"v":9}')).toThrow(/version/i);
  });
});
