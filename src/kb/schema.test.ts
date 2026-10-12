import { describe, expect, it } from "vitest";
import sample from "./data/tv-furniture-tip-over.json";
import { validateEntries } from "./validate";
import { ChildSchema, HazardEntrySchema, PlanSchema } from "./schema";

type Json = Record<string, unknown>;
const base = (): Json => structuredClone(sample) as Json;
const msgs = (data: unknown, extra: { file: string; data: unknown }[] = []) =>
  validateEntries([{ file: "x.json", data }, ...extra]).map((e) => e.message);

describe("kb validation", () => {
  it("accepts the sample entry", () => {
    expect(validateEntries([{ file: "tv.json", data: base() }])).toEqual([]);
  });

  it("rejects duplicate ids", () => {
    expect(msgs(base(), [{ file: "y.json", data: base() }]).join()).toMatch(/duplicate id/);
  });

  it("rejects non-https citation urls", () => {
    const d = base();
    (d.citations as Json[])[0].url = "http://example.com/a";
    expect(msgs(d).join()).toMatch(/not https/);
  });

  it("rejects missing accessed date", () => {
    const d = base();
    delete (d.citations as Json[])[0].accessed;
    expect(msgs(d).join()).toMatch(/accessed/);
  });

  it("rejects sourced entries without injury_evidence", () => {
    const d = base();
    d.evidence_status = "sourced";
    d.injury_evidence = [];
    expect(msgs(d).join()).toMatch(/injury_evidence/);
  });

  it("rejects the word safe but allows safety", () => {
    const d = base();
    d.why_it_matters = "This keeps the room safe.";
    expect(msgs(d).join()).toMatch(/"safe"/);
    d.why_it_matters = "This improves safety in the room.";
    expect(msgs(d)).toEqual([]);
  });

  it("rejects safe in fix text", () => {
    const d = base();
    (d.fix_steps as Json[])[0].text = "Make it safe.";
    expect(msgs(d).join()).toMatch(/fix_steps\[0\].*safe/);
  });

  it("rejects firearm and gun text", () => {
    for (const w of ["firearm", "gun"]) {
      const d = base();
      d.blind_spots = [`A ${w} cabinet`];
      expect(msgs(d).join()).toMatch(/firearm/);
    }
  });

  it("rejects dosing words in fix steps", () => {
    for (const w of ["Give 5 mg", "Use 10 ml", "A dose of it"]) {
      const d = base();
      (d.fix_steps as Json[])[0].text = w;
      expect(msgs(d).join()).toMatch(/dosing/);
    }
  });
});

describe("schemas", () => {
  it("HazardEntrySchema parses the sample", () => {
    expect(HazardEntrySchema.safeParse(base()).success).toBe(true);
  });
  it("Child has no exact birthdate", () => {
    expect(
      ChildSchema.safeParse({ id: "c1", nickname: "Sam", birth_month: 3, birth_year: 2025 })
        .success,
    ).toBe(true);
    expect(
      ChildSchema.safeParse({ id: "c1", nickname: "Sam", birth_month: 13, birth_year: 2025 })
        .success,
    ).toBe(false);
  });
  it("Plan parses", () => {
    const plan = {
      children: [{ id: "c1", nickname: "Sam", birth_month: 3, birth_year: 2025 }],
      homes: [{ id: "h1", name: "Home", rooms: ["kitchen"] }],
      tasks: [
        {
          id: "t1",
          hazard_id: "tv-furniture-tip-over",
          home_id: "h1",
          room: "kitchen",
          status: "todo",
        },
      ],
    };
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });
});
